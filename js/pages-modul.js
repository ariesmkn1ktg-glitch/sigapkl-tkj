/* SIGAPKL · Modul ADMIN: WhatsApp & Notifikasi, CRM Kontak, Import & Migrasi, Doc Engine */
(function () {
  'use strict';
  const tabs = (aktif, list, base) => '<div class="tabs">' + list.map(t => '<button class="' + (t[0] === aktif ? 'on' : '') + '" data-act="go" data-href="#/' + base + '/' + t[0] + '">' + ic(t[2] || 'circle') + ' ' + esc(t[1]) + '</button>').join('') + '</div>';
  const box = (id, h) => '<div id="' + id + '">' + (h || '<div class="skel" style="height:200px"></div>') + '</div>';
  const $ = id => document.getElementById(id);
  const waBadge = s => s === 'Terdaftar' ? pill('✓ WA', 'ok') : s === 'Tidak Terdaftar' ? pill('✕ bukan WA', 'bad') : pill('? belum dicek', 'mute');

  /* =====================================================================
   * WHATSAPP & NOTIFIKASI
   * ===================================================================*/
  const Blast = { penerima: [], ringkas: null, timer: null, aktif: null };
  Pages['ADMIN:notifikasi'] = {
    render(param) {
      const t = ['blast', 'antrean', 'konfigurasi'].indexOf(param) > -1 ? param : 'blast';
      return head(ic('forum') + ' Komunikasi', 'WhatsApp & Notifikasi', 'Notifikasi otomatis (Fonnte + Email) lewat antrean — aksi pengguna tidak pernah menunggu pengiriman. Blast dikirim per batch 10/20/50 dengan jeda anti-banned.') +
        tabs(t, [['blast', 'Blast WhatsApp', 'campaign'], ['antrean', 'Antrean & Riwayat', 'outbox'], ['konfigurasi', 'Konfigurasi', 'tune']], 'notifikasi') + box('nt-' + t);
    },
    async after(param) {
      const t = ['blast', 'antrean', 'konfigurasi'].indexOf(param) > -1 ? param : 'blast';
      if (t === 'blast') return renderBlast();
      if (t === 'antrean') return renderAntrean();
      return renderKonfig();
    }
  };
  async function renderBlast() {
    const el = $('nt-blast'); if (!el) return;
    const [st, bl] = await Promise.all([api('crm.stats', {}), api('wa.blastList', {})]);
    const seg = st.success ? Object.keys(st.data.segmen) : [];
    const pre = (() => { try { return JSON.parse(sessionStorage.getItem('blast_ids') || 'null'); } catch (e) { return null; } })();
    el.innerHTML = '<div class="grid g2"><div class="card"><div class="card-h"><span class="ic teal">1</span><h3>Pilih Sasaran</h3></div>' +
      '<div class="form-grid">' + fld({ name: 'segmen', label: 'Segmen CRM', type: 'select', options: seg, ph: 'Semua segmen' }) + fld({ name: 'tag', label: 'Tag (opsional)' }) + '</div>' +
      (pre ? '<div class="alert mb">' + ic('checklist') + '<p class="small">' + pre.length + ' kontak terpilih dari CRM. <button class="link-btn" data-act="hapusPre">Batalkan pilihan</button></p></div>' : '') +
      '<div class="actions"><button class="btn sec" data-act="muatPenerima">' + ic('group') + 'Muat Penerima</button><button class="btn ghost" data-act="deteksiWA">' + ic('verified_user') + 'Deteksi Nomor WA</button></div>' +
      '<div id="aud-ring" class="row wrap mt"></div><label class="check mt-s small"><input type="checkbox" id="hanya-wa"> Kirim hanya ke nomor terdeteksi WhatsApp</label><div id="aud-list" class="mt" style="max-height:340px;overflow:auto"></div></div>' +
      '<div class="card"><div class="card-h"><span class="ic teal">2</span><h3>Tulis Pesan</h3></div>' + fld({ name: 'judul', label: 'Judul internal', ph: 'Pengumuman jadwal presentasi' }) +
      '<div class="row wrap mb">' + ['{nama}', '{kelas}', '{nis}', '{institusi}', '{link}'].map(v => '<button class="tag" style="border:0;cursor:pointer" data-act="sisipVar" data-v="' + v + '">' + v + '</button>').join('') + '</div>' +
      '<textarea class="input" id="blast-pesan" rows="6" data-inp="pratinjau" placeholder="Assalamu\'alaikum {nama}, …">Halo {nama}, </textarea>' +
      '<div class="small muted mt-s">Pratinjau (penerima pertama):</div><div id="wa-prev" style="background:#DCF8C6;border-radius:12px 12px 12px 2px;padding:10px 12px;margin-top:6px;white-space:pre-wrap;font-size:13px;max-width:420px"></div>' +
      '<div class="card-h mt"><span class="ic teal">3</span><h3>Ukuran Batch & Jeda</h3></div><div class="row wrap"><div class="seg" id="seg-batch">' + [10, 20, 50].map(n => '<button class="' + (n === 20 ? 'on' : '') + '" data-act="pilihBatch" data-n="' + n + '">' + n + '</button>').join('') + '</div>' +
      '<input class="input" id="blast-jeda" value="3-8" style="width:110px" data-inp="pratinjau" aria-label="Jeda detik"><span class="small muted">detik (boleh acak "3-8")</span></div><div id="blast-sum" class="small b mt-s"></div>' +
      '<button class="btn block lg mt" data-act="mulaiBlast">' + ic('rocket_launch') + '<span id="blast-btn">Mulai Blast</span></button><div class="xs muted mt-s">Tips anti-banned: gunakan nomor "hangat", mulai batch 10, jeda acak ≥5 detik, hindari tautan yang sama ke ratusan orang dalam 1 jam.</div></div></div>' +
      '<div class="card mt"><div class="card-h"><h3 class="grow">Riwayat Blast</h3><label class="check small"><input type="checkbox" id="blast-auto"> Otomatis kirim batch berikutnya</label></div><div id="blast-list">' + daftarBlast(bl.success ? bl.data : []) + '</div><div class="xs muted mt-s">Server tetap mengirim 1 batch/menit walau halaman ditutup (trigger).</div></div>';
    Blast.penerima = []; Inp.pratinjau();
    if (pre) Act.muatPenerima();
    $('blast-auto').onchange = e => { clearInterval(Blast.timer); if (e.target.checked) Blast.timer = setInterval(() => { const b = document.querySelector('[data-act=prosesBlast]'); if (b && document.visibilityState === 'visible') Act.prosesBlast(b, true); }, 45000); };
  }
  function daftarBlast(list) {
    if (!list.length) return '<div class="empty small">Belum ada blast.</div>';
    return tblWrap(['Judul', 'Sasaran', 'Batch · Jeda', 'Progres', 'Status', ''], list.map(b => '<tr><td><b>' + esc(b.Judul) + '</b><div class="xs muted">' + esc(fmtWaktu(b.Tanggal)) + ' · ' + esc(b.DibuatOleh) + '</div></td><td class="small">' + esc(b.Sasaran || '-') + '</td><td class="small">' + esc(b.UkuranBatch) + ' · ' + esc(b.JedaDetik) + ' dtk</td>' +
      '<td style="min-width:160px"><div class="bar"><i style="width:' + b.persen + '%"></i></div><div class="xs muted mt-s">' + esc(b.Terkirim) + ' terkirim · ' + esc(b.Gagal) + ' gagal · ' + esc(b.sisa) + ' sisa</div></td><td>' + pillStatus(b.Status) + '</td>' +
      '<td class="right" style="white-space:nowrap">' + (b.Status === 'Berjalan' ? '<button class="btn sm" data-act="prosesBlast" data-id="' + esc(b.BlastID) + '">' + ic('play_arrow') + 'Batch berikutnya</button> <button class="btn danger-o sm" data-act="stopBlast" data-id="' + esc(b.BlastID) + '">' + ic('stop') + '</button>' : '') + '</td></tr>'));
  }
  Act.hapusPre = () => { sessionStorage.removeItem('blast_ids'); App.render(); };
  Act.sisipVar = el => { const t = $('blast-pesan'), p = t.selectionStart || t.value.length; t.value = t.value.slice(0, p) + el.dataset.v + t.value.slice(p); t.focus(); Inp.pratinjau(); };
  Act.pilihBatch = el => { el.parentNode.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el)); Inp.pratinjau(); };
  Inp.pratinjau = () => {
    const t = $('blast-pesan'); if (!t) return;
    const pen = penerimaAktif(), p = pen[0] || { nama: 'Ahmad Fauzi', kelas: 'XII TKJ 1', nis: '2425001' };
    $('wa-prev').textContent = t.value.replace(/\{(\w+)\}/g, (m, k) => ({ nama: p.nama, kelas: p.kelas, nis: p.nis, institusi: P('NAMA_SEKOLAH'), link: P('APP_URL') || location.href.replace(/#.*$/, '') }[k] || m));
    const n = +(document.querySelector('#seg-batch .on') || { dataset: { n: 20 } }).dataset.n, j = String($('blast-jeda').value).split('-').map(Number), rata = j.length > 1 ? (j[0] + j[1]) / 2 : j[0] || 5;
    $('blast-sum').textContent = pen.length ? pen.length + ' penerima → ' + Math.ceil(pen.length / n) + ' batch · ±' + Math.ceil(pen.length * rata / 60) + ' menit' : 'Muat penerima terlebih dahulu.';
    $('blast-btn').textContent = 'Mulai Blast (' + pen.length + ' nomor)';
  };
  function penerimaAktif() {
    const hanya = $('hanya-wa') && $('hanya-wa').checked;
    return Blast.penerima.filter(r => r.valid && !r.ganda && !r.optOut && (!hanya || r.statusWA === 'Terdaftar') && !(document.querySelector('[data-aud="' + r.id + '"]') && !document.querySelector('[data-aud="' + r.id + '"]').checked));
  }
  Act.muatPenerima = async btn => {
    const pre = (() => { try { return JSON.parse(sessionStorage.getItem('blast_ids') || 'null'); } catch (e) { return null; } })();
    const r = await (btn ? busy(btn, () => api('wa.audience', { segmen: document.querySelector('#nt-blast [name=segmen]').value, tag: document.querySelector('#nt-blast [name=tag]').value, ids: pre || undefined })) : api('wa.audience', { ids: pre || undefined }));
    if (!r || !r.success) { if (r) toast(r.message, 'bad'); return; }
    Blast.penerima = r.data.rows; Blast.ringkas = r.data.ringkas; gambarAudiens();
  };
  function gambarAudiens() {
    const g = Blast.ringkas || {};
    $('aud-ring').innerHTML = [['Total', g.total, 'info'], ['Valid', g.valid, 'ok'], ['Tidak valid', g.tidakValid, 'bad'], ['Ganda', g.ganda, 'warn'], ['Terdaftar WA', g.terdaftarWA, 'ok'], ['Opt-out', g.optOut, 'mute']].map(x => pill(x[0] + ' ' + (x[1] || 0), x[2])).join('');
    $('aud-list').innerHTML = tblWrap(['', 'Nama', 'Nomor', 'Segmen', 'WA'], Blast.penerima.slice(0, 1000).map(r => '<tr style="' + (!r.valid || r.ganda || r.optOut ? 'opacity:.45' : '') + '"><td><input type="checkbox" data-aud="' + esc(r.id) + '"' + (r.valid && !r.ganda && !r.optOut ? ' checked' : ' disabled') + ' data-chg="audCek"></td><td class="small"><b>' + esc(r.nama) + '</b></td><td class="mono">' + esc(r.hp || '-') + '</td><td class="xs">' + esc(r.segmen) + '</td><td>' + waBadge(r.statusWA) + '</td></tr>'), 'Tidak ada kontak — sinkronkan CRM terlebih dahulu.');
    Inp.pratinjau();
  }
  Act.audCek = () => Inp.pratinjau();
  Act.deteksiWA = async btn => {
    if (!Blast.penerima.length) { toast('Muat penerima terlebih dahulu.', 'warn'); return; }
    const nomor = [...new Set(Blast.penerima.filter(r => r.valid && !r.statusWA).map(r => r.hp))];
    if (!nomor.length) { toast('Semua nomor sudah dicek.', 'ok'); return; }
    await busy(btn, async () => {
      for (let i = 0; i < nomor.length; i += 50) {
        btn.innerHTML = '<span class="spin dark"></span> Mengecek ' + Math.min(i + 50, nomor.length) + '/' + nomor.length;
        const r = await api('wa.validate', { nomor: nomor.slice(i, i + 50) }, { langsung: true });
        if (!r.success) { toast(r.message, 'bad'); break; }
        Blast.penerima.forEach(p => { if (r.data.hasil[p.hp]) p.statusWA = r.data.hasil[p.hp]; });
      }
    });
    gambarAudiens();
  };
  Act.mulaiBlast = async btn => {
    const pen = penerimaAktif(), pesan = $('blast-pesan').value.trim();
    if (!pen.length) { toast('Belum ada penerima valid.', 'warn'); return; }
    if (pesan.length < 5) { toast('Isi pesan terlebih dahulu.', 'warn'); return; }
    const n = +document.querySelector('#seg-batch .on').dataset.n;
    if (!(await konfirmasi('Kirim blast ke <b>' + pen.length + ' nomor</b> (batch ' + n + ', jeda ' + esc($('blast-jeda').value) + ' dtk)?', { ok: 'Mulai Blast' }))) return;
    const r = await simpan(btn, 'wa.blastCreate', { judul: document.querySelector('#nt-blast [name=judul]').value, pesan, ukuranBatch: n, jeda: $('blast-jeda').value, sasaran: document.querySelector('#nt-blast [name=segmen]').value || 'CRM', penerima: pen.map(p => ({ hp: p.hp, nama: p.nama, kelas: p.kelas, nis: p.nis })) }, { reload: false });
    if (r && r.success) { sessionStorage.removeItem('blast_ids'); renderBlast(); }
  };
  Act.prosesBlast = async (btn, auto) => {
    const r = await (auto ? api('wa.blastProcess', { blastId: btn.dataset.id }, { silent: true }) : busy(btn, () => api('wa.blastProcess', { blastId: btn.dataset.id })));
    if (r && r.success && $('blast-list')) $('blast-list').innerHTML = daftarBlast(r.data); else if (r && !r.success) toast(r.message, 'bad');
  };
  Act.stopBlast = async btn => { if (await konfirmasi('Hentikan blast? Pesan yang belum terkirim dibatalkan.', { danger: true, ok: 'Hentikan' })) { const r = await simpan(btn, 'wa.blastStop', { blastId: btn.dataset.id }, { reload: false }); if (r && r.success) renderBlast(); } };

  async function renderAntrean() {
    const el = $('nt-antrean'); if (!el) return;
    const r = await api('notif.queue', {}); if (!r.success) { el.innerHTML = '<div class="card empty">' + esc(r.message) + '</div>'; return; }
    const g = r.data.ringkas;
    el.innerHTML = '<div class="grid g4 keep2">' + [['Menunggu', g.Antri, 'amber', 'schedule'], ['Terkirim', g.Terkirim, 'teal', 'done_all'], ['Gagal', g.Gagal, 'rose', 'error'], ['Dibatalkan', g.Batal, 'indigo', 'block']].map(x => '<div class="card stat"><div class="stat-top"><span class="stat-lbl">' + x[0] + '</span><span class="ic ' + x[2] + '">' + ic(x[3]) + '</span></div><div class="stat-val">' + (x[1] || 0) + '</div></div>').join('') + '</div>' +
      '<div class="toolbar mt"><button class="btn" data-act="prosesAntrean">' + ic('send') + 'Proses Sekarang</button><button class="btn ghost" data-act="ulangGagal">' + ic('replay') + 'Ulangi yang Gagal</button></div>' +
      tblWrap(['Waktu', 'Kanal', 'Tujuan', 'Event', 'Pesan', 'Status'], r.data.rows.map(a => '<tr><td class="small">' + esc(fmtWaktu(a.DikirimPada || a.DibuatPada)) + '</td><td>' + pill(a.Kanal, a.Kanal === 'WA' ? 'ok' : 'info') + '</td><td class="mono small">' + esc(a.Tujuan) + '<div class="xs muted">' + esc(a.NamaPenerima) + '</div></td><td class="xs">' + esc(a.Event) + '</td><td class="xs muted" style="max-width:320px">' + esc(a.Pesan) + '</td><td>' + pillStatus(a.Status) + (a.Respon ? '<div class="xs muted">' + esc(a.Respon) + '</div>' : '') + '</td></tr>'), 'Antrean kosong.');
  }
  Act.prosesAntrean = async btn => { const r = await busy(btn, () => api('notif.processNow', {})); if (r) { toast(r.success ? 'Terkirim ' + (r.data.terkirim || 0) + ', gagal ' + (r.data.gagal || 0) + '.' : r.message, r.success ? 'ok' : 'bad'); renderAntrean(); } };
  Act.ulangGagal = async btn => { const r = await simpan(btn, 'notif.retry', {}, { reload: false }); if (r && r.success) renderAntrean(); };

  async function renderKonfig() {
    const el = $('nt-konfigurasi'); if (!el) return;
    const r = await api('notif.config', {}); if (!r.success) { el.innerHTML = '<div class="card empty">' + esc(r.message) + '</div>'; return; }
    const c = r.data, sw = (id, on, dis) => '<label class="switch"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + (dis ? ' disabled' : '') + '><span></span></label>';
    el.innerHTML = '<div class="grid g2"><div class="card"><div class="row between"><div class="row"><span class="ic teal">' + ic('chat') + '</span><div><h3>WhatsApp (Fonnte)</h3><div class="small muted">' + (c.waAktif ? 'AKTIF' : 'NONAKTIF') + '</div></div></div>' + sw('k-wa', c.waAktif) + '</div>' +
      '<div class="field mt"><label>Token Fonnte ' + (c.tokenAda ? pill('Tersimpan', 'ok') : pill('Kosong', 'mute')) + '</label><input class="input" type="password" id="k-token" autocomplete="off" placeholder="' + esc(c.token || 'Tempel token dari fonnte.com → Device') + '"><div class="help">Disimpan di Script Properties, tidak pernah ditampilkan utuh. Ketik <code>__HAPUS__</code> untuk menghapus.</div></div>' +
      '<div class="actions"><button class="btn sec sm" data-act="cekDevice">' + ic('router') + 'Cek Perangkat</button><button class="btn ghost sm" data-act="tesWA">' + ic('send') + 'Kirim Tes WA</button></div><div id="k-dev" class="small mt-s"></div>' +
      '<div class="form-grid mt"><div class="field"><label>Batch default</label><select class="input" id="k-batch">' + [10, 20, 50].map(n => '<option' + (n === c.batchDefault ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></div><div class="field"><label>Jeda antarpesan (detik)</label><input class="input" id="k-jeda" value="' + esc(c.jeda) + '"></div></div>' +
      '<div class="row between"><span class="small b">Deteksi otomatis nomor WA kontak baru</span>' + sw('k-det', c.deteksiOtomatis) + '</div></div>' +
      '<div class="card"><div class="row between"><div class="row"><span class="ic indigo">' + ic('mail') + '</span><div><h3>Email (Gmail)</h3><div class="small muted">Sisa kuota hari ini: ' + (c.kuotaEmail == null ? '-' : c.kuotaEmail) + '</div></div></div>' + sw('k-em', c.emailAktif) + '</div>' +
      '<div class="field mt"><label>Nama pengirim</label><input class="input" id="k-nama" value="' + esc(c.namaPengirim) + '"></div><div class="field"><label>URL aplikasi (untuk {link})</label><input class="input" id="k-url" value="' + esc(c.appUrl) + '" placeholder="' + esc(location.href.replace(/#.*$/, '')) + '"></div>' +
      '<div class="actions"><button class="btn ghost sm" data-act="tesEmail">' + ic('forward_to_inbox') + 'Kirim Tes Email</button></div><div class="small mt">Trigger antrean: ' + (c.trigger ? pill('Aktif (1 menit)', 'ok') : pill('Belum terpasang — simpan konfigurasi', 'bad')) + '</div></div></div>' +
      '<div class="card mt"><div class="card-h"><h3 class="grow">Matriks Notifikasi Otomatis</h3><span class="small muted">Event × kanal · klik ✎ untuk mengubah isi pesan</span></div>' +
      tblWrap(['Kejadian', 'WhatsApp', 'Email', ''], Object.values(c.matriks).map(m => '<tr data-ev="' + m.kode + '"><td><b class="small">' + esc(m.label) + '</b><div class="xs muted mono">' + m.kode + '</div><div class="ev-edit hidden mt-s"><input class="input" data-f="subjek" value="' + esc(m.subjek) + '" placeholder="Subjek email"><textarea class="input mt-s" data-f="pesan" rows="4">' + esc(m.pesan) + '</textarea><div class="xs muted mt-s">Variabel: {nama} {institusi} {link} + khusus event (lihat pesan bawaan). <button class="link-btn xs" data-act="bawaanEv" data-ev="' + m.kode + '">↺ Kembalikan bawaan</button></div></div></td>' +
        '<td>' + sw('ev-wa-' + m.kode, m.wa, !c.waAktif) + '</td><td>' + sw('ev-em-' + m.kode, m.email, !c.emailAktif) + '</td><td class="right"><button class="btn ghost xs" data-act="ubahEv">' + ic('edit') + '</button></td></tr>'), '') +
      '<div class="row mt" style="justify-content:flex-end"><button class="btn lg" data-act="simpanKonfig">' + ic('save') + 'Simpan Konfigurasi</button></div></div>';
    el._cfg = c;
  }
  Act.ubahEv = el => el.closest('tr').querySelector('.ev-edit').classList.toggle('hidden');
  Act.bawaanEv = el => { const m = $('nt-konfigurasi')._cfg.matriks[el.dataset.ev], tr = el.closest('tr'); tr.querySelector('[data-f=subjek]').value = m.subjekDefault; tr.querySelector('[data-f=pesan]').value = m.pesanDefault; };
  Act.simpanKonfig = async btn => {
    const matriks = {}; document.querySelectorAll('#nt-konfigurasi tr[data-ev]').forEach(tr => { const k = tr.dataset.ev; matriks[k] = { wa: $('ev-wa-' + k).checked, email: $('ev-em-' + k).checked, subjek: tr.querySelector('[data-f=subjek]').value, pesan: tr.querySelector('[data-f=pesan]').value }; });
    const r = await simpan(btn, 'notif.configSave', { waAktif: $('k-wa').checked, emailAktif: $('k-em').checked, token: $('k-token').value.trim(), batchDefault: +$('k-batch').value, jeda: $('k-jeda').value.trim(), deteksiOtomatis: $('k-det').checked, namaPengirim: $('k-nama').value, appUrl: $('k-url').value.trim(), matriks }, { reload: false });
    if (r && r.success) { await S.load({ silent: true }); renderKonfig(); }
  };
  Act.cekDevice = async btn => { const r = await busy(btn, () => api('wa.device', {})); $('k-dev').innerHTML = r.success ? pill((r.data.device || '-') + ' · ' + (r.data.device_status || '') + ' · paket ' + (r.data.package || '-') + ' · kuota ' + (r.data.quota || '-'), r.data.device_status === 'connect' ? 'ok' : 'warn') : pill(r.message, 'bad'); };
  Act.tesWA = btn => { const n = prompt('Nomor WhatsApp tujuan tes (08…):'); if (n) busy(btn, async () => { const r = await api('wa.test', { nomor: n }); toast(r.message, r.success ? 'ok' : 'bad'); }); };
  Act.tesEmail = btn => { const e = prompt('Alamat email tujuan tes:'); if (e) busy(btn, async () => { const r = await api('email.test', { email: e }); toast(r.message, r.success ? 'ok' : 'bad'); }); };

  /* =====================================================================
   * CRM KONTAK
   * ===================================================================*/
  const Crm = { f: { halaman: 1, per: 50 }, rows: [], pilih: new Set() };
  Pages['ADMIN:crm'] = {
    render() {
      return head(ic('contacts') + ' Komunikasi', 'CRM Kontak', 'Satu layar untuk memantau Nama · Email · WhatsApp seluruh siswa, wali, guru, instruktur, dan mitra DUDI — lalu langsung dipakai untuk blast.',
        '<button class="btn ghost" data-act="crmTemplate">' + ic('download') + 'Template CSV</button><label class="btn ghost" style="cursor:pointer">' + ic('upload') + 'Import CSV/Excel<input type="file" accept=".csv,.xlsx,.xls" hidden data-chg="crmImport"></label><button class="btn" data-act="crmSync">' + ic('sync') + 'Sinkron Sekarang</button>') +
        box('crm-kpi', '<div class="grid g3"><div class="skel" style="height:90px"></div><div class="skel" style="height:90px"></div><div class="skel" style="height:90px"></div></div>') +
        '<div class="card mt"><div class="toolbar"><label class="search">' + ic('search') + '<input type="search" placeholder="Cari nama, email, nomor…" data-inp="crmCari" value="' + esc(Crm.f.cari || '') + '"></label>' +
        '<select class="input" data-chg="crmFilter" data-k="statusWA"><option value="">Status WA: semua</option><option value="Terdaftar">Terdaftar WA</option><option value="Tidak Terdaftar">Bukan WA</option><option value="belum">Belum dicek</option></select>' +
        '<select class="input" data-chg="crmFilter" data-k="optOut"><option value="">Opt-out: semua</option><option value="YA">Opt-out</option><option value="TIDAK">Bersedia</option></select>' +
        '<label class="check small"><input type="checkbox" data-chg="crmFilter" data-k="duplikat"> Hanya duplikat</label></div><div id="crm-seg" class="row wrap mb"></div>' +
        '<div id="crm-bulk" class="alert hidden mb"></div>' + box('crm-tbl') + '</div>';
    },
    after() { muatCrm(true); }
  };
  async function muatCrm(kpi) {
    if (kpi) api('crm.stats', {}).then(r => {
      const el = $('crm-kpi'); if (!el || !r.success) return; const s = r.data;
      el.innerHTML = '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">' + [['Total Kontak', s.total, 'contacts', 'teal', ''], ['WA Terverifikasi', s.terdaftarWA, 'verified', 'teal', 'statusWA=Terdaftar'], ['Email Valid', s.emailValid, 'mark_email_read', 'indigo', 'emailValid=YA'], ['Belum Dicek WA', s.belumCek, 'help', 'amber', 'statusWA=belum'], ['Opt-out', s.optOut, 'block', 'rose', 'optOut=YA'], ['Duplikat', s.duplikat, 'content_copy', 'rose', 'duplikat=1']]
        .map(k => '<button class="card stat" style="text-align:left;cursor:pointer" data-act="crmKpi" data-f="' + k[4] + '"><div class="stat-top"><span class="stat-lbl">' + k[0] + '</span><span class="ic ' + k[3] + '">' + ic(k[2]) + '</span></div><div class="stat-val">' + k[1] + '</div></button>').join('') + '</div>';
      $('crm-seg').innerHTML = '<button class="tag" style="border:0;cursor:pointer;' + (!Crm.f.segmen ? 'background:var(--teal);color:#fff' : '') + '" data-act="crmSeg" data-s="">Semua ' + s.total + '</button>' + Object.keys(s.segmen).map(k => '<button class="tag" style="border:0;cursor:pointer;' + (Crm.f.segmen === k ? 'background:var(--teal);color:#fff' : '') + '" data-act="crmSeg" data-s="' + esc(k) + '">' + esc(k) + ' ' + s.segmen[k] + '</button>').join('');
    });
    const r = await api('crm.list', Crm.f), el = $('crm-tbl'); if (!el) return;
    if (!r.success) { el.innerHTML = '<div class="empty">' + esc(r.message) + '</div>'; return; }
    Crm.rows = r.data.rows;
    const hal = Math.ceil(r.data.total / r.data.per) || 1;
    el.innerHTML = tblWrap(['', 'Kontak', 'Email', 'WhatsApp', 'Tag', 'Terakhir dihubungi', '#Pesan', ''], Crm.rows.map(k => {
      const masalah = !k.NoWA || k.EmailValid === 'TIDAK' || k.duplikat, wa = waLink(k.NoWA);
      return '<tr class="' + (masalah ? 'warn-row' : '') + '"><td><input type="checkbox" data-crm="' + esc(k.KontakID) + '" data-chg="crmPilih"' + (Crm.pilih.has(k.KontakID) ? ' checked' : '') + '></td><td><div class="who">' + av(k.Nama, '', 'av-xs') + '<div><div class="n">' + esc(k.Nama) + '</div><div class="s">' + pill(k.Segmen, 'info') + (k.duplikat ? ' ' + pill('duplikat', 'warn') : '') + (k.OptOut === 'YA' ? ' ' + pill('opt-out', 'mute') : '') + '</div></div></div></td>' +
        '<td class="small">' + (k.Email ? esc(k.Email) + ' ' + (k.EmailValid === 'YA' ? ic('check', '') : ic('warning', '')) : '<span class="muted">-</span>') + '</td><td><span class="mono">' + esc(k.NoWA || '-') + '</span> ' + waBadge(k.StatusWA) + (wa ? ' <a href="' + esc(wa) + '" target="_blank" rel="noopener" title="wa.me">' + ic('open_in_new') + '</a>' : '') + '</td>' +
        '<td>' + String(k.Tag || '').split(',').filter(Boolean).map(t => '<span class="tag">' + esc(t) + '</span>').join('') + '</td><td class="small">' + esc(k.TerakhirDihubungi ? fmtWaktu(k.TerakhirDihubungi) : '-') + '</td><td class="num">' + esc(k.JumlahPesan || 0) + '</td>' +
        '<td class="right"><button class="btn ghost xs" data-act="crmDetail" data-id="' + esc(k.KontakID) + '">Detail</button></td></tr>';
    }), 'Belum ada kontak. Tekan "Sinkron Sekarang".') +
      '<div class="pager"><span>Menampilkan ' + Crm.rows.length + ' dari ' + r.data.total + ' kontak · sinkron terakhir ' + (r.data.syncTerakhir ? fmtWaktu(new Date(r.data.syncTerakhir).toISOString()) : '-') + '</span><div class="row"><button class="btn ghost xs" data-act="crmHal" data-d="-1"' + (Crm.f.halaman <= 1 ? ' disabled' : '') + '>' + ic('chevron_left') + '</button><span>Hal. ' + Crm.f.halaman + ' / ' + hal + '</span><button class="btn ghost xs" data-act="crmHal" data-d="1"' + (Crm.f.halaman >= hal ? ' disabled' : '') + '>' + ic('chevron_right') + '</button></div></div>';
    gambarBulk();
  }
  function gambarBulk() {
    const b = $('crm-bulk'); if (!b) return;
    b.classList.toggle('hidden', !Crm.pilih.size);
    b.innerHTML = '<b>' + Crm.pilih.size + ' kontak dipilih</b><div class="actions" style="margin-left:auto"><button class="btn sm" data-act="crmBlast">' + ic('campaign') + 'Blast ke terpilih</button><button class="btn sec sm" data-act="crmDeteksi">' + ic('verified_user') + 'Deteksi WA</button><button class="btn ghost sm" data-act="crmBulk" data-a="tag">' + ic('sell') + 'Beri tag</button><button class="btn ghost sm" data-act="crmBulk" data-a="optout">' + ic('block') + 'Opt-out</button><button class="btn ghost sm" data-act="crmBulk" data-a="optin">Opt-in</button><button class="btn ghost sm" data-act="crmEkspor">' + ic('download') + 'Ekspor</button><button class="btn ghost sm" data-act="crmMerge">' + ic('merge') + 'Gabungkan</button></div>';
  }
  let _crmT = null;
  Inp.crmCari = el => { clearTimeout(_crmT); _crmT = setTimeout(() => { Crm.f.cari = el.value; Crm.f.halaman = 1; muatCrm(); }, 350); };
  Act.crmFilter = el => { Crm.f[el.dataset.k] = el.type === 'checkbox' ? (el.checked ? 1 : '') : el.value; Crm.f.halaman = 1; muatCrm(); };
  Act.crmSeg = el => { Crm.f.segmen = el.dataset.s; Crm.f.halaman = 1; muatCrm(true); };
  Act.crmKpi = el => { Crm.f = { halaman: 1, per: 50 }; if (el.dataset.f) { const [k, v] = el.dataset.f.split('='); Crm.f[k] = v; } App.render(); };
  Act.crmHal = el => { Crm.f.halaman += +el.dataset.d; muatCrm(); };
  Act.crmPilih = el => { el.checked ? Crm.pilih.add(el.dataset.crm) : Crm.pilih.delete(el.dataset.crm); gambarBulk(); };
  Act.crmSync = btn => busy(btn, async () => { const r = await api('crm.sync', {}); toast(r.message, r.success ? 'ok' : 'bad'); muatCrm(true); });
  Act.crmBlast = () => { sessionStorage.setItem('blast_ids', JSON.stringify([...Crm.pilih])); App.go('#/notifikasi/blast'); };
  Act.crmDeteksi = btn => busy(btn, async () => { const nomor = Crm.rows.filter(k => Crm.pilih.has(k.KontakID)).map(k => k.NoWA).filter(Boolean); if (!nomor.length) { toast('Kontak terpilih tidak punya nomor (di halaman ini).', 'warn'); return; } for (let i = 0; i < nomor.length; i += 50) { const r = await api('wa.validate', { nomor: nomor.slice(i, i + 50) }, { langsung: true }); if (!r.success) { toast(r.message, 'bad'); return; } } toast('Deteksi WA selesai.', 'ok'); muatCrm(true); });
  Act.crmBulk = async btn => { let nilai = ''; if (btn.dataset.a === 'tag') { nilai = prompt('Nama tag:'); if (!nilai) return; } const r = await busy(btn, () => api('crm.bulk', { ids: [...Crm.pilih], aksi: btn.dataset.a, nilai })); if (r) { toast(r.message, r.success ? 'ok' : 'bad'); muatCrm(true); } };
  Act.crmEkspor = btn => busy(btn, async () => { const r = await api('crm.export', { ids: [...Crm.pilih] }); if (!r.success) { toast(r.message, 'bad'); return; } const rows = r.data.filter((x, i) => Crm.pilih.size ? true : true); eksporXlsx({ Kontak: rows }, 'CRM Kontak SIGAPKL'); });
  Act.crmMerge = async btn => { const ids = [...Crm.pilih]; if (ids.length < 2) { toast('Pilih minimal 2 kontak.', 'warn'); return; } const utama = Crm.rows.find(k => k.KontakID === ids[0]); if (!(await konfirmasi('Gabungkan ' + (ids.length - 1) + ' kontak ke <b>' + esc(utama ? utama.Nama : ids[0]) + '</b>?', { ok: 'Gabungkan' }))) return; const r = await busy(btn, () => api('crm.merge', { utama: ids[0], gabung: ids.slice(1) })); toast(r.message, r.success ? 'ok' : 'bad'); Crm.pilih.clear(); muatCrm(true); };
  Act.crmTemplate = () => eksporXlsx({ Kontak: [{ nama: 'Contoh Nama', email: 'contoh@email.com', wa: '081234567890', segmen: 'Calon Mitra', tag: 'seminar' }] }, 'Template Import CRM');
  Act.crmImport = async el => { const f = el.files[0]; if (!f) return; try { const rows = (await bacaBerkasTabel(f)).map(r => { const o = {}; Object.keys(r).forEach(k => (o[k.toLowerCase().trim()] = r[k])); return o; }); const r = await api('crm.import', { rows }); toast(r.message, r.success ? 'ok' : 'bad'); muatCrm(true); } catch (e) { toast('Gagal membaca berkas: ' + e.message, 'bad'); } el.value = ''; };
  Act.crmDetail = async el => {
    const r = await api('crm.detail', { kontakId: el.dataset.id }); if (!r.success) { toast(r.message, 'bad'); return; }
    const k = r.data.kontak;
    const m = modal({ title: k.Nama, icon: 'contact_page', size: 'lg', body: '<div class="row wrap mb">' + pill(k.Segmen, 'info') + waBadge(k.StatusWA) + (k.NoWA ? '<a class="btn sec sm" target="_blank" rel="noopener" href="' + esc(waLink(k.NoWA)) + '">' + ic('chat') + 'WhatsApp</a>' : '') + (k.Email ? '<a class="btn ghost sm" href="mailto:' + esc(k.Email) + '">' + ic('mail') + 'Email</a>' : '') + '</div>' +
      '<form id="crm-f" class="form-grid">' + fld({ name: 'NoWA', label: 'WhatsApp', value: k.NoWA }) + fld({ name: 'Email', label: 'Email', value: k.Email }) + fld({ name: 'Tag', label: 'Tag (pisah koma)', value: k.Tag }) + fld({ name: 'OptOut', label: 'Opt-out blast', type: 'select', options: ['TIDAK', 'YA'], value: k.OptOut, kosong: false }) +
      fld({ name: 'Catatan', label: 'Catatan', type: 'textarea', full: true, value: k.Catatan }) + '</form><div class="xs muted">' + (k.Sumber !== 'manual' ? 'Perubahan nomor/email ditulis balik ke data sumber (' + esc(k.Sumber) + ').' : 'Kontak manual.') + '</div>' +
      '<h4 class="mt">Catat interaksi</h4><div class="row wrap mt-s"><select class="input" id="int-k" style="width:auto"><option>Telepon</option><option>WA Manual</option><option>Kunjungan</option><option>Catatan</option></select><input class="input grow" id="int-r" placeholder="Ringkasan…"><button class="btn sec sm" data-int>Catat</button></div>' +
      '<h4 class="mt">Timeline</h4><div class="list mt-s">' + (r.data.timeline.map(t => '<div class="li"><span class="ic ' + (t.jenis === 'manual' ? 'indigo' : t.jenis === 'Terkirim' ? 'teal' : 'amber') + '">' + ic(t.kanal === 'EMAIL' ? 'mail' : t.kanal === 'WA' ? 'chat' : 'edit_note') + '</span><div class="grow"><div class="small">' + esc(t.ringkasan) + '</div><div class="xs muted">' + esc(fmtWaktu(t.waktu)) + ' · ' + esc(t.oleh) + ' · ' + esc(t.jenis) + '</div></div></div>').join('') || '<div class="empty small">Belum ada interaksi.</div>') + '</div>',
      foot: '<button class="btn ghost" data-x>Tutup</button><button class="btn" data-save>' + ic('save') + 'Simpan</button>' });
    m.el.querySelector('[data-save]').onclick = async e => { const d = bacaForm(m.el.querySelector('#crm-f')); const x = await busy(e.currentTarget, () => api('crm.save', Object.assign(d, { KontakID: k.KontakID }))); toast(x.message, x.success ? 'ok' : 'bad'); if (x.success) { m.close(); muatCrm(); } };
    m.el.querySelector('[data-int]').onclick = async e => { const x = await busy(e.currentTarget, () => api('crm.interaksi', { kontakId: k.KontakID, kanal: m.el.querySelector('#int-k').value, ringkasan: m.el.querySelector('#int-r').value })); toast(x.message, x.success ? 'ok' : 'bad'); if (x.success) { m.close(); Act.crmDetail(el); } };
  };

  /* =====================================================================
   * IMPORT & MIGRASI
   * ===================================================================*/
  Pages['ADMIN:migrasi'] = {
    render(param) {
      const t = ['app', 'ejurnal', 'import'].indexOf(param) > -1 ? param : 'ejurnal';
      let isi;
      if (t === 'ejurnal') isi = '<div class="card"><div class="card-h"><span class="ic indigo">' + ic('sync') + '</span><div class="grow"><h3>Sinkron Data Induk dari E-Jurnal Guru TKJ</h3><div class="sub">Membaca sheet Siswa/Guru di spreadsheet E-Jurnal (HANYA BACA), lalu menyalin ke SIGAPKL. Kolom diatur di Pengaturan → EJ_PETA.</div></div></div>' +
        '<div class="alert mb">' + ic('info') + '<div><h4>Prasyarat</h4><p>Isi <b>ID Spreadsheet E-Jurnal</b> di Pengaturan → Keamanan & Integrasi. Spreadsheet harus bisa dibuka oleh akun pemilik Apps Script SIGAPKL. Filter kelas: <b>' + esc(P('EJ_FILTER_KELAS') || '(semua)') + '</b>.</p></div></div>' +
        '<div class="actions"><button class="btn sec" data-act="ejPindai">' + ic('search') + 'Pindai (tanpa menulis)</button><button class="btn" data-act="ejSinkron">' + ic('sync') + 'Jalankan Sinkron</button></div>' + box('mg-hasil', '') + '</div>';
      if (t === 'app') isi = '<div class="card"><div class="card-h"><span class="ic amber">' + ic('move_up') + '</span><div class="grow"><h3>Migrasi dari SIGAPKL Lama / App PKL Lain</h3><div class="sub">Sumber hanya dibaca · dibaca berdasarkan NAMA kolom · aman diulang (idempoten) · jalankan sekali lagi sebelum pindah (delta sync).</div></div></div>' +
        fld({ name: 'sumber', label: 'URL / ID spreadsheet sumber', req: true, ph: 'https://docs.google.com/spreadsheets/d/…' }) +
        '<div class="lbl">Data yang diimpor</div><div class="row wrap mt-s mb" id="mg-sheets">' + ['DUDI', 'Siswa', 'Guru', 'Instruktur', 'Penempatan', 'Absensi', 'Bimbingan', 'Presentasi', 'JurnalLink', 'Instrumen', 'Nilai', 'KunciNilai', 'Peringatan', 'PesanDarurat', 'Users', 'LogAktivitas'].map(s => '<label class="check small" style="min-width:140px"><input type="checkbox" value="' + s + '"' + (s === 'LogAktivitas' ? '' : ' checked') + '> ' + s + '</label>').join('') + '</div>' +
        '<label class="check small mb"><input type="checkbox" id="mg-timpa"> Timpa data yang sudah ada (bawaan: tidak)</label><div class="actions mt"><button class="btn sec" data-act="mgJalan" data-dry="1">' + ic('search') + 'Pindai (Dry-run)</button><button class="btn" data-act="mgJalan" data-dry="0">' + ic('play_arrow') + 'Jalankan Import</button></div>' + box('mg-hasil', '') +
        '<div class="alert warn mt">' + ic('info') + '<div><h4>Batasan</h4><p>Sesi login tidak ikut pindah (pengguna cukup login ulang). Akun ADMIN lama tidak diimpor. Gunakan akun Google yang sama agar tautan Drive tetap terbaca.</p></div></div></div>';
      if (t === 'import') isi = '<div class="card"><div class="card-h"><span class="ic teal">' + ic('upload_file') + '</span><div class="grow"><h3>Import dari Excel / CSV</h3><div class="sub">Kolom dicocokkan berdasarkan nama (mis. "Nama Siswa", "No HP", "Nama Perusahaan"). Nomor HP dinormalisasi otomatis ke 08….</div></div></div>' +
        '<div class="form-grid">' + fld({ name: 'target', label: 'Jenis data', type: 'select', options: ['Siswa', 'Guru', 'Instruktur', 'DUDI'], value: 'Siswa', kosong: false }) + '<div class="field"><label>Berkas (.xlsx / .csv)</label><input class="input" type="file" id="imp-file" accept=".xlsx,.xls,.csv"></div></div>' +
        '<label class="check small"><input type="checkbox" id="imp-timpa"> Perbarui data yang sudah ada</label><div class="actions mt"><button class="btn ghost" data-act="impTemplate">' + ic('download') + 'Unduh Template</button><button class="btn sec" data-act="impJalan" data-dry="1">' + ic('preview') + 'Pratinjau</button><button class="btn" data-act="impJalan" data-dry="0">' + ic('upload') + 'Import</button></div>' + box('mg-hasil', '') + '</div>';
      return head(ic('sync_alt') + ' Sistem', 'Import & Migrasi Data', 'Sinkron E-Jurnal, migrasi dari aplikasi lama, dan import Excel/CSV — semua dengan pratinjau sebelum menulis.') +
        tabs(t, [['ejurnal', 'Sinkron E-Jurnal', 'sync'], ['import', 'Import Excel/CSV', 'upload_file'], ['app', 'Migrasi App Lama', 'move_up']], 'migrasi') + isi;
    }
  };
  function tabelLaporan(r) {
    const lap = r.data.laporan || {};
    const isi = typeof lap.sumber === 'number' ? { Data: lap } : lap;
    $('mg-hasil').innerHTML = '<div class="alert ' + (r.data.dryRun ? 'warn' : '') + ' mt">' + ic(r.data.dryRun ? 'preview' : 'task_alt') + '<div><h4>' + esc(r.message) + '</h4>' + (r.data.sumber && r.data.sumber.nama ? '<p class="small">Sumber: ' + esc(r.data.sumber.nama || r.data.sumber) + '</p>' : r.data.sumber ? '<p class="small">Sumber: ' + esc(r.data.sumber) + '</p>' : '') + '</div></div>' +
      '<div class="mt">' + tblWrap(['Data', '#Di sumber', '#Ditambah', '#Diperbarui', '#Dilewati', 'Catatan'], Object.keys(isi).map(k => '<tr><td><b>' + esc(k) + '</b></td><td class="num">' + (isi[k].sumber || 0) + '</td><td class="num">' + (isi[k].ditambah || 0) + '</td><td class="num">' + (isi[k].diperbarui || 0) + '</td><td class="num">' + (isi[k].dilewati || 0) + '</td><td class="xs muted">' + esc(isi[k].catatan || '') + '</td></tr>')) + '</div>' +
      ((r.data.peringatan || []).length ? '<div class="alert warn mt">' + ic('warning') + '<div><h4>Peringatan</h4><p>' + r.data.peringatan.map(esc).join('<br>') + '</p></div></div>' : '');
  }
  Act.ejPindai = btn => busy(btn, async () => { const r = await api('ejurnal.pindai', {}); if (!r.success) return toast(r.message, 'bad'); tabelLaporan(r); });
  Act.ejSinkron = async btn => { if (!(await konfirmasi('Jalankan sinkron data induk dari E-Jurnal? Data di E-Jurnal tidak akan diubah.', { ok: 'Sinkron' }))) return; const r = await simpan(btn, 'ejurnal.sinkron', {}); if (r && r.success) tabelLaporan(r); };
  Act.mgJalan = async btn => {
    const sumber = document.querySelector('[name=sumber]').value.trim(), sheets = [...document.querySelectorAll('#mg-sheets input:checked')].map(c => c.value), dry = btn.dataset.dry === '1';
    if (!sumber) { toast('Tempel URL spreadsheet sumber.', 'warn'); return; }
    if (!dry && !(await konfirmasi('Jalankan import ' + sheets.length + ' jenis data? Aman diulang — data yang sama tidak digandakan.', { ok: 'Jalankan' }))) return;
    const d = { sumber, sheets, timpa: $('mg-timpa').checked };
    const r = dry ? await busy(btn, () => api('migrasi.pindai', d)) : await simpan(btn, 'migrasi.jalankan', d);
    if (r && r.success) tabelLaporan(r); else if (r && dry) toast(r.message, 'bad');
  };
  const TEMPLATE = { Siswa: [{ NIS: '2425001', NISN: '', Nama: 'Ahmad Fauzi', Kelas: 'XII TKJ 1', JK: 'L', NoHP: '081234567890', Email: '', NamaWali: '', NoHPWali: '' }], Guru: [{ NIP: '197804152005011004', Nama: 'Bpk. Haryanto, S.T.', NoHP: '081234567890', Email: '' }],
    Instruktur: [{ Nama: 'Dedy Kurniawan', DUDI: 'PT Jaringan Nusantara', Jabatan: 'NOC Supervisor', NoHP: '081234567890', Email: '' }], DUDI: [{ Nama: 'PT Jaringan Nusantara', Bidang: 'ISP', Alamat: '', Kota: '', Kuota: 4, Pimpinan: '', Telepon: '', Email: '', LinkPeta: '' }] };
  Act.impTemplate = () => { const t = document.querySelector('[name=target]').value; eksporXlsx({ [t]: TEMPLATE[t] }, 'Template Import ' + t); };
  Act.impJalan = async btn => {
    const f = $('imp-file').files[0], target = document.querySelector('[name=target]').value, dry = btn.dataset.dry === '1';
    if (!f) { toast('Pilih berkas Excel/CSV.', 'warn'); return; }
    let rows; try { rows = await bacaBerkasTabel(f); } catch (e) { toast('Gagal membaca berkas: ' + e.message, 'bad'); return; }
    const d = { target, rows, timpa: $('imp-timpa').checked, dryRun: dry };
    const r = await simpan(btn, 'import.csv', d, { reload: !dry, diam: dry });
    if (r && r.success) { tabelLaporan(r); if (dry) $('mg-hasil').insertAdjacentHTML('beforeend', '<div class="mt"><div class="small b mb">Contoh 5 baris pertama:</div>' + tblWrap(Object.keys(rows[0] || {}), rows.slice(0, 5).map(x => '<tr>' + Object.values(x).map(v => '<td class="small">' + esc(v) + '</td>').join('') + '</tr>')) + '</div>'); }
  };

  /* =====================================================================
   * DOC ENGINE
   * ===================================================================*/
  const DE = { tpl: [], pj: [], dok: null };
  Pages['ADMIN:dokumen'] = {
    render(param) {
      const t = ['dokumen', 'buat', 'massal', 'template', 'pejabat', 'ttd'].indexOf(param) > -1 ? param : 'dokumen';
      return head(ic('description') + ' Dokumen', 'Doc Engine — Dokumen Resmi PKL', 'Desain template di Google Docs/Sheets/Slides dengan placeholder {{...}} (mis. {{NAMA}}, {{DUDI}}, {{NILAI_AKHIR}}, {{QR}}, {{TTD_1}}). Data PKL terisi otomatis, persetujuan pejabat memakai PIN, dokumen terbit ber-QR dan dapat diverifikasi publik.') +
        tabs(t, [['dokumen', 'Dokumen', 'folder'], ['buat', 'Buat Dokumen', 'note_add'], ['massal', 'Generate Massal', 'library_add'], ['template', 'Template', 'dashboard_customize'], ['pejabat', 'Pejabat', 'badge'], ['ttd', 'Persetujuan Saya', 'draw']], 'dokumen') + box('de-' + t);
    },
    async after(param) {
      const t = ['dokumen', 'buat', 'massal', 'template', 'pejabat', 'ttd'].indexOf(param) > -1 ? param : 'dokumen';
      if (t === 'ttd') { $('de-ttd').innerHTML = '<div id="ttd-box"></div>'; return Pages['ADMIN:ttd'].after(); }
      const [tp, pj] = await Promise.all([api('de.templateList', {}), api('de.pejabatList', {})]);
      DE.tpl = tp.success ? tp.data : []; DE.pj = pj.success ? pj.data : [];
      ({ dokumen: deDokumen, buat: deBuat, massal: deMassal, template: deTemplate, pejabat: dePejabat })[t]();
    }
  };
  async function deDokumen() {
    const r = await api('de.dokumenList', {}), el = $('de-dokumen'); if (!el) return;
    if (!r.success) { el.innerHTML = '<div class="card empty">' + esc(r.message) + '</div>'; return; }
    DE.dok = r.data.rows;
    el.innerHTML = tblWrap(['Dokumen', 'Nomor', 'Status', 'Penanda tangan', 'Dibuat', ''], DE.dok.map(d => '<tr><td><b>' + esc(d.judul) + '</b><div class="xs muted mono">' + esc(d.kodeVerifikasi) + '</div></td><td class="small">' + esc(d.nomor || '-') + '</td><td>' + pillStatus(d.status) + '</td>' +
      '<td class="xs">' + d.penandatangan.map(s => esc(s.label) + ': ' + (s.status === 'SETUJU' ? '✓ ' + esc(s.metode || '') : s.wajibSetuju ? '…' : 'otomatis')).join('<br>') + '</td><td class="small">' + esc(fmtWaktu(d.dibuat)) + '<div class="xs muted">' + esc(d.oleh) + '</div></td>' +
      '<td class="right" style="white-space:nowrap">' + (d.status === 'DRAF' ? '<button class="btn sm" data-act="deAjukan" data-id="' + esc(d.id) + '" data-kode="' + esc(d.kodeVerifikasi) + '">' + ic('send') + 'Ajukan / Terbitkan</button>' : '') +
      (d.status === 'TERBIT' ? '<button class="btn sec xs" data-act="unduhDok" data-id="' + esc(d.id) + '">' + ic('download') + 'PDF</button> <a class="btn ghost xs" href="#/v/' + esc(d.kodeVerifikasi) + '" target="_blank">' + ic('qr_code') + '</a> <button class="btn danger-o xs" data-act="deTarik" data-id="' + esc(d.id) + '">Tarik</button>' : '') + '</td></tr>'), 'Belum ada dokumen. Buat template terlebih dahulu.');
  }
  Act.deAjukan = async btn => {
    const qr = await qrDataUrl((P('APP_URL') || location.href.replace(/#.*$/, '')).replace(/\/$/, '') + '/#/v/' + btn.dataset.kode, 6);
    const r = await simpan(btn, 'de.ajukan', { id: btn.dataset.id, qr }, { reload: false }); if (r && r.success) deDokumen();
  };
  Act.deTarik = el => formModal({ title: 'Tarik Dokumen', icon: 'block', action: 'de.tarik', size: 'sm', reload: false, ok: 'Tarik Dokumen', fields: [{ name: 'alasan', label: 'Alasan penarikan', type: 'textarea', req: true, full: true }], olah: d => Object.assign(d, { id: el.dataset.id }), sesudah: deDokumen });
  function formIsian(b) {
    if (b.tipe === 'daftar') return '<div class="field full"><label>' + esc(b.label) + '</label><textarea class="input" name="' + esc(b.kunci) + '" data-daftar="' + esc((b.kolom || []).map(k => k.kunci).join(',')) + '" rows="3" placeholder="Satu baris per item; kolom dipisah | (' + esc((b.kolom || []).map(k => k.kunci).join(' | ')) + ')"></textarea></div>';
    return fld({ name: b.kunci, label: b.label, req: b.wajib, full: b.tipe === 'area' || b.tipe === 'naskah', type: b.tipe === 'tanggal' ? 'date' : b.tipe === 'angka' ? 'number' : b.tipe === 'area' || b.tipe === 'naskah' ? 'textarea' : b.tipe === 'pilihan' ? 'select' : 'text', options: b.opsi, help: b.bantu });
  }
  function deBuat() {
    const el = $('de-buat'), aktif = DE.tpl.filter(t => t.aktif === 'YA');
    if (!aktif.length) { el.innerHTML = '<div class="card empty">' + ic('dashboard_customize') + 'Belum ada template aktif. Tambahkan di tab Template.</div>'; return; }
    el.innerHTML = '<div class="card"><div class="form-grid">' + fld({ name: 'kode', label: 'Template', type: 'select', req: true, options: aktif.map(t => ({ v: t.kode, l: t.nama + ' (' + t.engine + ')' })), value: aktif[0].kode }) +
      fld({ name: 'nis', label: 'Siswa (data PKL terisi otomatis)', type: 'select', options: S.data.siswa.map(s => ({ v: s.NIS, l: s.Nama + ' · ' + s.NIS })), ph: '— Tanpa siswa —' }) + '</div><div id="de-isian"></div>' +
      '<div class="actions mt"><button class="btn sec" data-act="deSimpanDraf" data-ajukan="0">' + ic('save') + 'Simpan Draf</button><button class="btn" data-act="deSimpanDraf" data-ajukan="1">' + ic('send') + 'Simpan & Ajukan/Terbitkan</button></div></div>';
    const sel = el.querySelector('[name=kode]'), gambar = () => {
      const t = DE.tpl.find(x => x.kode === sel.value) || {};
      $('de-isian').innerHTML = '<div class="info-box mt mb"><div class="t">Kolom otomatis dari data PKL</div><div class="small muted">Placeholder sistem/aplikasi seperti {{NAMA}}, {{DUDI}}, {{NILAI_AKHIR}}, {{NOMOR}}, {{TANGGAL}}, {{QR}} terisi otomatis saat terbit.</div></div>' +
        '<div class="form-grid">' + (t.bidang || []).map(formIsian).join('') + (t.slotTtd || []).filter(s => s.cara === 'pilih').map(s => fld({ name: 'pj_' + s.slot, label: 'Pejabat — ' + s.label, type: 'select', options: DE.pj.filter(p => p.aktif === 'YA').map(p => ({ v: p.id, l: p.nama + ' · ' + p.jabatan })) })).join('') + '</div>' +
        ((t.bidang || []).length ? '' : '<p class="small muted">Template ini tidak memiliki kolom isian manual.</p>');
    };
    sel.onchange = gambar; gambar();
  }
  Act.deSimpanDraf = async btn => {
    const root = $('de-buat'), kode = root.querySelector('[name=kode]').value, nis = root.querySelector('[name=nis]').value, isian = {}, pejabat = {};
    root.querySelectorAll('#de-isian [name]').forEach(i => {
      if (i.name.indexOf('pj_') === 0) { pejabat[i.name.slice(3)] = i.value; return; }
      if (i.dataset.daftar !== undefined) { const kol = i.dataset.daftar.split(','); isian[i.name] = i.value.split('\n').filter(x => x.trim()).map(l => { const v = l.split('|'), o = {}; kol.forEach((k, j) => (o[k] = (v[j] || '').trim())); return o; }); return; }
      isian[i.name] = i.value;
    });
    const r = await simpan(btn, 'de.buat', { kode, nis, isian, pejabat }, { reload: false, diam: btn.dataset.ajukan === '1' });
    if (!r || !r.success) return;
    if (btn.dataset.ajukan === '1') {
      const l = await api('de.dokumenList', {}), d = l.success && l.data.rows.find(x => x.id === r.data.id);
      const qr = d ? await qrDataUrl((P('APP_URL') || location.href.replace(/#.*$/, '')).replace(/\/$/, '') + '/#/v/' + d.kodeVerifikasi, 6) : '';
      await simpan(btn, 'de.ajukan', { id: r.data.id, qr }, { reload: false });
    }
    App.go('#/dokumen/dokumen');
  };
  async function deMassal() {
    const el = $('de-massal'), ok = DE.tpl.filter(t => t.aktif === 'YA' && !(t.slotTtd || []).some(s => s.wajibSetuju)), st = await api('de.antrean', {});
    el.innerHTML = '<div class="grid g2"><div class="card"><div class="card-h"><h3>Generate Massal (mail merge)</h3></div><p class="small muted" style="margin-top:0">Untuk template tanpa persetujuan pejabat (mis. Kartu PKL, Sertifikat, Lembar Nilai). Diproses bertahap ±25 dokumen tiap 5 menit di server.</p>' +
      (ok.length ? fld({ name: 'kode', label: 'Template', type: 'select', options: ok.map(t => ({ v: t.kode, l: t.nama })), value: ok[0].kode, kosong: false }) + '<label class="check small mb"><input type="checkbox" checked data-chg="deSemua"> Semua siswa yang punya penempatan</label>' +
        '<div class="info-box" style="max-height:300px;overflow:auto" id="de-m-list">' + S.data.siswa.filter(s => penOf(s.NIS)).map(s => '<label class="check small" style="padding:4px 0"><input type="checkbox" value="' + esc(s.NIS) + '" checked> ' + esc(s.Nama) + ' <span class="xs muted">' + esc(nmDudi((penOf(s.NIS) || {}).DUDIID)) + '</span></label>').join('') + '</div>' +
        '<button class="btn block mt" data-act="deMassalJalan">' + ic('library_add') + 'Masukkan ke Antrean</button>' : '<div class="empty small">Belum ada template tanpa persetujuan.</div>') + '</div>' +
      '<div class="card"><div class="card-h"><h3 class="grow">Status Antrean</h3><button class="btn ghost sm" data-act="deProses">' + ic('play_arrow') + 'Proses Sekarang</button></div>' + (st.success ? '<div class="grid g3">' + [['Menunggu', st.data.MENUNGGU, 'amber'], ['Selesai', st.data.SELESAI, 'teal'], ['Gagal', st.data.GAGAL, 'rose']].map(x => '<div class="card tight"><span class="stat-lbl">' + x[0] + '</span><div class="stat-val" style="font-size:24px">' + x[1] + '</div></div>').join('') + '</div>' : '') + '</div></div>';
  }
  Act.deSemua = el => document.querySelectorAll('#de-m-list input').forEach(c => (c.checked = el.checked));
  Act.deMassalJalan = async btn => { const nis = [...document.querySelectorAll('#de-m-list input:checked')].map(c => c.value); const r = await simpan(btn, 'de.massal', { kode: document.querySelector('#de-massal [name=kode]').value, nis }, { reload: false }); if (r && r.success) deMassal(); };
  Act.deProses = async btn => { const r = await busy(btn, () => api('de.prosesSekarang', {})); if (r && !r.success) toast(r.message, 'bad'); deMassal(); };
  function deTemplate() {
    const el = $('de-template');
    el.innerHTML = '<div class="grid g2"><div class="card"><div class="card-h"><span class="ic teal">' + ic('add_link') + '</span><h3>Pindai Template Baru / Pindai Ulang</h3></div><form id="de-f-pindai">' +
      fld({ name: 'kode', label: 'Kode template', req: true, ph: 'KARTU / SERTIF / NILAI / SURAT', help: 'Huruf kapital. Pindai ulang dengan kode sama untuk memperbarui (setelan kolom dipertahankan).' }) + fld({ name: 'nama', label: 'Nama template', ph: 'Sertifikat PKL' }) +
      fld({ name: 'url', label: 'URL Google Docs / Sheets / Slides', req: true, help: 'Simpan template di folder "📂 Template Dokumen" Drive aplikasi.' }) + '<button class="btn" data-act="dePindai">' + ic('document_scanner') + 'Pindai Placeholder</button></form>' +
      '<div class="info-box mt"><div class="t">Contoh placeholder</div><div class="xs mono">{{NAMA|kapital}} {{NIS}} {{KELAS}} {{DUDI}} {{PEKERJAAN}} {{TGL_MULAI}} {{TGL_SELESAI}} {{NILAI_AKHIR}} {{PREDIKAT}} {{KEHADIRAN}} {{FOTO_SISWA}} {{NOMOR}} {{TANGGAL}} {{QR}} {{NAMA_PEJABAT_1}} {{JABATAN_1}} {{NIP_1}} {{TTD_1}} {{KETERANGAN}} {{?CATATAN}}…{{/CATATAN}}</div></div></div>' +
      '<div class="card"><div class="card-h"><h3>Template Terdaftar</h3></div>' + (DE.tpl.length ? '<div class="list">' + DE.tpl.map(t => '<div class="li"><span class="ic ' + (t.aktif === 'YA' ? 'teal' : 'mute') + '">' + ic({ docs: 'description', sheets: 'table', slides: 'slideshow' }[t.engine] || 'article') + '</span><div class="grow"><div class="b">' + esc(t.nama) + ' <span class="xs mono muted">' + esc(t.kode) + ' · v' + esc(t.versi) + '</span></div><div class="xs muted">' + t.bidang.length + ' kolom isian · ' + t.slotTtd.length + ' slot TTD · keluaran ' + esc(t.keluaran.join(', ')) + '</div></div><button class="btn ghost sm" data-act="deAtur" data-kode="' + esc(t.kode) + '">' + ic('tune') + 'Atur</button></div>').join('') + '</div>' : '<div class="empty small">Belum ada template.</div>') + '</div></div>';
  }
  Act.dePindai = async btn => { const d = bacaForm($('de-f-pindai')); const r = await simpan(btn, 'de.pindai', d, { reload: false }); if (r && r.success) { App.render(); if (r.data.skema.hilang.length) toast('Kolom tidak lagi ada di template: ' + r.data.skema.hilang.join(', '), 'warn', 8000); } };
  Act.deAtur = el => {
    const t = DE.tpl.find(x => x.kode === el.dataset.kode); if (!t) return;
    const tipe = ['teks', 'area', 'naskah', 'tanggal', 'angka', 'pilihan', 'daftar'];
    const m = modal({ title: 'Atur Template · ' + t.nama, icon: 'tune', size: 'lg', body: '<div class="form-grid">' + fld({ name: 'nama', label: 'Nama', value: t.nama }) + '<div class="field"><label>Keluaran</label><div class="row wrap">' + ['pdf', 'docx', 'xlsx', 'png'].map(f => '<label class="check small"><input type="checkbox" data-out value="' + f + '"' + (t.keluaran.indexOf(f) > -1 ? ' checked' : '') + '> ' + f.toUpperCase() + '</label>').join('') + '</div></div></div>' +
      '<label class="check small mb"><input type="checkbox" id="de-qrpp"' + (t.qrPerPenandatangan === 'YA' ? ' checked' : '') + '> QR per penanda tangan (menggantikan {{TTD_n}})</label> <label class="check small mb"><input type="checkbox" id="de-aktif"' + (t.aktif === 'YA' ? ' checked' : '') + '> Aktif</label>' +
      '<h4>Atur Kolom Isian</h4>' + (t.bidang.length ? tblWrap(['Kunci', 'Label', 'Tipe', 'Wajib', 'Bantuan / opsi'], t.bidang.map((b, i) => '<tr data-b="' + i + '"><td class="mono xs">' + esc(b.kunci) + '</td><td><input class="input" data-f="label" value="' + esc(b.label) + '"></td><td><select class="input" data-f="tipe">' + tipe.map(x => '<option' + (x === b.tipe ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></td><td><input type="checkbox" data-f="wajib"' + (b.wajib ? ' checked' : '') + '></td><td><input class="input" data-f="bantu" value="' + esc(b.tipe === 'pilihan' ? (b.opsi || []).join(';') : b.bantu || '') + '" placeholder="opsi pisah ; untuk tipe pilihan"></td></tr>')) : '<p class="small muted">Tidak ada kolom isian manual.</p>') +
      '<h4 class="mt">Atur Penanda Tangan</h4>' + (t.slotTtd.length ? tblWrap(['Slot', 'Label', 'Cara', 'Pejabat tetap', 'Tanda', 'Wajib setuju (PIN)'], t.slotTtd.map((s, i) => '<tr data-s="' + i + '"><td>' + s.slot + '</td><td><input class="input" data-f="label" value="' + esc(s.label) + '"></td><td><select class="input" data-f="cara"><option value="tetap"' + (s.cara === 'tetap' ? ' selected' : '') + '>Tetap</option><option value="pilih"' + (s.cara === 'pilih' ? ' selected' : '') + '>Pilih saat membuat</option></select></td>' +
        '<td><select class="input" data-f="pejabatId"><option value="">—</option>' + DE.pj.map(p => '<option value="' + esc(p.id) + '"' + (p.id === s.pejabatId ? ' selected' : '') + '>' + esc(p.nama) + '</option>').join('') + '</select></td><td><select class="input" data-f="tanda">' + ['qr', 'spesimen', 'qr+spesimen', 'kosong'].map(x => '<option' + (x === s.tanda ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></td><td><input type="checkbox" data-f="wajibSetuju"' + (s.wajibSetuju ? ' checked' : '') + '></td></tr>')) : '<p class="small muted">Template tidak memakai {{TTD_n}} / {{NAMA_PEJABAT_n}}.</p>'),
      foot: '<button class="btn ghost" data-x>Batal</button><button class="btn" data-save>' + ic('save') + 'Simpan</button>' });
    m.el.querySelector('[data-save]').onclick = async e => {
      const bidang = t.bidang.map((b, i) => { const tr = m.el.querySelector('[data-b="' + i + '"]'), o = Object.assign({}, b, { label: tr.querySelector('[data-f=label]').value, tipe: tr.querySelector('[data-f=tipe]').value, wajib: tr.querySelector('[data-f=wajib]').checked }); const v = tr.querySelector('[data-f=bantu]').value; if (o.tipe === 'pilihan') o.opsi = v.split(';').map(x => x.trim()).filter(Boolean); else o.bantu = v; return o; });
      const slot = t.slotTtd.map((s, i) => { const tr = m.el.querySelector('[data-s="' + i + '"]'); return Object.assign({}, s, { label: tr.querySelector('[data-f=label]').value, cara: tr.querySelector('[data-f=cara]').value, pejabatId: tr.querySelector('[data-f=pejabatId]').value, tanda: tr.querySelector('[data-f=tanda]').value, wajibSetuju: tr.querySelector('[data-f=wajibSetuju]').checked }); });
      const r = await simpan(e.currentTarget, 'de.templateSimpan', { kode: t.kode, nama: m.el.querySelector('[name=nama]').value, keluaran: [...m.el.querySelectorAll('[data-out]:checked')].map(c => c.value), qrPerPenandatangan: m.el.querySelector('#de-qrpp').checked, aktif: m.el.querySelector('#de-aktif').checked, bidang, slot }, { reload: false });
      if (r && r.success) { m.close(); App.render(); }
    };
  };
  function dePejabat() {
    const el = $('de-pejabat');
    el.innerHTML = '<div class="toolbar"><button class="btn" data-act="dePjForm">' + ic('person_add') + 'Tambah Pejabat</button><span class="small muted">Pejabat menyetujui dengan akun SIGAPKL miliknya + PIN 6 digit.</span></div>' +
      tblWrap(['Nama', 'Jabatan', 'NIP', 'Akun', 'PIN', 'Status', ''], DE.pj.map(p => { const a = (S.data.akun || []).find(x => x.UserID === p.userId); return '<tr><td><b>' + esc(p.nama) + '</b>' + (p.gelar ? ', ' + esc(p.gelar) : '') + '</td><td>' + esc(p.jabatan) + '</td><td class="mono small">' + esc(p.nip || '-') + '</td><td class="small">' + (a ? esc(a.Username) : pill('Belum ditautkan', 'warn')) + '</td><td>' + (p.pinAda ? pill('Diatur', 'ok') : pill('Belum', 'mute')) + '</td><td>' + pillStatus(p.aktif === 'YA' ? 'Aktif' : 'Nonaktif') + '</td><td class="right"><button class="btn ghost xs" data-act="dePjForm" data-id="' + esc(p.id) + '">' + ic('edit') + '</button></td></tr>'; }), 'Belum ada pejabat.');
  }
  Act.dePjForm = el => { const p = el.dataset.id ? DE.pj.find(x => x.id === el.dataset.id) : { aktif: 'YA' };
    formModal({ title: p.id ? 'Ubah Pejabat' : 'Tambah Pejabat', icon: 'badge', action: 'de.pejabatSimpan', reload: false, fields: [{ name: 'nama', label: 'Nama', req: true, value: p.nama }, { name: 'gelar', label: 'Gelar', value: p.gelar },
      { name: 'jabatan', label: 'Jabatan', req: true, value: p.jabatan, ph: 'Kepala Sekolah / Koordinator PKL' }, { name: 'nip', label: 'NIP', value: p.nip },
      { name: 'userId', label: 'Akun SIGAPKL (untuk menyetujui)', type: 'select', full: true, options: (S.data.akun || []).filter(a => a.Peran === 'ADMIN' || a.Peran === 'GURU').map(a => ({ v: a.UserID, l: a.Nama + ' (' + a.Username + ')' })), value: p.userId },
      { name: 'spesimenId', label: 'Link gambar spesimen TTD (Drive, opsional, privat)', full: true, value: p.spesimenId }, { name: 'aktif', label: 'Status', type: 'select', options: [{ v: 'YA', l: 'Aktif' }, { v: 'TIDAK', l: 'Nonaktif' }], value: p.aktif, kosong: false }],
      olah: d => Object.assign(d, { id: p.id || '' }), sesudah: () => App.render() }); };
})();
