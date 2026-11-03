/* =====================================================================
 * SIGAPKL - TKJ · core.js
 * API client (fetch text/plain → GAS), dedupe + epoch tulis, Batcher otomatis,
 * SWR localStorage, Perf, router, layout per peran, komponen bersama, grafik SVG.
 * ===================================================================== */
(function () {
  'use strict';
  const CFG = window.APP_CONFIG || {};
  const VERSI = CFG.VERSI || '1.0.0';

  /* ---------------- Penyimpanan lokal aman ---------------- */
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
    clearPrefix(p) { try { Object.keys(localStorage).forEach(k => { if (k.indexOf(p) === 0) localStorage.removeItem(k); }); } catch (e) {} }
  };
  const SS = { get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} } };

  /* ---------------- Sesi ---------------- */
  const Sesi = {
    token: '', me: null, peran: '',
    load() { const s = LS.get('sigapkl_sesi', null); if (s && s.token) { Sesi.token = s.token; Sesi.me = s.me; Sesi.peran = s.peran || (s.me && s.me.peran); } },
    save() { LS.set('sigapkl_sesi', { token: Sesi.token, me: Sesi.me, peran: Sesi.peran }); },
    set(token, me) { Sesi.token = token; Sesi.me = me; Sesi.peran = me.peran; Sesi.save(); },
    clear() { LS.del('sigapkl_sesi'); LS.clearPrefix('sigapkl_boot_'); Sesi.token = ''; Sesi.me = null; Sesi.peran = ''; S.data = null; }
  };

  /* ---------------- Pengukur kinerja (Perf.table() di console) ---------------- */
  const Perf = {
    log: [],
    add(o) { Perf.log.push(o); if (Perf.log.length > 300) Perf.log.shift(); },
    table() { console.table(Perf.log.map(x => ({ aksi: x.a, total_ms: x.t, server_ms: x.s, net_ms: x.t - (x.s || 0), cache: x.c ? '✓' : '' }))); },
    summary() { const g = {}; Perf.log.forEach(x => { (g[x.a] = g[x.a] || []).push(x.t); }); console.table(Object.keys(g).map(k => ({ aksi: k, n: g[k].length, rata_ms: Math.round(g[k].reduce((a, b) => a + b, 0) / g[k].length) }))); }
  };
  window.Perf = Perf;

  /* ---------------- API ---------------- */
  const READ = /^(boot|batch|log\.list|akun\.list|rahasia\.status|sistem\.status|notif\.(config|queue)|wa\.(audience|blastList|device)|crm\.(list|stats|detail|export)|de\.(templateList|pejabatList|dokumenList|antrean|unduh|verifikasi)|migrasi\.pindai|ejurnal\.pindai)$/;
  const urlSiap = () => !!window.__DEMO_API || (CFG.GAS_URL && !/GANTI|XXXX/.test(CFG.GAS_URL));
  let _inflight = {}, _epoch = 0, _aktif = 0;
  function bar(on) {
    const el = document.getElementById('loading-bar'); if (!el) return;
    _aktif += on ? 1 : -1; if (_aktif < 0) _aktif = 0;
    if (_aktif) { el.style.opacity = 1; el.style.width = '70%'; } else { el.style.width = '100%'; setTimeout(() => { if (!_aktif) { el.style.opacity = 0; el.style.width = '0'; } }, 250); }
  }
  async function apiRun(action, data, opt) {
    opt = opt || {};
    const body = { action, token: Sesi.token, peran: Sesi.peran, data: data || {} };
    const t0 = performance.now(); let res;
    if (!opt.silent) bar(true);
    try {
      for (let coba = 0; ; coba++) {
        try {
          if (window.__DEMO_API) res = await window.__DEMO_API(body);
          else {
            const r = await fetch(CFG.GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow' });
            res = await r.json();
          }
          break;
        } catch (e) {
          // antrean ulang otomatis hanya untuk BACA (aman diulang)
          if (READ.test(action) && coba < 2) { await new Promise(r => setTimeout(r, 700 * (coba + 1))); continue; }
          res = { success: false, message: 'Tidak dapat terhubung ke server. Periksa koneksi internet lalu coba lagi.', code: 'NET' };
          break;
        }
      }
    } finally { if (!opt.silent) bar(false); }
    Perf.add({ a: action, t: Math.round(performance.now() - t0), s: res && res.ms, c: res && res.cached });
    if (res && res.code === 'AUTH' && action !== 'auth.login') { Sesi.clear(); toast(res.message || 'Sesi berakhir.', 'warn'); App.go('#/login'); }
    else if (res && res.code === 'GANTI_SANDI') { Sesi.me.wajibGanti = true; Sesi.save(); App.go('#/ganti'); }
    return res || { success: false, message: 'Respons kosong.' };
  }
  /* Penggabung batch otomatis: baca di tik yang sama → 1 eksekusi server */
  const Batcher = {
    q: null,
    add(action, data) { return new Promise(res => { if (!this.q) { this.q = []; setTimeout(() => this.flush(), 0); } this.q.push({ action, data: data || {}, res }); }); },
    async flush() {
      const q = this.q; this.q = null;
      if (q.length === 1) { q[0].res(await apiRun(q[0].action, q[0].data)); return; }
      for (let i = 0; i < q.length; i += 10) {
        const part = q.slice(i, i + 10);
        const r = await apiRun('batch', { calls: part.map(c => ({ action: c.action, data: c.data })) });
        part.forEach((c, k) => c.res(r.success ? r.data[k] : r));
      }
    }
  };
  /** api(action, data, opt) — tidak pernah melempar error; selalu {success, data, message} */
  function api(action, data, opt) {
    if (!urlSiap()) return Promise.resolve({ success: false, message: 'Konfigurasi belum lengkap: isi GAS_URL di js/config.js.' });
    if (!READ.test(action) || action === 'batch' || (opt && opt.langsung)) { if (!READ.test(action)) _epoch++; return apiRun(action, data, opt); }
    const k = _epoch + '|' + action + '|' + Sesi.peran + '|' + JSON.stringify(data || {});
    if (_inflight[k]) return _inflight[k];
    const p = (opt && opt.silent) ? apiRun(action, data, opt) : Batcher.add(action, data);
    _inflight[k] = p; p.then(() => delete _inflight[k], () => delete _inflight[k]);
    return p;
  }
  function warmUp(scope) {
    if (!urlSiap() || window.__DEMO_API) return;
    const k = 'warm_' + scope, last = Number(SS.get(k) || 0);
    if (Date.now() - last < 240000) return; SS.set(k, String(Date.now()));
    try { fetch(CFG.GAS_URL + '?w=' + scope, { mode: 'no-cors' }); } catch (e) {}
  }

  /* ---------------- Store (SWR) ---------------- */
  const S = {
    data: null, ix: {}, ts: 0, q: '', hash: '',
    key() { return 'sigapkl_boot_' + (Sesi.me ? Sesi.me.id : '') + '_' + Sesi.peran; },
    fromCache() { const c = LS.get(S.key(), null); if (c && c.d) { S.set(c.d, c.ts, true); return true; } return false; },
    async load(opt) {
      opt = opt || {};
      const r = await api('boot', opt.fresh ? { _fresh: true } : {}, { silent: opt.silent });
      if (r.success) { const h = String(r.data.dibuat) + JSON.stringify(r.data).length; const berubah = h !== S.hash; S.set(r.data); S.hash = h; return { ok: true, berubah }; }
      if (!opt.silent) toast(r.message, 'bad');
      return { ok: false };
    },
    set(d, ts, dariCache) { S.data = d; S.ts = ts || Date.now(); if (!dariCache) LS.set(S.key(), { ts: S.ts, d }); S.index(); },
    index() {
      const d = S.data, ix = { siswa: {}, guru: {}, ins: {}, dudi: {}, pen: {}, nilai: {}, abs: {}, prg: {}, kunci: {}, jurnal: {}, pres: {}, akun: {} };
      d.siswa.forEach(x => (ix.siswa[x.NIS] = x)); d.guru.forEach(x => (ix.guru[x.GuruID] = x)); d.instruktur.forEach(x => (ix.ins[x.InstrukturID] = x)); d.dudi.forEach(x => (ix.dudi[x.DUDIID] = x));
      d.penempatan.forEach(x => (ix.pen[x.NIS] = ix.pen[x.NIS] || []).push(x)); Object.values(ix.pen).forEach(a => a.sort((p, q) => p.Periode - q.Periode));
      d.nilai.forEach(x => (ix.nilai[x.NIS + '|' + x.Periode + '|' + x.Jenis] = x));
      d.absensi.slice().sort((a, b) => a.TglMulai.localeCompare(b.TglMulai)).forEach(x => (ix.abs[x.NIS] = ix.abs[x.NIS] || []).push(x));
      d.peringatan.forEach(x => (ix.prg[x.NIS] = ix.prg[x.NIS] || []).push(x));
      d.kunci.forEach(x => (ix.kunci[x.NIS + '|' + x.Periode] = x.Status === 'TUTUP'));
      d.jurnal.forEach(x => (ix.jurnal[x.NIS + '|' + x.Periode] = x));
      d.presentasi.forEach(x => (ix.pres[x.NIS] = x));
      (d.akun || []).forEach(x => (ix.akun[x.RefID + '|' + x.Peran] = x));
      S.ix = ix;
    },
    set_(k) { return (S.data && S.data.pengaturan && S.data.pengaturan[k]) || ''; }
  };
  const P = k => S.set_(k);
  const periodeAktif = () => String(P('PERIODE_AKTIF') || '1');
  function penOf(nis, periode) { const a = S.ix.pen[nis] || []; if (periode) return a.find(p => String(p.Periode) === String(periode)) || null; return a.find(p => String(p.Periode) === periodeAktif()) || a[0] || null; }
  function bobot() { try { return JSON.parse(P('BOBOT_NILAI') || '{}'); } catch (e) { return {}; } }
  const JENIS = { OBS1: 'Observasi 1', OBS2: 'Observasi 2', PEMBIMBING: 'Penilaian Pembimbing', LAPORAN: 'Laporan (5 Kriteria)', PRESENTASI: 'Presentasi', AKHIR: 'Penilaian Akhir DUDI' };
  function predikat(n) { const kkm = Number(P('KKM') || 75); return !n ? '-' : n >= 90 ? 'A' : n >= 80 ? 'B' : n >= kkm ? 'C' : 'D'; }
  const predikatTeks = { A: 'Amat Baik', B: 'Baik', C: 'Cukup', D: 'Kurang', '-': 'Belum dinilai' };
  /** Rekap kehadiran & nilai satu siswa untuk satu periode */
  function rekap(nis, periode) {
    const pen = penOf(nis, periode), p = pen ? String(pen.Periode) : String(periode || periodeAktif());
    const abs = (S.ix.abs[nis] || []).filter(a => String(a.Periode) === p);
    const t = { H: 0, I: 0, S: 0, A: 0 }; abs.forEach(a => { t.H += +a.Hadir || 0; t.I += +a.Izin || 0; t.S += +a.Sakit || 0; t.A += +a.Alfa || 0; });
    const hari = t.H + t.I + t.S + t.A, nilai = {}, bb = bobot(); let tb = 0, tn = 0;
    Object.keys(JENIS).forEach(j => { const n = S.ix.nilai[nis + '|' + p + '|' + j]; if (n) { nilai[j] = +n.Total; let draf = false; try { draf = JSON.parse(n.Skor).draf; } catch (e) {} if (draf) nilai[j + '_draf'] = true; if (bb[j]) { tb += +bb[j]; tn += +bb[j] * +n.Total; } } });
    const akhir = tb ? Math.round(tn / tb * 100) / 100 : 0;
    return { pen, periode: p, abs, t, hari, persen: hari ? Math.round(t.H / hari * 1000) / 10 : 0, nilai, akhir, predikat: predikat(akhir),
      lengkap: Object.keys(JENIS).filter(j => nilai[j] !== undefined).length, kunci: !!S.ix.kunci[nis + '|' + p],
      prg: (S.ix.prg[nis] || []).filter(x => String(x.Periode) === p && x.Status !== 'Dicabut') };
  }
  function instrumen(jenis, pekerjaan) {
    const all = S.data.instrumen.filter(i => i.Jenis === jenis);
    if (jenis !== 'OBS1' && jenis !== 'OBS2') return all.sort((a, b) => a.No - b.No);
    let r = all.filter(i => (i.PekerjaanSpesifik || '').toLowerCase() === String(pekerjaan || '').toLowerCase());
    if (!r.length) r = all.filter(i => (i.PekerjaanSpesifik || '').toLowerCase() === 'umum');
    return r.sort((a, b) => a.No - b.No);
  }

  /* ---------------- Helper tampilan ---------------- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const BLNL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const tglObj = s => { if (!s) return null; const d = new Date(String(s).length === 10 ? s + 'T00:00:00' : s); return isNaN(d) ? null : d; };
  const fmtTgl = s => { const d = tglObj(s); return d ? d.getDate() + ' ' + BLN[d.getMonth()] + ' ' + d.getFullYear() : (s || '-'); };
  const fmtTglL = s => { const d = tglObj(s); return d ? d.getDate() + ' ' + BLNL[d.getMonth()] + ' ' + d.getFullYear() : (s || '-'); };
  const fmtWaktu = s => { const d = tglObj(s); return d ? fmtTgl(s) + ' · ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') : '-'; };
  const isoTgl = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const tambahHari = (s, n) => { const d = tglObj(s); d.setDate(d.getDate() + n); return isoTgl(d); };
  const hariIni = () => isoTgl(new Date());
  const inisial = n => String(n || '?').replace(/^(Bpk\.|Ibu|Ir\.|Dr\.)\s*/i, '').split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
  const driveId = u => (String(u || '').match(/[-\w]{25,}/) || [])[0];
  const driveImg = (u, sz) => { const id = driveId(u); return id ? 'https://drive.google.com/thumbnail?id=' + id + '&sz=w' + (sz || 400) : ''; };
  const avCls = s => 'av-c' + ((String(s || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 4) + 1);
  function av(nama, foto, cls) {
    const img = foto ? driveImg(foto, 120) : '';
    return '<span class="avatar ' + (cls || 'av-sm') + ' ' + (img ? '' : avCls(nama)) + '">' + (img ? '<img src="' + esc(img) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">' : '') + esc(inisial(nama)) + '</span>';
  }
  const ic = (n, cls) => '<span class="ms ' + (cls || '') + '">' + n + '</span>';
  function pill(teks, jenis, dot) { return '<span class="pill ' + (jenis || 'mute') + (dot ? ' dot' : '') + '">' + esc(teks) + '</span>'; }
  function pillStatus(s) {
    const m = { 'Belum ditangani': 'bad', 'Sudah ditangani': 'ok', Dicabut: 'mute', Baru: 'bad', Dibaca: 'warn', Dibalas: 'ok', Aktif: 'ok', Nonaktif: 'mute', Selesai: 'ok', Terjadwal: 'info', Batal: 'mute',
      TERBIT: 'ok', DRAF: 'mute', MENUNGGU_TTD: 'warn', DITARIK: 'bad', Terkirim: 'ok', Antri: 'warn', Gagal: 'bad', Berjalan: 'info', Dihentikan: 'mute', TUTUP: 'bad', BUKA: 'ok' };
    return pill(String(s || '-').replace('_', ' '), m[s] || 'mute', true);
  }
  const nmSiswa = n => (S.ix.siswa[n] || {}).Nama || n;
  const nmGuru = i => (S.ix.guru[i] || {}).Nama || '-';
  const nmIns = i => (S.ix.ins[i] || {}).Nama || '-';
  const nmDudi = i => (S.ix.dudi[i] || {}).Nama || '-';
  const num = (v, d) => (v === undefined || v === null || v === '' ? (d === undefined ? '-' : d) : (Math.round(Number(v) * 100) / 100).toString().replace('.', ','));
  function cari(row, q) { if (!q) return true; q = q.toLowerCase(); return Object.values(row).some(v => String(v == null ? '' : v).toLowerCase().indexOf(q) > -1); }

  /* ---------------- Toast / modal / konfirmasi ---------------- */
  function toast(msg, jenis, ms) {
    const box = document.getElementById('toasts'); if (!box || !msg) return;
    const el = document.createElement('div'); el.className = 'toast ' + (jenis || 'ok');
    el.innerHTML = ic(jenis === 'bad' ? 'error' : jenis === 'warn' ? 'warning' : 'check_circle', 'fill') + '<div>' + esc(msg) + '</div>';
    box.appendChild(el); setTimeout(() => { el.style.opacity = 0; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, ms || (jenis === 'bad' ? 6000 : 3500));
  }
  function modal(o) {
    const bg = document.createElement('div'); bg.className = 'modal-bg';
    bg.innerHTML = '<div class="modal ' + (o.size || '') + '" role="dialog" aria-modal="true"><div class="modal-h">' + (o.icon ? '<span class="ic ' + (o.iconCls || 'teal') + '">' + ic(o.icon) + '</span>' : '') +
      '<h3>' + esc(o.title || '') + '</h3><button class="icon-btn" data-x aria-label="Tutup">' + ic('close') + '</button></div><div class="modal-b">' + (o.body || '') + '</div>' + (o.foot !== false ? '<div class="modal-f">' + (o.foot || '<button class="btn ghost" data-x>Tutup</button>') + '</div>' : '') + '</div>';
    const close = () => { bg.remove(); document.removeEventListener('keydown', onKey); if (o.onClose) o.onClose(); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    bg.addEventListener('click', e => { if (e.target === bg || e.target.closest('[data-x]')) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(bg);
    const el = bg.querySelector('.modal');
    if (o.onOpen) o.onOpen(el, close);
    const f = el.querySelector('input:not([type=hidden]),select,textarea'); if (f && !o.noFocus) setTimeout(() => f.focus(), 50);
    return { el, close };
  }
  function konfirmasi(pesan, o) {
    o = o || {};
    return new Promise(res => {
      let jawab = false;
      const m = modal({ title: o.title || 'Konfirmasi', icon: o.danger ? 'warning' : 'help', iconCls: o.danger ? 'rose' : 'teal', size: 'sm', body: '<p style="margin:0">' + pesan + '</p>',
        foot: '<button class="btn ghost" data-x>Batal</button><button class="btn ' + (o.danger ? 'danger' : '') + '" data-ok>' + esc(o.ok || 'Ya, lanjutkan') + '</button>',
        onClose: () => res(jawab) });
      m.el.querySelector('[data-ok]').onclick = () => { jawab = true; m.close(); };
    });
  }
  async function busy(btn, fn) {
    if (!btn) return fn();
    if (btn.disabled) return;
    const html = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin' + (btn.classList.contains('ghost') || btn.classList.contains('sec') ? ' dark' : '') + '"></span> Memproses…';
    try { return await fn(); } finally { if (document.body.contains(btn)) { btn.disabled = false; btn.innerHTML = html; } }
  }
  /** Jalankan aksi tulis → toast → muat ulang data → render ulang */
  async function simpan(btn, action, data, o) {
    o = o || {};
    return busy(btn, async () => {
      const r = await api(action, data);
      if (!r.success) { toast(r.message, 'bad'); return r; }
      if (!o.diam) toast(r.message || 'Tersimpan.', 'ok');
      if (o.tutup) o.tutup();
      if (o.reload !== false) { await S.load({ silent: true }); App.dirty = false; App.render(); }
      return r;
    });
  }

  /* ---------------- Builder form ---------------- */
  function fld(f) {
    const id = 'f_' + f.name + '_' + Math.random().toString(36).slice(2, 6), v = f.value == null ? '' : f.value;
    let inp;
    if (f.type === 'select') inp = '<select class="input" id="' + id + '" name="' + f.name + '"' + (f.req ? ' required' : '') + '>' + (f.kosong !== false ? '<option value="">' + esc(f.ph || '— Pilih —') + '</option>' : '') +
      (f.options || []).map(o => { const ov = typeof o === 'object' ? o.v : o, ol = typeof o === 'object' ? o.l : o; return '<option value="' + esc(ov) + '"' + (String(ov) === String(v) ? ' selected' : '') + '>' + esc(ol) + '</option>'; }).join('') + '</select>';
    else if (f.type === 'textarea') inp = '<textarea class="input" id="' + id + '" name="' + f.name + '" placeholder="' + esc(f.ph || '') + '"' + (f.req ? ' required' : '') + ' rows="' + (f.rows || 3) + '">' + esc(v) + '</textarea>';
    else inp = '<input class="input" id="' + id + '" name="' + f.name + '" type="' + (f.type || 'text') + '" value="' + esc(v) + '" placeholder="' + esc(f.ph || '') + '"' + (f.req ? ' required' : '') + (f.min !== undefined ? ' min="' + f.min + '"' : '') + (f.max !== undefined ? ' max="' + f.max + '"' : '') + (f.attr || '') + '>';
    return '<div class="field' + (f.full ? ' full' : '') + '"><label for="' + id + '">' + esc(f.label) + (f.req ? ' <span class="req">*</span>' : '') + '</label>' + inp + (f.help ? '<div class="help">' + f.help + '</div>' : '') + '</div>';
  }
  function bacaForm(form) {
    const o = {}; new FormData(form).forEach((v, k) => { if (o[k] !== undefined) o[k] = [].concat(o[k], v); else o[k] = typeof v === 'string' ? v.trim() : v; });
    form.querySelectorAll('input[type=checkbox][name]').forEach(c => { if (!c.closest('[data-multi]')) o[c.name] = c.checked; });
    return o;
  }
  /** Modal form standar: fields → submit ke action */
  function formModal(o) {
    const m = modal({ title: o.title, icon: o.icon || 'edit_note', size: o.size || '', body: '<form id="fm" novalidate>' + (o.intro || '') + '<div class="form-grid">' + o.fields.map(fld).join('') + '</div>' + (o.extra || '') + '</form>',
      foot: '<button class="btn ghost" data-x>Batal</button><button class="btn" data-ok>' + ic('save') + esc(o.ok || 'Simpan') + '</button>', onOpen: o.onOpen });
    const form = m.el.querySelector('#fm'), btn = m.el.querySelector('[data-ok]');
    const kirim = async e => {
      if (e) e.preventDefault();
      const kosong = [...form.querySelectorAll('[required]')].find(x => !String(x.value).trim());
      if (kosong) { kosong.focus(); toast('Lengkapi kolom wajib: ' + (kosong.closest('.field').querySelector('label').textContent.replace('*', '').trim()), 'warn'); return; }
      let data = bacaForm(form); if (o.olah) data = o.olah(data, form); if (!data) return;
      await simpan(btn, o.action, data, { tutup: m.close, reload: o.reload, diam: o.diam }).then(r => { if (r && r.success && o.sesudah) o.sesudah(r); });
    };
    btn.onclick = kirim; form.onsubmit = kirim;
    return m;
  }

  /* ---------------- Grafik SVG ---------------- */
  function barChart(o) {
    const W = o.w || 640, H = o.h || 220, pad = { l: 42, r: 10, t: 12, b: 28 }, labels = o.labels || [], ser = o.series || [];
    const max = o.max || Math.max(1, ...ser.flatMap(s => s.values.map(v => +v || 0))), n = labels.length || 1;
    const gw = (W - pad.l - pad.r) / n, bw = Math.min(18, (gw * 0.7) / Math.max(ser.length, 1)), y = v => pad.t + (H - pad.t - pad.b) * (1 - (v || 0) / max);
    let s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.label || 'grafik') + '">';
    for (let i = 0; i <= 4; i++) { const v = max * i / 4, yy = y(v); s += '<line x1="' + pad.l + '" x2="' + (W - pad.r) + '" y1="' + yy + '" y2="' + yy + '" stroke="#E2E8F0" stroke-dasharray="' + (i ? '3 4' : '0') + '"/><text x="' + (pad.l - 6) + '" y="' + (yy + 4) + '" text-anchor="end">' + Math.round(v) + (o.unit || '') + '</text>'; }
    labels.forEach((l, i) => {
      const x0 = pad.l + gw * i + (gw - bw * ser.length - (ser.length - 1) * 3) / 2;
      ser.forEach((se, k) => { const v = +se.values[i] || 0, yy = y(v), h = Math.max(0, H - pad.b - yy); s += '<rect x="' + (x0 + k * (bw + 3)) + '" y="' + yy + '" width="' + bw + '" height="' + h + '" rx="' + Math.min(6, bw / 2) + '" fill="' + (typeof se.color === 'function' ? se.color(v, i) : se.color) + '"><title>' + esc(l + ' · ' + se.name + ': ' + num(v) + (o.unit || '')) + '</title></rect>'; });
      s += '<text x="' + (pad.l + gw * i + gw / 2) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(l) + '</text>';
    });
    s += '</svg>';
    if (ser.length > 1 || o.legend) s += '<div class="legend mt-s">' + ser.map(se => '<span><i style="background:' + (typeof se.color === 'function' ? se.legendColor : se.color) + '"></i>' + esc(se.name) + '</span>').join('') + '</div>';
    return s;
  }
  function donut(o) {
    const seg = o.segments.filter(x => x.value > 0), tot = o.total || seg.reduce((a, b) => a + b.value, 0) || 1, R = 54, C = 2 * Math.PI * R;
    let off = 0, arcs = '';
    seg.forEach(x => { const len = C * x.value / tot; arcs += '<circle r="' + R + '" cx="70" cy="70" fill="none" stroke="' + x.color + '" stroke-width="16" stroke-dasharray="' + len + ' ' + (C - len) + '" stroke-dashoffset="' + (-off) + '" stroke-linecap="butt"><title>' + esc(x.label + ': ' + x.value) + '</title></circle>'; off += len; });
    return '<div class="donut-wrap"><svg viewBox="0 0 140 140" width="' + (o.size || 150) + '" height="' + (o.size || 150) + '" style="transform:rotate(-90deg);flex:none"><circle r="' + R + '" cx="70" cy="70" fill="none" stroke="' + Tema.c('canvas-2') + '" stroke-width="16"/>' + arcs +
      '<g style="transform:rotate(90deg);transform-origin:70px 70px"><text x="70" y="68" text-anchor="middle" style="font-size:24px;font-weight:800;fill:#0F172A;font-family:var(--font)">' + esc(o.center || '') + '</text><text x="70" y="88" text-anchor="middle" style="font-size:10px;fill:#475569;font-family:var(--font)">' + esc(o.sub || '') + '</text></g></svg>' +
      '<div class="legend-v">' + o.segments.map(x => '<div><i style="background:' + x.color + '"></i>' + esc(x.label) + '<b>' + esc(x.teks != null ? x.teks : x.value) + '</b></div>').join('') + '</div></div>';
  }

  /* ---------------- Pustaka eksternal (dimuat saat perlu) ---------------- */
  const _lib = {};
  function muatSkrip(url, cek) {
    if (cek()) return Promise.resolve();
    if (_lib[url]) return _lib[url];
    _lib[url] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = url; s.onload = () => res(); s.onerror = () => { delete _lib[url]; rej(new Error('Gagal memuat pustaka')); }; document.head.appendChild(s); });
    return _lib[url];
  }
  const muatXlsx = () => muatSkrip('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', () => !!window.XLSX);
  const muatQr = () => muatSkrip('https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js', () => !!window.qrcode);
  async function eksporXlsx(sheets, nama) {
    try { await muatXlsx(); } catch (e) { toast('Pustaka Excel gagal dimuat. Periksa koneksi.', 'bad'); return; }
    const wb = XLSX.utils.book_new();
    Object.keys(sheets).forEach(n => { const ws = XLSX.utils.json_to_sheet(sheets[n].length ? sheets[n] : [{ Info: 'Tidak ada data' }]); XLSX.utils.book_append_sheet(wb, ws, n.slice(0, 31)); });
    XLSX.writeFile(wb, nama + '.xlsx');
    toast('Berkas Excel diunduh.', 'ok');
  }
  async function bacaBerkasTabel(file) {
    await muatXlsx(); const buf = await file.arrayBuffer(), wb = XLSX.read(buf, { type: 'array' });
    return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: false });
  }
  async function qrDataUrl(teks, cell) {
    try { await muatQr(); const q = window.qrcode(0, 'M'); q.addData(teks); q.make(); return q.createDataURL(cell || 4, 2); } catch (e) { return ''; }
  }
  async function isiQr(root) {
    const els = (root || document).querySelectorAll('[data-qr]:not([data-qr-ok])');
    for (const el of els) { const u = await qrDataUrl(el.dataset.qr, 4); if (u) { el.innerHTML = '<img alt="QR" src="' + u + '">'; el.dataset.qrOk = 1; } }
  }
  /** Cetak HTML di iframe tersembunyi (Simpan sebagai PDF dari dialog cetak) */
  function cetak(html, judul) {
    const ifr = document.createElement('iframe'); ifr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'; document.body.appendChild(ifr);
    const base = location.href.replace(/#.*$/, '').replace(/[^/]*$/, '');
    ifr.contentDocument.open();
    ifr.contentDocument.write('<!doctype html><html><head><meta charset="utf-8"><title>' + esc(judul || 'SIGAPKL') + '</title><base href="' + base + '"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,400..600,0..1,0&display=block"><link rel="stylesheet" href="css/style.css?v=' + VERSI + '"><style>body{background:#fff;padding:8mm}@page{size:A4;margin:8mm}</style></head><body>' + html + '</body></html>');
    ifr.contentDocument.close();
    const go = () => { setTimeout(() => { try { ifr.contentWindow.focus(); ifr.contentWindow.print(); } catch (e) {} setTimeout(() => ifr.remove(), 2000); }, 700); };
    if (ifr.contentDocument.readyState === 'complete') go(); else ifr.onload = go;
  }

  /* ---------------- Komponen bersama ---------------- */
  const K = {};
  /** Kartu PKL (ID card) satu siswa */
  K.kartu = function (nis) {
    const s = S.ix.siswa[nis] || {}, pen = penOf(nis) || {}, logo = driveImg(P('LOGO_URL'), 120), foto = driveImg(s.FotoURL, 300);
    const kode = 'SIGAPKL-' + nis;
    return '<div class="idcard"><div class="ih">' + (logo ? '<img src="' + esc(logo) + '" alt="" referrerpolicy="no-referrer">' : '<span class="lg">' + ic('school', 'fill') + '</span>') +
      '<div><div class="s1">Kartu Peserta PKL · ' + esc(P('KOMPETENSI') || 'TKJ') + '</div><div class="s2">' + esc(P('NAMA_SEKOLAH') || 'SMK') + '</div></div><span class="yr">T.A. ' + esc(P('TAHUN_AJARAN')) + '</span></div>' +
      '<div class="ib"><div class="photo">' + (foto ? '<img src="' + esc(foto) + '" alt="Foto" referrerpolicy="no-referrer" onerror="this.remove()">' : '') + esc(inisial(s.Nama)) + '</div><div class="grow">' +
      '<div class="nm">' + esc(s.Nama || nis) + '</div><div class="kl">' + esc(s.Kelas || '') + ' · NIS ' + esc(nis) + '</div><table>' +
      '<tr><td>Mitra DUDI</td><td><b>' + esc(nmDudi(pen.DUDIID)) + '</b></td></tr><tr><td>Pekerjaan</td><td>' + esc(pen.PekerjaanSpesifik || '-') + '</td></tr>' +
      '<tr><td>Periode</td><td>' + (pen.TglMulai ? esc(fmtTgl(pen.TglMulai) + ' – ' + fmtTgl(pen.TglSelesai)) : '-') + '</td></tr><tr><td>Guru Pembimbing</td><td>' + esc(nmGuru(pen.GuruID)) + '</td></tr>' +
      '<tr><td>Instruktur</td><td>' + esc(nmIns(pen.InstrukturID)) + '</td></tr></table></div></div>' +
      '<div class="if"><div class="qr" data-qr="' + esc(kode) + '"></div><div class="xs"><b style="color:var(--teal-700)">' + esc(kode) + '</b><br><span class="muted">Kartu identitas resmi peserta PKL</span></div>' +
      '<div class="sig">Mengetahui, Koordinator PKL<br><b>' + esc(P('KOORDINATOR_NAMA') || '........................') + '</b>' + (P('KOORDINATOR_NIP') ? '<br>NIP. ' + esc(P('KOORDINATOR_NIP')) : '') + '</div></div></div>';
  };
  /** Tabel log absensi (baca) */
  K.tabelAbsensi = function (nis, periode, opsi) {
    const rk = rekap(nis, periode); opsi = opsi || {};
    if (!rk.abs.length) return '<div class="empty">' + ic('event_busy') + 'Belum ada data absensi untuk periode ini.</div>';
    const rows = rk.abs.slice().reverse().map(a => '<tr class="' + (+a.Alfa ? 'bad-row' : '') + '"><td><b>Minggu ' + esc(a.MingguKe) + '</b></td><td>' + esc(fmtTgl(a.TglMulai)) + ' – ' + esc(fmtTgl(a.TglSelesai)) + '</td>' +
      '<td class="mono">' + esc(a.Harian) + '</td><td class="num">' + esc(a.Hadir) + '</td><td class="num">' + esc(a.Izin) + '</td><td class="num">' + esc(a.Sakit) + '</td><td class="num">' + (+a.Alfa ? pill(a.Alfa, 'solid-bad') : '0') + '</td>' +
      '<td class="small">' + esc(a.Catatan || '-') + '<div class="xs muted">' + esc(a.DiinputOleh || '') + '</div></td></tr>').join('');
    return '<div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Minggu</th><th>Rentang</th><th>Harian</th><th class="num">H</th><th class="num">I</th><th class="num">S</th><th class="num">A</th><th>Catatan</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  };
  K.grafikMingguan = function (nis, periode) {
    const rk = rekap(nis, periode);
    if (!rk.abs.length) return '<div class="empty">' + ic('bar_chart') + 'Grafik muncul setelah absensi diisi.</div>';
    return barChart({ label: 'Kehadiran per minggu', labels: rk.abs.map(a => 'M' + a.MingguKe), max: 100, unit: '%', legend: true,
      series: [{ name: 'Hadir penuh · biru muda = izin/sakit · merah = ada Alfa', legendColor: Tema.c(), color: (v, i) => (+rk.abs[i].Alfa ? '#F43F5E' : (+rk.abs[i].Izin || +rk.abs[i].Sakit) ? Tema.c('teal-200') : Tema.c()),
        values: rk.abs.map(a => { const h = (+a.Hadir) + (+a.Izin) + (+a.Sakit) + (+a.Alfa); return h ? Math.round(a.Hadir / h * 100) : 0; }) }] });
  };
  /** Ringkasan nilai satu siswa (kartu per jenis) */
  K.kartuNilai = function (nis, periode) {
    const rk = rekap(nis, periode), bb = bobot();
    return '<div class="grid g3">' + Object.keys(JENIS).map(j => {
      const n = rk.nilai[j], ada = n !== undefined, draf = rk.nilai[j + '_draf'];
      const oleh = (S.ix.nilai[nis + '|' + rk.periode + '|' + j] || {}).DinilaiOleh;
      return '<div class="card tight"><div class="row between"><span class="stat-lbl">' + esc(JENIS[j]) + '</span>' + (ada ? pill(predikat(n) + ' · ' + num(n), draf ? 'warn' : 'ok') : pill('Belum', 'mute')) + '</div>' +
        '<div class="stat-val mt-s" style="font-size:26px">' + (ada ? num(n) : '–') + '<small> /100</small></div><div class="xs muted mt-s">Bobot ' + (bb[j] || 0) + '% ' + (oleh ? '· ' + esc(oleh) : '') + (draf ? ' · draf' : '') + '</div></div>';
    }).join('') + '</div>';
  };
  /** Formulir penilaian berbasis instrumen (dipakai Guru & Instruktur) */
  K.formNilai = function (nis, periode, jenis, bolehUbah) {
    const pen = penOf(nis, periode) || {}, items = instrumen(jenis, pen.PekerjaanSpesifik), ada = S.ix.nilai[nis + '|' + pen.Periode + '|' + jenis];
    let skor = {}, cat = {}, rek = '', draf = false; if (ada) { try { const o = JSON.parse(ada.Skor); skor = o.skor || {}; cat = o.catatan || {}; rek = o.rekomendasi || ''; draf = o.draf; } catch (e) {} }
    const kunci = rekap(nis, pen.Periode).kunci, ro = !bolehUbah || kunci;
    if (!items.length) return '<div class="alert warn">' + ic('info') + '<div><h4>Instrumen belum diatur</h4><p>Admin perlu mengatur instrumen ' + esc(JENIS[jenis]) + (pen.PekerjaanSpesifik ? ' untuk pekerjaan "' + esc(pen.PekerjaanSpesifik) + '"' : '') + '.</p></div></div>';
    const total = () => { let tb = 0, tn = 0; items.forEach(i => { tb += +i.Bobot || 1; tn += (+i.Bobot || 1) * (+skor[i.InstrumenID] || 0); }); return tb ? Math.round(tn / tb * 100) / 100 : 0; };
    const kat = v => v >= 90 ? 'Amat Baik' : v >= 80 ? 'Baik' : v >= 70 ? 'Cukup' : v > 0 ? 'Kurang' : '—';
    const aspek = items.map((i, k) => {
      const v = skor[i.InstrumenID] === undefined ? '' : skor[i.InstrumenID];
      return '<div class="aspek"><div class="aspek-h"><span class="aspek-no">' + String(k + 1).padStart(2, '0') + '</span><div class="grow"><div class="b">' + esc(i.Aspek) + '</div><div class="small muted">' + esc(i.Deskripsi || '') + '</div>' +
        '<div class="mt-s">' + pill('Bobot ' + i.Bobot + '%', 'info') + ' <span class="pill ok" data-kat="' + i.InstrumenID + '">' + kat(+v) + '</span></div></div>' +
        '<input class="input score-in" type="number" min="0" max="100" step="1" name="s_' + i.InstrumenID + '" value="' + esc(v) + '" data-inp="skor" data-id="' + i.InstrumenID + '"' + (ro ? ' disabled' : '') + ' aria-label="Skor ' + esc(i.Aspek) + '"></div>' +
        '<input type="range" min="0" max="100" value="' + (v === '' ? 0 : v) + '" data-inp="skor" data-id="' + i.InstrumenID + '"' + (ro ? ' disabled' : '') + ' aria-hidden="true" tabindex="-1" class="mt">' +
        '<div class="scale"><span>Kurang (&lt;70)</span><span>Cukup (70–79)</span><span>Baik (80–89)</span><span>Amat Baik (90–100)</span></div>' +
        '<textarea class="input mt-s" rows="2" name="c_' + i.InstrumenID + '" placeholder="Catatan unjuk kerja (opsional)"' + (ro ? ' disabled' : '') + '>' + esc(cat[i.InstrumenID] || '') + '</textarea></div>';
    }).join('');
    const t = total();
    const side = '<div class="card sticky-side"><div class="row between"><span class="stat-lbl">Kalkulasi Terbobot</span>' + pill('Skala 0–100', 'ok') + '</div>' +
      '<div class="row mt" style="align-items:flex-end"><div class="big-score" data-total>' + num(t, 0) + '</div><div class="muted b">/100</div></div><div class="mt-s" data-pred>' + pill(predikat(t) + ' · ' + predikatTeks[predikat(t)], t >= Number(P('KKM') || 75) ? 'ok' : 'warn') + '</div>' +
      '<div class="small muted mt">KKM ' + esc(P('KKM') || 75) + ' · ' + items.length + ' indikator</div>' +
      (jenis === 'AKHIR' ? '<div class="field mt"><label>Rekomendasi DUDI</label><select class="input" name="Rekomendasi"' + (ro ? ' disabled' : '') + '>' + ['', 'Sangat layak direkrut', 'Layak dengan pembinaan lanjutan', 'Belum memenuhi kualifikasi'].map(o => '<option' + (o === rek ? ' selected' : '') + '>' + o + '</option>').join('') + '</select></div>' : '') +
      '<div class="field mt"><label>Catatan umum</label><textarea class="input" name="Catatan" rows="3"' + (ro ? ' disabled' : '') + '>' + esc(ada ? ada.Catatan : '') + '</textarea></div>' +
      (ro ? (kunci ? '<div class="locked-banner">' + ic('lock') + 'Nilai telah ditutup Admin — tidak dapat diubah.</div>' : '') :
        '<button class="btn block lg" data-act="simpanNilai" data-draf="0">' + ic('verified') + 'Simpan & Sahkan</button><button class="btn sec block mt-s" data-act="simpanNilai" data-draf="1">' + ic('save') + 'Simpan Draf</button>') +
      (ada ? '<div class="xs muted mt">Terakhir: ' + esc(fmtWaktu(ada.DiperbaruiPada)) + ' oleh ' + esc(ada.DinilaiOleh) + (draf ? ' · <b>draf</b>' : '') + '</div>' : '') + '</div>';
    return '<form data-nilai data-nis="' + esc(nis) + '" data-periode="' + esc(pen.Periode) + '" data-jenis="' + jenis + '" onsubmit="return false"><div class="with-panel"><div>' + aspek + '</div><div>' + side + '</div></div></form>';
  };
  function hitungUlangNilai(form) {
    const items = [...form.querySelectorAll('input.score-in')]; let tb = 0, tn = 0;
    items.forEach(el => { const i = S.data.instrumen.find(x => x.InstrumenID === el.dataset.id) || {}; const b = +i.Bobot || 1; tb += b; tn += b * (+el.value || 0); });
    const t = tb ? Math.round(tn / tb * 100) / 100 : 0;
    form.querySelector('[data-total]').textContent = num(t, 0);
    form.querySelector('[data-pred]').innerHTML = pill(predikat(t) + ' · ' + predikatTeks[predikat(t)], t >= Number(P('KKM') || 75) ? 'ok' : 'warn');
  }

  /* ---------------- Aktivitas & polling adaptif ---------------- */
  const Activity = {
    at: Date.now(), last: {},
    init() { ['pointerdown', 'keydown', 'wheel', 'touchstart', 'focus'].forEach(ev => addEventListener(ev, () => (Activity.at = Date.now()), { passive: true })); },
    idle() { return Date.now() - Activity.at > 120000; },
    due(key, activeMs, idleMs) {
      if (document.visibilityState !== 'visible') return false;
      if (Date.now() - (Activity.last[key] || 0) < (Activity.idle() ? idleMs : activeMs) - 500) return false;
      Activity.last[key] = Date.now(); return true;
    }
  };

  /* ---------------- Router & layout ---------------- */
  const Pages = {}, Act = {}, Forms = {}, Inp = {};
  const MENU = {
    SISWA: [
      { sec: 'Navigasi Siswa' }, { id: 'dashboard', t: 'Dashboard', i: 'space_dashboard' }, { id: 'penempatan', t: 'Penempatan & Jadwal', i: 'calendar_month' },
      { id: 'jurnal', t: 'Jurnal & Foto', i: 'photo_camera' }, { id: 'nilai', t: 'Nilai & Kehadiran', i: 'workspace_premium', badge: () => rekapSaya().prg.length, warna: 'rose' },
      { id: 'kartu', t: 'Kartu PKL', i: 'badge' }, { sec: 'Bantuan' }, { id: 'dokumen', t: 'Dokumen Saya', i: 'description' }],
    GURU: [
      { sec: 'Panel Guru Pembimbing' }, { id: 'dashboard', t: 'Dashboard', i: 'space_dashboard' }, { id: 'siswa', t: 'Siswa Bimbingan', i: 'groups' },
      { id: 'bimbingan', t: 'Jadwal Bimbingan', i: 'event_note' }, { id: 'penilaian', t: 'Penilaian', i: 'grading' },
      { sec: 'Supervisi & Bantuan' }, { id: 'peringatan', t: 'Peringatan Kehadiran', i: 'notification_important', badge: () => S.data.peringatan.filter(p => p.Status === 'Belum ditangani').length, warna: 'amber' },
      { id: 'pesan', t: 'Pesan Darurat', i: 'emergency', badge: () => S.data.pesan.filter(p => p.Status === 'Baru').length }, { id: 'dokumen', t: 'Persetujuan Dokumen', i: 'draw' }],
    INSTRUKTUR: [
      { sec: 'Aktivitas Lapangan' }, { id: 'dashboard', t: 'Dashboard', i: 'space_dashboard' }, { id: 'absensi', t: 'Presensi Mingguan', i: 'fact_check' },
      { id: 'penilaian', t: 'Observasi & Penilaian', i: 'grading' }, { sec: 'Komunikasi & Bantuan' },
      { id: 'peringatan', t: 'Data Izin/Alfa', i: 'notification_important', badge: () => S.data.peringatan.filter(p => p.Status === 'Belum ditangani').length, warna: 'amber' },
      { id: 'pesan', t: 'Pesan Darurat', i: 'emergency' }],
    ADMIN: [
      { sec: 'Ringkasan' }, { id: 'dashboard', t: 'Dashboard', i: 'space_dashboard' },
      { sec: 'Data Master' }, { id: 'dudi', t: 'Data DUDI', i: 'apartment' }, { id: 'induk', t: 'Siswa · Guru · Instruktur', i: 'groups' }, { id: 'penempatan', t: 'Penempatan Siswa', i: 'hub' }, { id: 'akun', t: 'Akun Pengguna', i: 'manage_accounts' },
      { sec: 'Monitoring PKL' }, { id: 'absensi', t: 'Absensi', i: 'fact_check' }, { id: 'peringatan', t: 'Peringatan Izin/Alfa', i: 'notification_important', badge: () => S.data.peringatan.filter(p => p.Status === 'Belum ditangani').length, warna: 'amber' },
      { id: 'presentasi', t: 'Jadwal Presentasi', i: 'co_present' }, { id: 'nilai', t: 'Nilai & Penutupan', i: 'lock' }, { id: 'pesan', t: 'Pesan Darurat', i: 'emergency' }, { id: 'rekap', t: 'Rekap & Laporan', i: 'monitoring' },
      { sec: 'Dokumen & Komunikasi' }, { id: 'kartu', t: 'Cetak Kartu PKL', i: 'badge' }, { id: 'dokumen', t: 'Doc Engine', i: 'description' }, { id: 'notifikasi', t: 'WhatsApp & Notifikasi', i: 'forum' }, { id: 'crm', t: 'CRM Kontak', i: 'contacts' },
      { sec: 'Sistem' }, { id: 'migrasi', t: 'Import & Migrasi', i: 'sync_alt' }, { id: 'instrumen', t: 'Instrumen Penilaian', i: 'checklist' }, { id: 'pengaturan', t: 'Pengaturan', i: 'settings' }, { id: 'log', t: 'Log Aktivitas', i: 'history' }]
  };
  function rekapSaya() { return Sesi.me && Sesi.peran === 'SISWA' && S.data ? rekap(Sesi.me.ref) : { prg: [] }; }
  const PUBLIK = ['login', 'lupa', 'darurat', 'v'];
  const App = {
    dirty: false, cur: '', param: '',
    go(h) { if (location.hash === h) App.render(); else location.hash = h; },
    parse() { const h = (location.hash || '#/').replace(/^#\/?/, ''), p = h.split('/'); return { page: p[0] || '', param: decodeURIComponent(p.slice(1).join('/')) }; },
    async start() {
      Activity.init(); Sesi.load(); Tema.awal();
      window.addEventListener('hashchange', () => { App.dirty = false; App.render(); window.scrollTo(0, 0); });
      if (!urlSiap()) { document.getElementById('root').innerHTML = halamanKonfigurasi(); return; }
      if (Sesi.token && Sesi.me && !Sesi.me.wajibGanti) {
        const adaCache = S.fromCache();
        if (adaCache) App.render();
        const r = await S.load({ silent: adaCache });
        if (r.ok && (!adaCache || r.berubah)) App.render(); else if (!r.ok && !adaCache && Sesi.token) App.render();
      } else App.render();
      setInterval(async () => {
        if (!Sesi.token || !S.data || App.dirty || PUBLIK.indexOf(App.cur) > -1) return;
        if (!Activity.due('boot', 60000, 300000)) return;
        const r = await S.load({ silent: true }); if (r.ok && r.berubah && !App.dirty && !document.querySelector('.modal-bg')) App.render(true);
      }, 15000);
    },
    render(pertahankanScroll) {
      const { page, param } = App.parse(), root = document.getElementById('root');
      Tema.sinkron(Sesi.token ? page : '');
      if (page === 'v') { App.cur = 'v'; root.innerHTML = Pages.verifikasi.render(param); Pages.verifikasi.after && Pages.verifikasi.after(param); return; }
      if (!Sesi.token) { if (['login', 'lupa', 'darurat'].indexOf(page) < 0) { location.replace('#/login'); return; } App.cur = page; root.innerHTML = Pages[page].render(param); Pages[page].after && Pages[page].after(param); return; }
      if (Sesi.me.wajibGanti || page === 'ganti') { App.cur = 'ganti'; root.innerHTML = Pages.ganti.render(); Pages.ganti.after && Pages.ganti.after(); return; }
      if (!S.data) { root.innerHTML = '<div class="auth"><div class="center"><span class="spin dark" style="width:36px;height:36px"></span><p class="muted mt">Menyiapkan data…</p><button class="btn ghost sm mt" data-act="logout">Keluar</button></div></div>'; return; }
      const menu = MENU[Sesi.peran] || [], ids = menu.filter(m => m.id).map(m => m.id);
      let id = ids.indexOf(page) > -1 ? page : 'dashboard';
      if (page !== id) { history.replaceState(null, '', '#/' + id); }
      const key = Sesi.peran + ':' + id, pg = Pages[key] || Pages[id];
      App.cur = id; App.param = param;
      const y = window.scrollY;
      root.innerHTML = layout(menu, id, pg ? pg.render(param) : '<div class="empty">Halaman belum tersedia.</div>');
      if (pg && pg.after) pg.after(param);
      isiQr(root);
      if (pertahankanScroll) window.scrollTo(0, y);
      document.title = (menu.find(m => m.id === id) || {}).t + ' · SIGAPKL';
    }
  };
  function layout(menu, aktif, isi) {
    const me = Sesi.me, peranLabel = { ADMIN: 'Admin / Koordinator PKL', GURU: 'Guru Pembimbing', INSTRUKTUR: 'Instruktur DUDI', SISWA: 'Siswa' }[Sesi.peran];
    const logo = driveImg(P('LOGO_URL'), 120), ej = P('EJURNAL_URL');
    let nav = '', bot = '', n = 0;
    menu.forEach(m => {
      if (m.sec) { nav += '<div class="nav-sec">' + esc(m.sec) + '</div>'; return; }
      const b = m.badge ? m.badge() : 0;
      nav += '<a href="#/' + m.id + '" class="' + (m.id === aktif ? 'on' : '') + '" title="' + esc(m.t) + '">' + ic(m.i) + '<span class="t">' + esc(m.t) + '</span>' + (b ? '<span class="badge ' + (m.warna === 'amber' ? 'amber' : '') + '">' + b + '</span>' : '') + '</a>';
      if (n++ < 4) bot += '<a href="#/' + m.id + '" class="' + (m.id === aktif ? 'on' : '') + '">' + ic(m.i) + '<span>' + esc(m.t.split(' ')[0]) + '</span>' + (b ? '<span class="badge">' + b + '</span>' : '') + '</a>';
    });
    if (ej && Sesi.peran !== 'SISWA') nav += '<a href="' + esc(ej) + '" target="_blank" rel="noopener" title="E-Jurnal Guru">' + ic('open_in_new') + '<span class="t">E-Jurnal Guru</span></a>';
    bot += '<a href="#" data-act="menu">' + ic('menu') + '<span>Menu</span></a>';
    const nNotif = (S.data.pesan || []).filter(p => p.Status === 'Baru').length + (S.data.peringatan || []).filter(p => p.Status === 'Belum ditangani').length;
    const roles = me.roles || [Sesi.peran];
    return '<div class="app"><aside class="sidebar" id="sidebar"><div class="brand"><div class="brand-logo">' + (logo ? '<img src="' + esc(logo) + '" alt="" referrerpolicy="no-referrer">' : ic('hub', 'fill')) + '</div><div><div class="brand-name">SIGAPKL – TKJ</div><div class="brand-sub">' + esc(P('NAMA_SEKOLAH') || 'SMK') + '</div></div></div>' +
      '<span class="role-chip">' + esc(peranLabel) + '</span><nav class="nav">' + nav + '</nav><div class="side-foot"><button class="btn-logout" data-act="logout">' + ic('logout') + '<span class="t">Keluar</span><span class="ver">v' + VERSI + '</span></button></div></aside>' +
      '<div class="main"><header class="topbar"><button class="icon-btn hamb" data-act="menu" aria-label="Menu">' + ic('menu') + '</button>' +
      '<label class="search">' + ic('search') + '<input type="search" placeholder="Cari siswa, DUDI, jadwal, atau nilai…" value="' + esc(S.q) + '" data-inp="cari" aria-label="Cari"></label>' +
      '<span class="chip-ta">' + ic('school') + 'TA ' + esc(P('TAHUN_AJARAN')) + ' · Periode ' + esc(periodeAktif()) + '</span>' +
      '<div class="me">' + (roles.length > 1 ? '<select class="role-sel" data-chg="peran" aria-label="Ganti peran">' + roles.map(r => '<option value="' + r + '"' + (r === Sesi.peran ? ' selected' : '') + '>' + (r === 'ADMIN' ? 'Admin' : r === 'GURU' ? 'Guru Pembimbing' : r) + '</option>').join('') + '</select>' : '') +
      '<button class="icon-btn" data-act="notifPanel" aria-label="Notifikasi">' + ic('notifications') + (nNotif ? '<span class="dot"></span>' : '') + '</button>' +
      '<div class="me-txt"><div class="n">' + esc(me.nama) + '</div><div class="s">' + esc(peranLabel) + '</div></div><button class="icon-btn" style="border-radius:50%;padding:0;border:0" data-act="akunSaya" aria-label="Akun saya">' + av(me.nama, Sesi.peran === 'SISWA' ? (S.ix.siswa[me.ref] || {}).FotoURL : '', '') + '</button></div></header>' +
      '<main class="content" id="content">' + (aktif === 'dashboard' ? Tema.banner() : '') + isi + '</main></div></div><nav class="bottom-nav">' + bot + '</nav>';
  }
  function halamanKonfigurasi() {
    return '<div class="auth"><div class="auth-card"><div class="auth-logo">' + ic('settings', 'fill') + '</div><h1>Konfigurasi belum lengkap</h1><p class="tagline">Frontend belum terhubung ke backend Apps Script.</p>' +
      '<div class="alert warn">' + ic('info') + '<div><h4>Langkah perbaikan</h4><p>Buka berkas <b>js/config.js</b>, ganti nilai <code>GAS_URL</code> dengan URL Web App Apps Script Anda (berakhiran <code>/exec</code>), lalu unggah ulang ke GitHub.</p></div></div></div></div>';
  }

  /* ---------------- Delegasi event ---------------- */
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const fn = Act[el.dataset.act]; if (!fn) return;
    if (el.tagName === 'A' || el.tagName === 'BUTTON') e.preventDefault();
    fn(el, e);
  });
  document.addEventListener('change', e => { const el = e.target.closest('[data-chg]'); if (el && Act[el.dataset.chg]) Act[el.dataset.chg](el, e); });
  document.addEventListener('input', e => {
    const el = e.target.closest('[data-inp]'); if (el && Inp[el.dataset.inp]) Inp[el.dataset.inp](el, e);
    if (e.target.closest('form[data-nilai], form[data-dirty], .abs-card')) App.dirty = true;
  });
  let _cariT = null;
  Inp.cari = el => { clearTimeout(_cariT); _cariT = setTimeout(() => { S.q = el.value; const pos = el.selectionStart; App.render(true); const n = document.querySelector('[data-inp=cari]'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} } }, 300); };
  Inp.skor = el => {
    const form = el.closest('form'), id = el.dataset.id, v = Math.max(0, Math.min(100, +el.value || 0));
    form.querySelectorAll('[data-id="' + id + '"]').forEach(x => { if (x !== el) x.value = v; });
    const k = form.querySelector('[data-kat="' + id + '"]'); if (k) k.textContent = v >= 90 ? 'Amat Baik' : v >= 80 ? 'Baik' : v >= 70 ? 'Cukup' : v > 0 ? 'Kurang' : '—';
    hitungUlangNilai(form);
  };
  Act.simpanNilai = (btn) => {
    const form = btn.closest('form'), draf = btn.dataset.draf === '1', skor = {}, catatanAspek = {};
    form.querySelectorAll('input.score-in').forEach(i => { if (i.value !== '') skor[i.dataset.id] = +i.value; });
    form.querySelectorAll('textarea[name^=c_]').forEach(t => { if (t.value.trim()) catatanAspek[t.name.slice(2)] = t.value.trim(); });
    const data = { NIS: form.dataset.nis, Periode: form.dataset.periode, Jenis: form.dataset.jenis, Skor: skor, CatatanAspek: catatanAspek, Catatan: (form.querySelector('[name=Catatan]') || {}).value || '', Rekomendasi: (form.querySelector('[name=Rekomendasi]') || {}).value || '', draf };
    simpan(btn, 'nilai.simpan', data);
  };
  Act.menu = () => {
    const sb = document.getElementById('sidebar'); if (!sb) return;
    sb.classList.toggle('open');
    let sc = document.querySelector('.scrim');
    if (sb.classList.contains('open')) { sc = document.createElement('div'); sc.className = 'scrim'; sc.onclick = () => { sb.classList.remove('open'); sc.remove(); }; document.body.appendChild(sc); }
    else if (sc) sc.remove();
    sb.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { sb.classList.remove('open'); const s = document.querySelector('.scrim'); if (s) s.remove(); }, { once: true }));
  };
  Act.peran = async el => {
    Sesi.peran = el.value; Sesi.save(); S.data = null; S.hash = '';
    if (S.fromCache()) App.go('#/dashboard'); else App.render();
    const r = await S.load(); if (r.ok) App.go('#/dashboard');
  };
  Act.logout = async () => {
    if (!(await konfirmasi('Keluar dari SIGAPKL di perangkat ini?', { ok: 'Keluar' }))) return;
    api('auth.logout', {}); Sesi.clear(); App.go('#/login');
  };
  Act.akunSaya = () => {
    const m = modal({ title: 'Akun Saya', icon: 'account_circle', size: 'sm', body: '<div class="kv"><dt>Nama</dt><dd>' + esc(Sesi.me.nama) + '</dd><dt>Username</dt><dd>' + esc(Sesi.me.username) + '</dd><dt>Peran</dt><dd>' + esc((Sesi.me.roles || []).join(', ')) + '</dd></div>' +
      '<div class="mt"><button class="btn sec block" data-g>' + ic('password') + 'Ganti Kata Sandi</button><button class="btn ghost block mt-s" data-semua>' + ic('devices') + 'Keluar dari semua perangkat</button></div>', foot: false });
    m.el.querySelector('[data-g]').onclick = () => { m.close(); App.go('#/ganti'); };
    m.el.querySelector('[data-semua]').onclick = async () => { m.close(); if (!(await konfirmasi('Semua sesi di perangkat lain akan berakhir. Lanjutkan?', { danger: true }))) return; await api('auth.logout', { semua: true }); Sesi.clear(); App.go('#/login'); };
  };
  Act.notifPanel = () => {
    const d = S.data, items = [];
    (d.pesan || []).filter(p => p.Status === 'Baru').forEach(p => items.push({ i: 'emergency', c: 'rose', t: 'Pesan darurat: ' + p.Subjek, s: nmSiswa(p.NIS) + ' · ' + fmtWaktu(p.DibuatPada), h: '#/pesan' }));
    (d.peringatan || []).filter(p => p.Status === 'Belum ditangani').forEach(p => items.push({ i: 'warning', c: 'amber', t: 'Peringatan ' + (p.Jenis === 'ALFA' ? 'Alfa' : 'Izin') + ' ' + p.Jumlah + ' hari', s: nmSiswa(p.NIS) + ' · Periode ' + p.Periode, h: '#/peringatan' }));
    const m = modal({ title: 'Notifikasi', icon: 'notifications', size: 'sm', foot: false, body: items.length ? '<div class="list">' + items.slice(0, 20).map(x => '<a class="li" href="' + x.h + '"><span class="ic ' + x.c + '">' + ic(x.i) + '</span><div><div class="b">' + esc(x.t) + '</div><div class="small muted">' + esc(x.s) + '</div></div></a>').join('') + '</div>' : '<div class="empty">' + ic('notifications_off') + 'Tidak ada notifikasi baru.</div>' });
    m.el.querySelectorAll('a').forEach(a => a.addEventListener('click', () => m.close()));
  };
  Act.go = el => App.go(el.dataset.href);
  Act.cetakKartu = async (el) => {
    const nis = (el.dataset.nis || '').split(',').filter(Boolean); if (!nis.length) return;
    let html = '<div class="card-grid">'; nis.forEach((n, i) => { html += K.kartu(n); if ((i + 1) % 8 === 0) html += '</div><div class="page-break"></div><div class="card-grid">'; }); html += '</div>';
    const tmp = document.createElement('div'); tmp.innerHTML = html; await isiQr(tmp);
    cetak(tmp.innerHTML, 'Kartu PKL');
  };


  /* ---------------- Tema warna & suasana (hari peringatan) ----------------
   * Konfigurasi di Pengaturan.TEMA (publik → berlaku juga di halaman login).
   * Urutan prioritas: jadwal khusus (tanggal penuh) → hari peringatan otomatis (BB-HH) → tema dasar. */
  const TEMA_PRESET = [
    { id: 'mint', n: 'Mint Vokasi', p: '#0D9488', a: '#F43F5E', ket: 'Tema bawaan', u: '' },
    { id: 'kartini', n: 'Hari Kartini', p: '#BE185D', a: '#7C3AED', dari: '04-20', sampai: '04-22', tgl: '21 Apr', u: 'Selamat Hari Kartini — habis gelap terbitlah terang.' },
    { id: 'hardiknas', n: 'Hari Pendidikan Nasional', p: '#1D4ED8', a: '#F59E0B', dari: '05-01', sampai: '05-03', tgl: '2 Mei', u: 'Selamat Hari Pendidikan Nasional — Ing ngarsa sung tuladha.' },
    { id: 'lingkungan', n: 'Hari Lingkungan Hidup', p: '#15803D', a: '#0EA5E9', dari: '06-04', sampai: '06-06', tgl: '5 Jun', u: 'Selamat Hari Lingkungan Hidup — cetak seperlunya, hemat kertas.' },
    { id: 'kemerdekaan', n: 'HUT Kemerdekaan RI', p: '#C8102E', a: '#F59E0B', dari: '08-01', sampai: '08-31', tgl: 'Agustus', u: 'Dirgahayu Republik Indonesia!' },
    { id: 'batik', n: 'Hari Batik Nasional', p: '#92400E', a: '#1E40AF', dari: '10-01', sampai: '10-03', tgl: '2 Okt', u: 'Selamat Hari Batik Nasional — yuk berbatik ke tempat PKL.' },
    { id: 'santri', n: 'Hari Santri', p: '#047857', a: '#CA8A04', dari: '10-21', sampai: '10-23', tgl: '22 Okt', u: 'Selamat Hari Santri Nasional.' },
    { id: 'sumpahpemuda', n: 'Hari Sumpah Pemuda', p: '#9F1239', a: '#D97706', dari: '10-27', sampai: '10-29', tgl: '28 Okt', u: 'Selamat Hari Sumpah Pemuda — satu nusa, satu bangsa, satu bahasa.' },
    { id: 'pahlawan', n: 'Hari Pahlawan', p: '#7C2D12', a: '#DC2626', dari: '11-09', sampai: '11-11', tgl: '10 Nov', u: 'Selamat Hari Pahlawan — jasamu abadi.' },
    { id: 'guru', n: 'Hari Guru Nasional', p: '#0369A1', a: '#F97316', dari: '11-24', sampai: '11-26', tgl: '25 Nov', u: 'Selamat Hari Guru Nasional — terima kasih, Bapak/Ibu Guru.' },
    { id: 'natal', n: 'Natal', p: '#166534', a: '#DC2626', dari: '12-24', sampai: '12-26', tgl: '25 Des', u: 'Selamat Hari Natal.' },
    { id: 'tahunbaru', n: 'Tahun Baru', p: '#4338CA', a: '#DB2777', dari: '12-31', sampai: '01-01', tgl: '1 Jan', u: 'Selamat Tahun Baru!' },
    { id: 'ramadan', n: 'Ramadan & Idulfitri', p: '#065F46', a: '#B45309', ket: 'Tanggal berubah tiap tahun', u: 'Selamat menunaikan ibadah puasa Ramadan.' },
    { id: 'penilaian', n: 'Masa Penilaian', p: '#334155', a: '#0EA5E9', ket: 'Tenang & fokus', u: 'Masa penilaian PKL — pastikan semua nilai terisi sebelum dikunci.' }
  ];

  /* Motif & siluet per tema — SVG buatan sendiri, satu warna (c), dipakai sebagai data URI.
   * pola: ubin berulang (s = ukuran ubin) · siluet: gambar besar viewBox 0 0 120 120. */
  const bintang = (x, y, r, c) => { let d = ''; for (let i = 0; i < 10; i++) { const a = Math.PI / 5 * i - Math.PI / 2, rr = i % 2 ? r * .45 : r; d += (i ? 'L' : 'M') + (x + rr * Math.cos(a)).toFixed(1) + ' ' + (y + rr * Math.sin(a)).toFixed(1); } return '<path d="' + d + 'Z" fill="' + c + '"/>'; };
  const awan = 'M14 86c-6-14 6-26 18-22 0-14 16-22 26-12 6-14 28-14 32 2 14-2 22 12 16 22 10 4 10 18-2 20H22c-8 0-12-4-8-10z';
  const MOTIF = {
    batik: { s: 40, pola: c => '<g fill="none" stroke="' + c + '" stroke-width="1.5"><ellipse cx="10" cy="10" rx="8.6" ry="4.4" transform="rotate(45 10 10)"/><ellipse cx="30" cy="10" rx="8.6" ry="4.4" transform="rotate(-45 30 10)"/><ellipse cx="10" cy="30" rx="8.6" ry="4.4" transform="rotate(-45 10 30)"/><ellipse cx="30" cy="30" rx="8.6" ry="4.4" transform="rotate(45 30 30)"/></g><g fill="' + c + '"><circle cx="20" cy="20" r="2"/><circle cx="0" cy="0" r="2"/><circle cx="40" cy="0" r="2"/><circle cx="0" cy="40" r="2"/><circle cx="40" cy="40" r="2"/><circle cx="10" cy="10" r="1.1"/><circle cx="30" cy="10" r="1.1"/><circle cx="10" cy="30" r="1.1"/><circle cx="30" cy="30" r="1.1"/></g>',
      siluet: c => '<g fill="none" stroke="' + c + '" stroke-width="3.2" stroke-linejoin="round">' + [1, .8, .6, .4].map((k, i) => '<path d="' + awan + '" transform="translate(' + (60 - 60 * k) + ' ' + (80 - 80 * k + i * 2) + ') scale(' + k + ')"/>').join('') + '</g>' },
    kemerdekaan: { s: 36, pola: c => bintang(18, 18, 4.5, c) + '<circle cx="0" cy="0" r="1.4" fill="' + c + '"/><circle cx="36" cy="36" r="1.4" fill="' + c + '"/>',
      siluet: c => '<rect x="22" y="8" width="4" height="108" rx="2" fill="' + c + '"/><circle cx="24" cy="7" r="4" fill="' + c + '"/><path d="M26 14c18-8 34 8 52 0s28-4 34 2v26c-8-6-18-8-34-2s-34-8-52 0z" fill="' + c + '"/><path d="M26 40c18-8 34 8 52 0s28-4 34 2v26c-8-6-18-8-34-2s-34-8-52 0z" fill="none" stroke="' + c + '" stroke-width="3"/>' },
    sumpahpemuda: { s: 40, pola: c => '<g fill="none" stroke="' + c + '" stroke-width="1.4"><circle cx="14" cy="20" r="7"/><circle cx="26" cy="20" r="7"/></g>',
      siluet: c => '<path d="M50 62h20l-6 50h-8z" fill="' + c + '"/><rect x="46" y="56" width="28" height="7" rx="3" fill="' + c + '"/><path d="M60 8c4 14 18 18 14 34-2 8-8 12-14 12s-14-4-15-13c-1-10 7-14 8-22 4 6 4 10 7 12 2-8-2-14 0-23z" fill="' + c + '"/><path d="M60 30c2 7 7 9 5 16-1 3-3 5-5 5s-5-2-5-6c0-4 3-6 5-15z" fill="none" stroke="' + c + '" stroke-width="2"/>' },
    pahlawan: { s: 36, pola: c => bintang(18, 18, 3.6, c),
      siluet: c => '<g fill="' + c + '">' + [[34, -14], [60, 0], [86, 14]].map(([x, r]) => '<g transform="rotate(' + r + ' ' + x + ' 116)"><path d="M' + (x - 5) + ' 116V26L' + x + ' 4l5 22v90z"/></g>').join('') + '</g>' +
        [[34, -14], [60, 0], [86, 14]].map(([x, r]) => '<g transform="rotate(' + r + ' ' + x + ' 116)" stroke="' + c + '" stroke-width="2.4" opacity=".55"><path d="M' + (x - 8) + ' 52h16M' + (x - 8) + ' 80h16M' + (x - 8) + ' 106h16"/></g>').join('') },
    guru: { s: 36, pola: c => '<path d="M10 22l6-12 2 1-6 12-3 1z" fill="' + c + '"/><circle cx="28" cy="28" r="1.4" fill="' + c + '"/>',
      siluet: c => '<path d="M10 40c18-6 34-4 50 6 16-10 32-12 50-6v62c-18-6-34-4-50 6-16-10-32-12-50-6z" fill="none" stroke="' + c + '" stroke-width="3.4" stroke-linejoin="round"/><path d="M60 46v62" stroke="' + c + '" stroke-width="3"/><path d="M20 56c10-3 20-2 30 3M20 70c10-3 20-2 30 3M70 59c10-5 20-6 30-3M70 73c10-5 20-6 30-3" stroke="' + c + '" stroke-width="2.2" fill="none"/><path d="M84 8l10 4-28 46-8 4 1-9z" fill="' + c + '"/>' },
    hardiknas: { s: 32, pola: c => '<circle cx="8" cy="8" r="1.6" fill="' + c + '"/><circle cx="24" cy="24" r="1.6" fill="' + c + '"/>',
      siluet: c => '<path d="M60 18l52 22-52 22L8 40z" fill="' + c + '"/><path d="M28 50v22c0 10 64 10 64 0V50l-32 14z" fill="' + c + '"/><path d="M104 44v30" stroke="' + c + '" stroke-width="3"/><circle cx="104" cy="78" r="5" fill="' + c + '"/><path d="M30 96h60M36 106h48" stroke="' + c + '" stroke-width="3.4" stroke-linecap="round"/>' },
    kartini: { s: 40, pola: c => '<g fill="' + c + '">' + [0, 72, 144, 216, 288].map(a => '<ellipse cx="20" cy="15" rx="2.6" ry="4.4" transform="rotate(' + a + ' 20 20)"/>').join('') + '</g><circle cx="20" cy="20" r="1.6" fill="none" stroke="' + c + '"/>',
      siluet: c => '<g fill="' + c + '">' + [0, 45, 90, 135, 180, 225, 270, 315].map(a => '<ellipse cx="60" cy="34" rx="9" ry="20" transform="rotate(' + a + ' 60 56)"/>').join('') + '</g><circle cx="60" cy="56" r="9" fill="none" stroke="' + c + '" stroke-width="3"/><path d="M60 84c0 14-2 22-8 32M58 100c-12-2-20 2-26 10 12 2 20-2 26-10z" fill="none" stroke="' + c + '" stroke-width="3"/>' },
    lingkungan: { s: 40, pola: c => '<path d="M10 30c0-12 8-20 20-20 0 12-8 20-20 20zM10 30l12-12" fill="none" stroke="' + c + '" stroke-width="1.5"/>',
      siluet: c => '<path d="M20 108C14 54 52 14 112 10c4 60-36 100-92 98z" fill="none" stroke="' + c + '" stroke-width="3.4" stroke-linejoin="round"/><path d="M20 108C44 76 70 50 100 24M42 84l-3-22M58 68l-2-24M74 52l-1-20M50 76l26 2M66 60l24 0M82 44l16 2" fill="none" stroke="' + c + '" stroke-width="2.6" stroke-linecap="round"/>' },
    santri: { s: 40, pola: c => '<g fill="none" stroke="' + c + '" stroke-width="1.4"><rect x="13" y="13" width="14" height="14"/><rect x="13" y="13" width="14" height="14" transform="rotate(45 20 20)"/></g>',
      siluet: c => '<path d="M60 18c-4 8-24 18-26 40h52c-2-22-22-32-26-40z" fill="' + c + '"/><path d="M60 6v12" stroke="' + c + '" stroke-width="3"/><path d="M30 60h60v50H30z" fill="' + c + '"/><path d="M12 110V70l-4-8h16l-4 8v40zM108 110V70l-4-8h16l-4 8v40z" fill="' + c + '"/><path d="M96 14a10 10 0 1 0 6 18 12 12 0 0 1-6-18z" fill="' + c + '"/>' },
    ramadan: { s: 44, pola: c => '<path d="M18 10a10 10 0 1 0 8 16 12 12 0 0 1-8-16z" fill="' + c + '"/>' + bintang(34, 34, 3, c),
      siluet: c => '<path d="M60 4v14" stroke="' + c + '" stroke-width="2.5"/><path d="M60 18l36 36-36 36-36-36z" fill="' + c + '"/><path d="M42 36l36 36M51 27l36 36M33 45l36 36M78 36L42 72M69 27L33 63M87 45L51 81" stroke="#fff" stroke-opacity=".35" stroke-width="2.5"/><path d="M52 90c-2 10-6 16-12 22M68 90c2 10 6 16 12 22" fill="none" stroke="' + c + '" stroke-width="2.5"/><path d="M100 10a12 12 0 1 0 8 20 14 14 0 0 1-8-20z" fill="' + c + '"/>' },
    natal: { s: 40, pola: c => '<g stroke="' + c + '" stroke-width="1.4" stroke-linecap="round"><path d="M20 12v16M12 20h16M14.5 14.5l11 11M25.5 14.5l-11 11"/></g>',
      siluet: c => '<path d="M60 16l26 34H72l22 28H74l24 26H22l24-26H26l22-28H34z" fill="' + c + '"/><rect x="54" y="104" width="12" height="12" fill="' + c + '"/>' + bintang(60, 10, 9, c) },
    tahunbaru: { s: 40, pola: c => '<path d="M20 10l2.4 7.6L30 20l-7.6 2.4L20 30l-2.4-7.6L10 20l7.6-2.4z" fill="' + c + '"/><circle cx="4" cy="4" r="1.2" fill="' + c + '"/>',
      siluet: c => '<g stroke="' + c + '" stroke-width="3" stroke-linecap="round">' + Array.from({ length: 16 }, (_, i) => { const a = i * Math.PI / 8; return '<path d="M' + (60 + 14 * Math.cos(a)).toFixed(1) + ' ' + (52 + 14 * Math.sin(a)).toFixed(1) + 'L' + (60 + 40 * Math.cos(a)).toFixed(1) + ' ' + (52 + 40 * Math.sin(a)).toFixed(1) + '"/>'; }).join('') + '</g><path d="M60 92v24" stroke="' + c + '" stroke-width="3" stroke-dasharray="4 5"/>' },
    penilaian: { s: 32, pola: c => '<path d="M0 .5H32M.5 0V32" stroke="' + c + '" stroke-width="1"/>',
      siluet: c => '<rect x="22" y="14" width="76" height="98" rx="8" fill="none" stroke="' + c + '" stroke-width="3.4"/><rect x="44" y="8" width="32" height="14" rx="4" fill="' + c + '"/><path d="M34 44l6 6 10-12M34 70l6 6 10-12M34 96l6 6 10-12" fill="none" stroke="' + c + '" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M60 46h26M60 72h26M60 98h18" stroke="' + c + '" stroke-width="3.4" stroke-linecap="round"/>' }
  };
  const svgUrl = (isi, vb, op) => 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '"><g opacity="' + op + '">' + isi + '</g></svg>') + '")';
  const Tema = {
    PRESET: TEMA_PRESET, MOTIF, cur: null,
    motifUrl(id, jenis, warna, op) { const mo = MOTIF[id]; if (!mo) return ''; return jenis === 'siluet' ? svgUrl(mo.siluet(warna), '0 0 120 120', op) : svgUrl(mo.pola(warna), '0 0 ' + mo.s + ' ' + mo.s, op); }, prev: null, _kunci: '',
    preset(id) { return TEMA_PRESET.find(x => x.id === id) || null; },
    cfg() {
      let raw = S.data ? P('TEMA') : ((LS.get('sigapkl_publik', null) || {}).TEMA || '');
      try { const c = JSON.parse(raw || '{}'); return c && typeof c === 'object' ? c : {}; } catch (e) { return {}; }
    },
    hex2rgb(h) { h = String(h || '').replace('#', ''); if (!/^[0-9a-f]{6}$/i.test(h)) return [13, 148, 136]; return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); },
    rgb2hex(c) { return '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase(); },
    mix(a, b, t) { const x = Tema.hex2rgb(a), y = Tema.hex2rgb(b); return Tema.rgb2hex(x.map((v, i) => v * (1 - t) + y[i] * t)); },
    lum(h) { return Tema.hex2rgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0); },
    kontras(a, b) { const x = Tema.lum(a), y = Tema.lum(b || '#FFFFFF'); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); },
    /** Turunkan kecerahan (HSL) sambil mempertahankan rona & saturasi sampai teks putih terbaca. */
    gelapkan(h, target) {
      let [r, g, b] = Tema.hex2rgb(h).map(v => v / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let hh = 0, ss = 0, l = (mx + mn) / 2;
      if (mx !== mn) { const d = mx - mn; ss = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh /= 6; }
      const keHex = L => { const q = L < .5 ? L * (1 + ss) : L + ss - L * ss, p = 2 * L - q, f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
        return Tema.rgb2hex([f(hh + 1 / 3), f(hh), f(hh - 1 / 3)].map(v => v * 255)); };
      let c = h; while (Tema.kontras(c) < (target || 4.5) && l > .05) { l -= .02; c = keHex(l); } return c;
    },
    /** Tentukan tema yang berlaku pada tanggal tertentu (default: hari ini). */
    aktif(cfg, tgl) { const t = Tema._aktif(cfg, tgl); t.motif = !cfg || cfg.motif !== false; return t; },
    _aktif(cfg, tgl) {
      cfg = cfg || {}; const d = tgl || hariIni(), bh = d.slice(5);
      const pakai = (pr, sumber, ext) => Object.assign({ id: pr.id, n: pr.n, p: pr.p, a: pr.a, u: pr.u || '', sumber }, ext || {});
      const jd = (cfg.jadwal || []).find(j => j && j.dari <= d && d <= j.sampai && Tema.preset(j.preset));
      if (jd) { const pr = Tema.preset(jd.preset); return pakai(pr, 'jadwal', { u: jd.ucapan || pr.u, dari: jd.dari, sampai: jd.sampai }); }
      if (cfg.otomatis !== false) {
        const hari = cfg.hari || [];
        const pr = TEMA_PRESET.find(x => x.dari && hari.indexOf(x.id) > -1 && (x.dari <= x.sampai ? x.dari <= bh && bh <= x.sampai : bh >= x.dari || bh <= x.sampai));
        if (pr) return pakai(pr, 'otomatis');
      }
      if (cfg.preset === 'kustom' && cfg.kustom) return { id: 'kustom', n: 'Warna sendiri', p: cfg.kustom.p || '#0D9488', a: cfg.kustom.a || '#F43F5E', u: cfg.ucapan || '', sumber: 'dasar' };
      const pr = Tema.preset(cfg.preset) || TEMA_PRESET[0];
      return pakai(pr, 'dasar', { u: cfg.ucapan || pr.u });
    },
    terapkan(t) {
      if (!t) return; const p = t.p, a = t.a, W = '#FFFFFF', B = '#0B1220';
      const v = { teal: p, 'teal-500': Tema.mix(p, W, .18), 'teal-200': Tema.mix(p, W, .66), 'teal-100': Tema.mix(p, W, .83), 'teal-50': Tema.mix(p, W, .94),
        'teal-700': Tema.mix(p, B, .16), 'teal-800': Tema.mix(p, B, .36), canvas: Tema.mix(p, W, .945), 'canvas-2': Tema.mix(p, W, .91),
        line: Tema.mix(Tema.mix(p, W, .82), '#E2E8F0', .3), aksen: a, 'aksen-100': Tema.mix(a, W, .85) };
      const st = document.documentElement.style;
      Object.keys(v).forEach(k => st.setProperty('--' + k, v[k]));
      st.setProperty('--pri-rgb', Tema.hex2rgb(p).join(','));
      const mo = t.motif !== false && MOTIF[t.id], set = (k, val) => st.setProperty(k, val);
      if (mo) {
        const vb = '0 0 ' + mo.s + ' ' + mo.s;
        set('--motif-ubin', mo.s + 'px'); set('--motif-pola', svgUrl(mo.pola(p), vb, .09)); set('--motif-pola-terang', svgUrl(mo.pola('#FFFFFF'), vb, .13));
        set('--motif-siluet', svgUrl(mo.siluet(p), '0 0 120 120', .13)); set('--motif-siluet-terang', svgUrl(mo.siluet('#FFFFFF'), '0 0 120 120', .26));
      } else ['--motif-pola', '--motif-pola-terang', '--motif-siluet', '--motif-siluet-terang'].forEach(k => set(k, 'none'));
      document.documentElement.dataset.tema = t.id;
      const m = document.querySelector('meta[name=theme-color]'); if (m) m.setAttribute('content', p);
      Tema.cur = t; Tema.v = v; Tema._kunci = t.id + p + a + (t.motif !== false);
    },
    /** Selaraskan dengan konfigurasi tersimpan (kecuali sedang pratinjau di halaman Pengaturan). */
    sinkron(page) {
      if (Tema.prev && page === 'pengaturan') return;
      Tema.prev = null;
      if (S.data) { const pb = LS.get('sigapkl_publik', null) || {}; if (pb.TEMA !== P('TEMA')) { pb.TEMA = P('TEMA'); LS.set('sigapkl_publik', pb); } }
      const t = Tema.aktif(Tema.cfg());
      if (t.id + t.p + t.a + (t.motif !== false) !== Tema._kunci) { Tema.terapkan(t); LS.set('sigapkl_tema', t); } else Tema.cur = t;
    },
    pratinjau(t) { Tema.prev = t; Tema.terapkan(t); },
    awal() { const t = LS.get('sigapkl_tema', null); if (t && t.p) Tema.terapkan(t); },
    /** Warna untuk grafik SVG (atribut tidak bisa memakai var()). */
    c(k) { return (Tema.v && Tema.v[k || 'teal']) || { teal: Tema.c(), 'canvas-2': Tema.c('canvas-2'), 'teal-200': Tema.c('teal-200') }[k || 'teal'] || Tema.c(); },
    banner() {
      const t = Tema.cur, cfg = Tema.cfg(); if (!t || !t.u || cfg.ucapanTampil === false) return '';
      const kunci = 'sigapkl_ucapan_' + hariIni() + '_' + t.id; if (LS.get(kunci, 0)) return '';
      return '<div class="tema-ucapan" role="note"><span class="tu-ic">' + ic(t.id === 'kemerdekaan' ? 'flag' : t.id === 'penilaian' ? 'fact_check' : 'celebration', 'fill') + '</span><div class="grow"><div class="tu-t">' + esc(t.u) + '</div><div class="tu-s">' + esc(t.n) + (t.sumber === 'dasar' ? '' : ' · tema berganti otomatis') + '</div></div>' +
        '<button class="tu-x" data-act="tutupUcapan" data-k="' + kunci + '" aria-label="Tutup ucapan">' + ic('close') + '</button></div>';
    }
  };
  Act.tutupUcapan = el => { LS.set(el.dataset.k, 1); const b = el.closest('.tema-ucapan'); if (b) b.remove(); };

  /* ---------------- Ekspor global ---------------- */
  Object.assign(window, { App, Sesi, S, api, Pages, Act, Forms, Inp, K, P, esc, ic, av, pill, pillStatus, toast, modal, konfirmasi, busy, simpan, fld, bacaForm, formModal, barChart, donut, rekap, penOf,
    periodeAktif, instrumen, JENIS, predikat, predikatTeks, bobot, fmtTgl, fmtTglL, fmtWaktu, isoTgl, tambahHari, hariIni, tglObj, HARI, BLN, inisial, driveImg, driveId, nmSiswa, nmGuru, nmIns, nmDudi, num, cari,
    eksporXlsx, bacaBerkasTabel, qrDataUrl, isiQr, cetak, warmUp, LS, urlSiap, Tema });
})();
