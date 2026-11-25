/* SIGAPKL · Nilai Rapor (Rekapitulasi Nilai Raport)
 * Siswa: melihat rapornya; mengisi/mengubah nilai bila diizinkan Admin (lalu menunggu verifikasi).
 * Guru Pembimbing: melihat rapor siswa bimbingannya. Admin: mengubah semua isi, impor Excel, izin, struktur, cetak. */
(function () {
  'use strict';
  const R = { list: null };                                     // cache daftar rapor (Admin) dari rute rapor.list
  const $ = id => document.getElementById(id);
  const CFG0 = { tampil: true, izinSemua: false, izinSampai: '', kota: '', tanggal: '', judul: 'REKAPITULASI NILAI RAPORT', program: '', konsentrasi: '', desimal: 0 };
  const parse = (v, d) => { try { const o = JSON.parse(v || ''); return o && typeof o === 'object' ? o : d; } catch (e) { return d; } };
  const cfg = () => Object.assign({}, CFG0, parse(P('RAPOR_CFG'), {}));
  const struktur = () => { const o = parse(P('RAPOR_STRUKTUR'), null); return o && Array.isArray(o.kelompok) ? o : { kelas: [], kelompok: [] }; };
  const semua = st => { const a = []; (st.kelas || []).forEach(k => (k.sem || []).forEach(x => a.indexOf(+x) < 0 && a.push(+x))); return a.length ? a : [1, 2, 3, 4, 5]; };
  const angka = v => v === '' || v === null || v === undefined || !isFinite(+v) ? null : +v;
  const rata = arr => { const v = arr.filter(x => x !== null && x !== undefined); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const fmt = (v, d) => v === null || v === undefined ? '' : (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmtNilai = v => v === null || v === undefined ? '' : (Number.isInteger(v) ? String(v) : String(v).replace('.', ','));

  /* ---------- Perhitungan (mengikuti cara hitung berkas sekolah) ---------- */
  function hitung(rec, st) {
    const sem = semua(st), n = (rec && rec.Nilai) || {}, val = (id, k) => angka((n[id] || {})[k]);
    const efektif = (it, k) => {                              // mapel bersub: rata-rata sub (bila ada), selain itu nilai mapel sendiri
      if (it.sub && it.sub.length) { const v = rata(it.sub.filter(x => (x.sem || []).indexOf(k) > -1).map(x => val(x.id, k))); if (v !== null) return v; }
      return (it.sem || []).indexOf(k) > -1 ? val(it.id, k) : null;
    };
    const item = {}, grup = {}, jumlah = {}, hitungSem = {};
    st.kelompok.forEach(g => {
      const per = {}, semuaG = [];                           // semuaG: semua nilai semester dalam kelompok
      (g.item || []).forEach(it => {
        const v = {}; sem.forEach(k => { v[k] = efektif(it, k); });
        item[it.id] = { sem: v, rata: rata(sem.map(k => v[k])) };
        (it.sub || []).forEach(x => { const vs = {}; sem.forEach(k => { vs[k] = (x.sem || []).indexOf(k) > -1 ? val(x.id, k) : null; }); item[x.id] = { sem: vs, rata: rata(sem.map(k => vs[k])) }; });
        sem.forEach(k => { if (v[k] !== null) { (per[k] = per[k] || []).push(v[k]); semuaG.push(v[k]); jumlah[k] = (jumlah[k] || 0) + v[k]; hitungSem[k] = (hitungSem[k] || 0) + 1; } });
      });
      const gs = {}; sem.forEach(k => { gs[k] = per[k] ? rata(per[k]) : null; });
      grup[g.id] = { sem: gs, rata: rata(semuaG) };        // sama dengan berkas sekolah: rata-rata semua nilai semester di kelompok itu
    });
    const rataSem = {}; sem.forEach(k => { rataSem[k] = hitungSem[k] ? jumlah[k] / hitungSem[k] : null; });
    const terisi = sem.filter(k => hitungSem[k]);
    return { sem, item, grup, jumlah, rataSem, total: rata(sem.map(k => rataSem[k])), terisi, jmlNilai: Object.keys(n).reduce((a, id) => a + Object.keys(n[id] || {}).length, 0) };
  }
  const peringkatAkhir = rec => { const r = (rec && rec.Ranking) || {}, k = Object.keys(r).sort().pop(); return k ? { sem: k, n: r[k] } : null; };
  const bolehIsiSiswa = rec => { const c = cfg(); if (!c.tampil) return false; if (c.izinSampai && hariIni() > c.izinSampai) return false; return !!c.izinSemua || !!(rec && rec.Izin === 'YA'); };
  const pillStatusRapor = rec => !rec ? pill('Belum ada data', 'mute', true) : rec.Status === 'Menunggu verifikasi' ? pill('Menunggu verifikasi', 'warn', true) : rec.Status === 'Terverifikasi' ? pill('Terverifikasi', 'ok', true) : pill('Draf', 'mute', true);

  /* ---------- Tabel rekap (lihat / ubah) ---------- */
  function tabel(rec, o) {
    o = o || {};
    const st = struktur(), c = cfg(), d = +c.desimal || 0, h = hitung(rec, st), sem = h.sem, n = (rec && rec.Nilai) || {}, lama = o.sebelum || null;
    const kolomSem = (st.kelas || []).length ? st.kelas : [{ nama: 'SEMESTER', sem }];
    const sel = (id, k, boleh, tampil) => {
      if (!boleh) return '<td class="rp-x" aria-label="tidak ada"></td>';
      const v = angka((n[id] || {})[k]), sb = lama ? angka((lama[id] || {})[k]) : undefined, beda = lama && sb !== v;
      if (o.edit) return '<td class="rp-c' + (beda ? ' beda' : '') + '"><input class="rp-in" inputmode="decimal" maxlength="6" aria-label="Nilai semester ' + k + '" data-id="' + esc(id) + '" data-sem="' + k + '" value="' + esc(fmtNilai(v)) + '"' + (beda ? ' title="Sebelumnya: ' + esc(sb === null ? 'kosong' : fmtNilai(sb)) + '"' : '') + '></td>';
      return '<td class="rp-c num' + (beda ? ' beda' : '') + '"' + (beda ? ' title="Sebelumnya: ' + esc(sb === null ? 'kosong' : fmtNilai(sb)) + '"' : '') + '>' + esc(tampil !== undefined ? tampil : fmtNilai(v)) + '</td>';
    };
    const sum = (vals, kelas) => '<tr class="' + kelas[0] + '"><td colspan="2">' + esc(kelas[1]) + '</td>' + sem.map(k => '<td class="num">' + esc(fmt(vals.sem[k], kelas[2] === 'int' ? 0 : d)) + '</td>').join('') + '<td class="num b">' + esc(fmt(vals.rata, d)) + '</td></tr>';
    let body = '';
    st.kelompok.forEach(g => {
      body += '<tr class="rp-g"><td class="no">' + esc(g.no || '') + '</td><td colspan="' + (sem.length + 2) + '">' + esc(g.nama) + '</td></tr>';
      (g.item || []).forEach(it => {
        const punyaSub = it.sub && it.sub.length, adaSendiri = Object.keys(n[it.id] || {}).length;
        body += '<tr><td class="no">' + esc(it.no || '') + '</td><td class="mp">' + esc(it.nama) + '</td>' +
          sem.map(k => punyaSub && !adaSendiri && !o.edit ? '<td></td>' : sel(it.id, k, (it.sem || []).indexOf(k) > -1)).join('') +
          '<td class="num b">' + (punyaSub ? '' : esc(fmt(h.item[it.id].rata, d))) + '</td></tr>';
        if (punyaSub) {
          it.sub.forEach(x => { body += '<tr class="rp-sub"><td></td><td class="mp">' + esc((x.no ? x.no + '  ' : '') + x.nama) + '</td>' + sem.map(k => sel(x.id, k, (x.sem || []).indexOf(k) > -1)).join('') + '<td class="num">' + esc(fmt(h.item[x.id].rata, d)) + '</td></tr>'; });
          body += sum(h.item[it.id], ['rp-r', 'Rata - Rata ' + it.nama]);
        }
      });
      body += sum(h.grup[g.id], ['rp-gr', 'Rata - Rata ' + (g.nama || '').replace(/^KELOMPOK\s*/i, 'Kelompok ').replace(/\b(\w)(\w*)/g, (m, a, b) => a + b.toLowerCase())]);
    });
    body += '<tr class="rp-tot"><td colspan="2">JUMLAH NILAI</td>' + sem.map(k => '<td class="num">' + esc(h.jumlah[k] !== undefined ? fmt(h.jumlah[k], 0) : '') + '</td>').join('') + '<td></td></tr>';
    body += '<tr class="rp-tot"><td colspan="2">RATA - RATA NILAI</td>' + sem.map(k => '<td class="num">' + esc(fmt(h.rataSem[k], d)) + '</td>').join('') + '<td class="num b">' + esc(fmt(h.total, d)) + '</td></tr>';
    return '<div class="tbl-wrap rp-wrap"><table class="rp-tbl"><thead><tr><th rowspan="2" colspan="2" class="mp">MATA PELAJARAN</th>' + kolomSem.map(k => '<th colspan="' + (k.sem || []).length + '" class="ctr">' + esc(k.nama) + '</th>').join('') + '<th rowspan="2" class="ctr">RATA - RATA</th></tr>' +
      '<tr>' + kolomSem.map(k => (k.sem || []).map(x => '<th class="ctr">' + x + '</th>').join('')).join('') + '</tr></thead><tbody>' + body + '</tbody></table></div>';
  }
  function bacaNilai(root) {
    const o = {}; let salah = null;
    root.querySelectorAll('.rp-in').forEach(inp => {
      const t = inp.value.trim().replace(',', '.'); inp.classList.remove('salah');
      if (t === '') return;
      const v = +t; if (!isFinite(v) || v < 0 || v > 100) { inp.classList.add('salah'); salah = salah || inp; return; }
      (o[inp.dataset.id] = o[inp.dataset.id] || {})[inp.dataset.sem] = v;
    });
    if (salah) { salah.focus(); toast('Nilai harus angka 0–100.', 'warn'); return null; }
    return o;
  }

  /* ---------- Blok informasi ---------- */
  function identitas(rec, nis) {
    const c = cfg(), s = S.ix.siswa[nis] || {};
    const baris = [['Nama', (rec && rec.Nama) || s.Nama || '-'], ['NIS / NISN', nis + ' / ' + ((rec && rec.NISN) || s.NISN || '-')], ['Tempat, tanggal lahir', (rec && rec.TTL) || '-'],
      ['Program keahlian', (rec && rec.Program) || c.program || '-'], ['Konsentrasi keahlian', (rec && rec.Konsentrasi) || c.konsentrasi || '-']];
    return '<dl class="rp-id">' + baris.map(b => '<div><dt>' + esc(b[0]) + '</dt><dd>' + esc(b[1]) + '</dd></div>').join('') + '</dl>';
  }
  function ringkasan(rec) {
    const st = struktur(), c = cfg(), d = +c.desimal || 0, h = hitung(rec, st), rk = peringkatAkhir(rec);
    const tiles = [['Rata-rata nilai', fmt(h.total, Math.max(d, 2)) || '-', 'grade', 'teal']]
      .concat(st.kelompok.map(g => ['Rata-rata ' + (g.nama || '').replace(/^KELOMPOK\s*MATA\s*PELAJARAN\s*/i, '').toLowerCase(), fmt(h.grup[g.id].rata, Math.max(d, 2)) || '-', g.id === 'umum' ? 'menu_book' : 'build', g.id === 'umum' ? 'indigo' : 'amber']))
      .concat([['Peringkat terakhir', rk ? rk.n + ' (sem ' + rk.sem + ')' : '-', 'military_tech', 'rose']]);
    return '<div class="grid rp-tiles">' + tiles.map(t => '<div class="card tight"><div class="row gap-s"><span class="ic ' + t[3] + '">' + ic(t[2]) + '</span><div class="grow"><div class="xs muted b" style="text-transform:capitalize">' + esc(t[0]) + '</div><div class="rp-big">' + esc(t[1]) + '</div></div></div></div>').join('') + '</div>' +
      (h.terisi.length ? '<div class="card mt"><div class="card-h"><h3 class="grow">Rata-rata per semester</h3></div>' + barChart({ labels: h.sem.map(k => 'Sem ' + k), series: [{ name: 'Rata-rata', values: h.sem.map(k => h.rataSem[k] === null ? 0 : Math.round(h.rataSem[k] * 100) / 100), color: Tema.c() }], max: 100, h: 200, label: 'Rata-rata nilai per semester' }) + '</div>' : '');
  }
  function infoTambahan(rec, edit) {
    const sem = semua(struktur()), ab = (rec && rec.Absensi) || {}, rk = (rec && rec.Ranking) || {}, wk = (rec && rec.WaliKelas) || {};
    const semAbs = sem.concat(Object.keys(ab).map(Number).filter(k => sem.indexOf(k) < 0)).sort((a, b) => a - b);
    const inp = (nm, v, lbl, w) => '<input class="input rp-mini" ' + (w ? 'style="width:' + w + '"' : '') + ' inputmode="numeric" maxlength="3" name="' + nm + '" aria-label="' + esc(lbl) + '" value="' + esc(v == null ? '' : v) + '">';
    const absen = '<div class="tbl-wrap"><table class="rp-tbl rp-small"><thead><tr><th>Ketidakhadiran</th>' + semAbs.map(k => '<th class="ctr">Sem ' + k + '</th>').join('') + '</tr></thead><tbody>' +
      [['I', 'Izin'], ['S', 'Sakit'], ['A', 'Tanpa keterangan']].map(j => '<tr><td>' + j[1] + '</td>' + semAbs.map(k => '<td class="num">' + (edit ? inp('ab_' + k + '_' + j[0], (ab[k] || {})[j[0]], j[1] + ' semester ' + k) : esc((ab[k] || {})[j[0]] == null ? '-' : ab[k][j[0]])) + '</td>').join('') + '</tr>').join('') +
      '<tr><td>Peringkat kelas</td>' + semAbs.map(k => '<td class="num b">' + (edit ? inp('rk_' + k, rk[k], 'Peringkat semester ' + k) : esc(rk[k] == null ? '-' : rk[k])) + '</td>').join('') + '</tr></tbody></table></div>';
    const wali = '<div class="rp-wali">' + ['X', 'XI', 'XII'].map(k => '<div><span class="xs muted b">WALI KELAS ' + k + '</span>' + (edit ? '<input class="input" name="wk_' + k + '" maxlength="100" aria-label="Wali kelas ' + k + '" value="' + esc(wk[k] || '') + '">' : '<b class="small">' + esc(wk[k] || '-') + '</b>') + '</div>').join('') + '</div>';
    return '<div class="card mt"><div class="card-h"><h3 class="grow">Kehadiran, peringkat & wali kelas</h3></div>' + absen + wali + (rec && rec.Catatan && !edit ? '<p class="small mt"><b>Catatan:</b> ' + esc(rec.Catatan) + '</p>' : '') + '</div>';
  }

  /* ---------- Lembar cetak (mengikuti templat Rekapitulasi Nilai Raport) ---------- */
  function lembar(rec, nis) {
    const c = cfg(), s = S.ix.siswa[nis] || {}, wk = (rec && rec.WaliKelas) || {}, wali = wk.XII || wk.XI || wk.X || '';
    const tbl = tabel(rec, {}).replace('tbl-wrap rp-wrap', 'rp-print-wrap');
    const id = [['Nama', (rec && rec.Nama) || s.Nama || ''], ['NIS / NISN', nis + ' / ' + ((rec && rec.NISN) || s.NISN || '')], ['Tempat Tanggal Lahir', (rec && rec.TTL) || ''],
      ['Program Studi Keahlian', (rec && rec.Program) || c.program || ''], ['Konsentrasi Keahlian', (rec && rec.Konsentrasi) || c.konsentrasi || '']];
    return '<div class="rp-lembar"><h2>' + esc(c.judul || 'REKAPITULASI NILAI RAPORT') + '</h2><table class="rp-idp">' + id.map(x => '<tr><td>' + esc(x[0]) + '</td><td>: ' + esc(x[1]) + '</td></tr>').join('') + '</table>' + tbl +
      '<div class="rp-ttd"><div><p>Mengetahui,</p><p>Wali Kelas</p><p class="nm">' + esc(wali || '…………………………………') + '</p></div><div><p>' + esc((c.kota || '') + ', ' + (c.tanggal || '……………………')) + '</p><p>Peserta Didik,</p><p class="nm">' + esc((rec && rec.Nama) || s.Nama || '') + '</p></div></div></div>';
  }
  const GAYA_CETAK = '<style>.rp-lembar{font-family:"Times New Roman",serif;color:#000;page-break-after:always;font-size:11pt}.rp-lembar:last-child{page-break-after:auto}.rp-lembar h2{text-align:center;font-size:14pt;margin:0 0 12px;letter-spacing:.04em}.rp-idp{margin-bottom:10px;font-size:11pt}.rp-idp td{padding:1px 6px 1px 0}.rp-idp td:first-child{width:190px}' +
    '.rp-print-wrap table{width:100%;border-collapse:collapse;font-size:9.5pt}.rp-print-wrap th,.rp-print-wrap td{border:1px solid #000;padding:2px 4px;background:none!important;color:#000!important;position:static}.rp-print-wrap th{text-align:center;font-weight:700}.rp-print-wrap .num{text-align:center}.rp-print-wrap .rp-x{background:#d9d9d9!important}' +
    '.rp-print-wrap .rp-g td,.rp-print-wrap .rp-gr td,.rp-print-wrap .rp-tot td{font-weight:700}.rp-print-wrap .rp-sub .mp{padding-left:18px}.rp-ttd{display:flex;justify-content:space-between;margin-top:22px;page-break-inside:avoid}.rp-ttd div{width:45%}.rp-ttd p{margin:0}.rp-ttd .nm{margin-top:60px;font-weight:700;text-decoration:underline}</style>';
  const cetakRapor = list => cetak(GAYA_CETAK + list.map(x => lembar(x.rec, x.nis)).join(''), 'Rekapitulasi Nilai Raport');

  /* ======================= SISWA ======================= */
  Pages['SISWA:rapor'] = {
    render(param) {
      const c = cfg(), nis = Sesi.me.ref, rec = (S.data.rapor || [])[0] || null, boleh = bolehIsiSiswa(rec);
      if (!c.tampil) return head(ic('menu_book') + ' Nilai Akademik', 'Nilai Rapor', '') + '<div class="card empty">' + ic('visibility_off') + 'Nilai rapor belum ditampilkan oleh Admin.</div>';
      if (param === 'ubah' && boleh) return head(ic('edit_note') + ' Nilai Rapor', 'Isi / Ubah Nilai Rapor', 'Isi sesuai rapor asli. Setelah disimpan, perubahan menunggu verifikasi Admin.', '<a class="btn ghost" href="#/rapor">' + ic('arrow_back') + 'Batal</a>') +
        '<form id="f-rapor" data-dirty>' + tabel(rec || { Nilai: {} }, { edit: true }) + '<div class="row wrap mt" style="justify-content:flex-end;gap:8px"><a class="btn ghost" href="#/rapor">Batal</a><button class="btn" data-act="raporSimpanSiswa">' + ic('send') + 'Simpan & kirim untuk verifikasi</button></div></form>';
      if (!rec && !boleh) return head(ic('menu_book') + ' Nilai Akademik', 'Nilai Rapor', '') + '<div class="card empty">' + ic('hourglass_empty') + 'Nilai rapor Anda belum diunggah Admin.</div>';
      return head(ic('menu_book') + ' Nilai Akademik', 'Nilai Rapor', 'Rekapitulasi nilai rapor semester 1–' + semua(struktur()).slice(-1)[0] + '.',
          (boleh ? '<a class="btn sec" href="#/rapor/ubah">' + ic('edit') + (rec ? 'Ubah nilai' : 'Isi nilai') + '</a>' : '') + (rec ? '<button class="btn" data-act="raporCetak" data-nis="' + esc(nis) + '">' + ic('print') + 'Cetak / PDF</button>' : '')) +
        '<div class="row wrap gap-s mb">' + pillStatusRapor(rec) + (boleh ? pill('Anda diizinkan mengisi' + (c.izinSampai ? ' s.d. ' + fmtTgl(c.izinSampai) : ''), 'info', true) : '') + (rec && rec.DiperbaruiPada ? '<span class="xs muted">Diperbarui ' + esc(fmtWaktu(rec.DiperbaruiPada)) + '</span>' : '') + '</div>' +
        (rec && rec.Status === 'Menunggu verifikasi' ? '<div class="alert warn mb">' + ic('hourglass_top') + '<div><p class="small">Perubahan yang Anda kirim sedang diperiksa Admin. Nilai bisa berubah setelah verifikasi.</p></div></div>' : '') +
        '<div class="card mb">' + identitas(rec, nis) + '</div>' + (rec ? ringkasan(rec) + '<div class="mt">' + tabel(rec) + '</div>' + infoTambahan(rec) : '<div class="card empty">' + ic('edit_note') + 'Belum ada nilai. Tekan "Isi nilai" untuk mulai mengisi.</div>');
    }
  };
  Act.raporSimpanSiswa = async btn => {
    const v = bacaNilai($('f-rapor')); if (!v) return;
    const r = await simpan(btn, 'rapor.simpan', { Nilai: v }, { reload: false });
    if (r && r.success) { await S.load({ silent: true }); App.dirty = false; App.go('#/rapor'); }
  };
  Act.raporCetak = el => { const nis = el.dataset.nis, rec = (S.data.rapor || []).concat(R.list || []).find(x => x.NIS === nis); if (rec) cetakRapor([{ rec, nis }]); };

  /* ======================= GURU PEMBIMBING ======================= */
  Pages['GURU:rapor'] = {
    render(param) {
      const c = cfg(), list = S.data.rapor || [], milik = [...new Set(S.data.penempatan.filter(p => p.GuruID === Sesi.me.ref).map(p => p.NIS))];
      if (!c.tampil) return head(ic('menu_book') + ' Nilai Akademik', 'Nilai Rapor Siswa', '') + '<div class="card empty">' + ic('visibility_off') + 'Nilai rapor belum ditampilkan oleh Admin.</div>';
      if (param) {
        const rec = list.find(x => x.NIS === param);
        if (!rec) return head(ic('menu_book') + ' Nilai Rapor', esc(nmSiswa(param)), '', '<a class="btn ghost" href="#/rapor">' + ic('arrow_back') + 'Kembali</a>') + '<div class="card empty">Nilai rapor siswa ini belum tersedia.</div>';
        return head(ic('menu_book') + ' Nilai Rapor · hanya lihat', esc(rec.Nama || nmSiswa(param)), 'NIS ' + esc(param), '<a class="btn ghost" href="#/rapor">' + ic('arrow_back') + 'Kembali</a><button class="btn" data-act="raporCetak" data-nis="' + esc(param) + '">' + ic('print') + 'Cetak / PDF</button>') +
          '<div class="row wrap gap-s mb">' + pillStatusRapor(rec) + '</div><div class="card mb">' + identitas(rec, param) + '</div>' + ringkasan(rec) + '<div class="mt">' + tabel(rec) + '</div>' + infoTambahan(rec);
      }
      return head(ic('menu_book') + ' Nilai Akademik', 'Nilai Rapor Siswa Bimbingan', 'Rekapitulasi nilai rapor siswa bimbingan Anda (hanya lihat).') +
        (milik.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Siswa</th><th class="num">Rata-rata</th><th class="num">Semester terisi</th><th>Status</th><th></th></tr></thead><tbody>' + milik.map(n => {
          const rec = list.find(x => x.NIS === n), h = rec ? hitung(rec, struktur()) : null, s = S.ix.siswa[n] || {};
          return '<tr><td><div class="who">' + av(s.Nama, s.FotoURL, 'av-xs') + '<div><div class="n">' + esc(s.Nama || n) + '</div><div class="s">NIS ' + esc(n) + '</div></div></div></td><td class="num b">' + (h ? esc(fmt(h.total, 2)) : '-') + '</td><td class="num">' + (h ? h.terisi.length : 0) + '</td><td>' + pillStatusRapor(rec) + '</td>' +
            '<td class="right">' + (rec ? '<a class="btn sec sm" href="#/rapor/' + esc(n) + '">' + ic('visibility') + 'Lihat</a>' : '') + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="card empty">' + ic('group_off') + 'Belum ada siswa bimbingan.</div>');
    }
  };

  /* ======================= ADMIN ======================= */
  const semuaNis = () => { const m = {}; (R.list || []).forEach(r => (m[r.NIS] = r)); S.data.siswa.forEach(s => { if (!m[s.NIS]) m[s.NIS] = null; }); return m; };
  Pages['ADMIN:rapor'] = {
    render(param) {
      const c = cfg();
      return head(ic('menu_book') + ' Nilai Akademik', param && param !== 'menunggu' && param !== 'izin' ? 'Nilai Rapor Siswa' : 'Nilai Rapor', 'Rekapitulasi nilai rapor tiap siswa. Siswa dan Guru Pembimbing hanya melihat; siswa dapat mengisi bila Anda izinkan.',
          '<button class="btn ghost" data-act="raporAtur">' + ic('tune') + 'Pengaturan</button><button class="btn ghost" data-act="raporStruktur">' + ic('account_tree') + 'Mata pelajaran</button><button class="btn sec" data-act="raporImpor">' + ic('upload_file') + 'Impor Excel</button>') +
        (!c.tampil ? '<div class="alert warn mb">' + ic('visibility_off') + '<div><p class="small">Nilai rapor sedang <b>disembunyikan</b> dari siswa dan guru. Aktifkan di Pengaturan bila data sudah siap.</p></div></div>' : '') +
        '<div id="rp-box">' + (R.list ? isiAdmin(param) : '<div class="skel" style="height:320px"></div>') + '</div>';
    },
    async after(param) {
      const r = await api('rapor.list', {}); if (!r.success) { const b = $('rp-box'); if (b) b.innerHTML = '<div class="card empty">' + esc(r.message) + '</div>'; return; }
      R.list = r.data.rapor || []; const b = $('rp-box'); if (b && !App.dirty) b.innerHTML = isiAdmin(param);
    }
  };
  function isiAdmin(param) {
    if (param && param !== 'menunggu' && param !== 'izin') return editorAdmin(param);
    const m = semuaNis(), c = cfg(), st = struktur(), nisList = Object.keys(m).sort((a, b) => ((m[a] && m[a].Nama) || nmSiswa(a)).localeCompare((m[b] && m[b].Nama) || nmSiswa(b)));
    const menunggu = nisList.filter(n => m[n] && m[n].Status === 'Menunggu verifikasi'), izin = nisList.filter(n => c.izinSemua || (m[n] && m[n].Izin === 'YA'));
    const tampil = (param === 'menunggu' ? menunggu : param === 'izin' ? izin : nisList).filter(n => cari({ n: (m[n] && m[n].Nama) || nmSiswa(n), i: n }, S.q));
    const ada = nisList.filter(n => m[n] && hitung(m[n], st).jmlNilai).length;
    return '<div class="grid rp-tiles mb">' + [['Siswa dengan nilai', ada + ' / ' + nisList.length, 'groups', 'teal'], ['Menunggu verifikasi', menunggu.length, 'pending_actions', 'amber'], ['Diizinkan mengisi', c.izinSemua ? 'Semua siswa' : izin.length, 'edit_note', 'indigo'], ['Tampil ke siswa', c.tampil ? 'Ya' : 'Tidak', c.tampil ? 'visibility' : 'visibility_off', c.tampil ? 'teal' : 'rose']]
      .map(t => '<div class="card tight"><div class="row gap-s"><span class="ic ' + t[3] + '">' + ic(t[2]) + '</span><div><div class="xs muted b">' + t[0] + '</div><div class="rp-big">' + esc(t[1]) + '</div></div></div></div>').join('') + '</div>' +
      '<div class="tabs">' + [['', 'Semua', nisList.length], ['menunggu', 'Menunggu verifikasi', menunggu.length], ['izin', 'Diizinkan mengisi', izin.length]].map(t => '<button class="' + ((param || '') === t[0] ? 'on' : '') + '" data-act="go" data-href="#/rapor' + (t[0] ? '/' + t[0] : '') + '">' + t[1] + ' ' + pill(t[2], t[0] === 'menunggu' && t[2] ? 'warn' : 'mute') + '</button>').join('') + '</div>' +
      '<div class="toolbar"><label class="check small"><input type="checkbox" data-chg="raporPilihSemua"> Pilih semua</label><span class="grow"></span>' +
      '<button class="btn ghost sm" data-act="raporIzin" data-v="1">' + ic('lock_open') + 'Izinkan mengisi</button><button class="btn ghost sm" data-act="raporIzin" data-v="0">' + ic('lock') + 'Cabut izin</button>' +
      '<button class="btn ghost sm" data-act="raporVerif" data-a="setujui">' + ic('verified') + 'Verifikasi</button><button class="btn ghost sm" data-act="raporVerif" data-a="tolak">' + ic('undo') + 'Tolak perubahan</button>' +
      '<button class="btn ghost sm" data-act="raporPkl">' + ic('work_history') + 'Isi nilai PKL</button><button class="btn ghost sm" data-act="raporTemplat">' + ic('download') + 'Unduh templat</button><button class="btn ghost sm" data-act="raporEkspor">' + ic('table_view') + 'Ekspor Excel</button><button class="btn ghost sm" data-act="raporCetakPilih">' + ic('print') + 'Cetak</button></div>' +
      (tampil.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:36px"></th><th>Siswa</th><th class="num">Rata-rata</th><th class="num">Semester terisi</th><th class="num">Peringkat</th><th>Status</th><th>Izin isi</th><th></th></tr></thead><tbody>' + tampil.map(n => {
        const rec = m[n], h = rec ? hitung(rec, st) : null, s = S.ix.siswa[n] || {}, rk = peringkatAkhir(rec);
        return '<tr class="' + (rec && rec.Status === 'Menunggu verifikasi' ? 'warn-row' : '') + '"><td><input type="checkbox" class="rp-pilih" value="' + esc(n) + '" aria-label="Pilih ' + esc((rec && rec.Nama) || s.Nama || n) + '"></td>' +
          '<td><div class="who">' + av((rec && rec.Nama) || s.Nama, s.FotoURL, 'av-xs') + '<div><div class="n">' + esc((rec && rec.Nama) || s.Nama || n) + '</div><div class="s">NIS ' + esc(n) + (!S.ix.siswa[n] ? ' · <span style="color:var(--amber-700)">belum terdaftar di aplikasi</span>' : '') + '</div></div></div></td>' +
          '<td class="num b">' + (h && h.total !== null ? esc(fmt(h.total, 2)) : '-') + '</td><td class="num">' + (h ? h.terisi.length : 0) + '</td><td class="num">' + (rk ? esc(rk.n) : '-') + '</td><td>' + pillStatusRapor(rec) + '</td>' +
          '<td>' + (c.izinSemua || (rec && rec.Izin === 'YA') ? pill('Diizinkan', 'info') : '<span class="xs muted">—</span>') + '</td><td class="right"><a class="btn sec sm" href="#/rapor/' + encodeURIComponent(n) + '">' + ic('edit') + (rec ? 'Buka' : 'Isi') + '</a></td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="card empty">' + ic('search_off') + 'Tidak ada siswa pada daftar ini.</div>');
  }
  const terpilih = () => [...document.querySelectorAll('.rp-pilih:checked')].map(x => x.value);
  Act.raporPilihSemua = el => document.querySelectorAll('.rp-pilih').forEach(x => (x.checked = el.checked));
  Act.raporIzin = btn => { const n = terpilih(); if (!n.length) { toast('Centang siswa terlebih dahulu.', 'warn'); return; } simpan(btn, 'rapor.izin', { NIS: n, izin: btn.dataset.v === '1' }); };
  Act.raporVerif = async btn => {
    const n = terpilih(), tolak = btn.dataset.a === 'tolak'; if (!n.length) { toast('Centang siswa terlebih dahulu.', 'warn'); return; }
    if (tolak && !(await konfirmasi('Kembalikan nilai ' + n.length + ' siswa ke nilai sebelum diubah siswa?', { danger: true, ok: 'Tolak perubahan' }))) return;
    simpan(btn, 'rapor.verifikasi', { NIS: n, aksi: tolak ? 'tolak' : 'setujui' });
  };

  function editorAdmin(nis) {
    nis = decodeURIComponent(nis);
    const rec = (R.list || []).find(x => x.NIS === nis) || null, s = S.ix.siswa[nis] || {}, c = cfg(), pending = rec && rec.Status === 'Menunggu verifikasi';
    const f = (name, label, value, ph) => '<div class="field"><label for="rp-' + name + '">' + label + '</label><input class="input" id="rp-' + name + '" name="' + name + '" maxlength="150" value="' + esc(value || '') + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + '></div>';
    return '<div class="row wrap gap-s mb"><a class="btn ghost sm" href="#/rapor">' + ic('arrow_back') + 'Daftar rapor</a>' + pillStatusRapor(rec) + (rec && rec.DiubahOleh ? '<span class="xs muted">Terakhir diubah ' + esc(rec.DiubahOleh) + ' · ' + esc(fmtWaktu(rec.DiperbaruiPada)) + '</span>' : '') + '</div>' +
      (pending ? '<div class="alert warn mb">' + ic('pending_actions') + '<div class="grow"><h4>Siswa mengubah nilai rapornya</h4><p class="small">Sel bertanda kuning berubah dari nilai sebelumnya (arahkan kursor untuk melihat nilai lama). Verifikasi untuk menerima, atau tolak untuk mengembalikan.</p></div>' +
        '<div class="row gap-s"><button class="btn sm" data-act="raporVerif1" data-nis="' + esc(nis) + '" data-a="setujui">' + ic('verified') + 'Verifikasi</button><button class="btn ghost sm" data-act="raporVerif1" data-nis="' + esc(nis) + '" data-a="tolak">' + ic('undo') + 'Tolak</button></div></div>' : '') +
      '<form id="f-rapor" data-dirty><div class="card mb"><div class="card-h"><h3 class="grow">Informasi siswa</h3></div><div class="form-grid">' +
      f('Nama', 'Nama', (rec && rec.Nama) || s.Nama) + '<div class="field"><label>NIS</label><input class="input" value="' + esc(nis) + '" disabled></div>' + f('NISN', 'NISN', (rec && rec.NISN) || s.NISN) + f('TTL', 'Tempat, tanggal lahir', rec && rec.TTL, 'Ketapang / 28 - Desember - 2008') +
      f('Program', 'Program studi keahlian', rec && rec.Program, c.program) + f('Konsentrasi', 'Konsentrasi keahlian', rec && rec.Konsentrasi, c.konsentrasi) + '</div></div>' +
      tabel(rec || { Nilai: {} }, { edit: true, sebelum: pending ? (rec.NilaiSebelum || {}) : null }) + infoTambahan(rec, true) +
      '<div class="card mt"><div class="field"><label for="rp-cat">Catatan (tampil untuk siswa)</label><textarea class="input" id="rp-cat" name="Catatan" rows="2" maxlength="500">' + esc((rec && rec.Catatan) || '') + '</textarea></div></div>' +
      '<div class="row wrap mt" style="justify-content:flex-end;gap:8px">' + (rec ? '<button type="button" class="btn ghost" data-act="raporHapus" data-nis="' + esc(nis) + '">' + ic('delete') + 'Hapus data</button><button type="button" class="btn ghost" data-act="raporCetak" data-nis="' + esc(nis) + '">' + ic('print') + 'Cetak / PDF</button>' : '') +
      '<button class="btn" data-act="raporSimpanAdmin" data-nis="' + esc(nis) + '">' + ic('save') + 'Simpan</button></div></form>';
  }
  Act.raporVerif1 = async btn => { if (btn.dataset.a === 'tolak' && !(await konfirmasi('Kembalikan nilai ke sebelum diubah siswa?', { danger: true, ok: 'Tolak perubahan' }))) return; simpan(btn, 'rapor.verifikasi', { NIS: [btn.dataset.nis], aksi: btn.dataset.a }); };
  Act.raporSimpanAdmin = btn => {
    const fm = $('f-rapor'), nilai = bacaNilai(fm); if (!nilai) return;
    const g = n => { const x = fm.querySelector('[name="' + n + '"]'); return x ? x.value.trim() : ''; }, Absensi = {}, Ranking = {}, WaliKelas = {};
    let salah = false;
    fm.querySelectorAll('input[name^="ab_"],input[name^="rk_"]').forEach(x => { const v = x.value.trim(); if (v === '') return; if (!/^\d{1,3}$/.test(v)) { salah = true; x.classList.add('salah'); return; } const p = x.name.split('_');
      if (p[0] === 'ab') (Absensi[p[1]] = Absensi[p[1]] || {})[p[2]] = +v; else Ranking[p[1]] = +v; });
    if (salah) { toast('Ketidakhadiran dan peringkat harus berupa angka.', 'warn'); return; }
    ['X', 'XI', 'XII'].forEach(k => { const v = g('wk_' + k); if (v) WaliKelas[k] = v; });
    simpan(btn, 'rapor.simpan', { NIS: btn.dataset.nis, Nama: g('Nama'), NISN: g('NISN'), TTL: g('TTL'), Program: g('Program'), Konsentrasi: g('Konsentrasi'), Catatan: g('Catatan'), Nilai: nilai, Absensi, Ranking, WaliKelas });
  };
  Act.raporHapus = async btn => { if (await konfirmasi('Hapus seluruh data nilai rapor siswa ini?', { danger: true, ok: 'Hapus' })) { const r = await simpan(btn, 'rapor.hapus', { NIS: btn.dataset.nis }, { reload: false }); if (r && r.success) { App.dirty = false; App.go('#/rapor'); } } };
  Act.raporCetakPilih = () => {
    const m = semuaNis(), n = terpilih().filter(x => m[x]), list = (n.length ? n : Object.keys(m).filter(x => m[x])).map(x => ({ rec: m[x], nis: x }));
    if (!list.length) { toast('Belum ada data rapor untuk dicetak.', 'warn'); return; }
    cetakRapor(list.sort((a, b) => String(a.rec.Nama).localeCompare(b.rec.Nama)));
  };
  Act.raporEkspor = () => {
    const st = struktur(), sem = semua(st), m = semuaNis(), rows = [];
    Object.keys(m).filter(n => m[n]).forEach((n, i) => {
      const rec = m[n], h = hitung(rec, st), o = { No: i + 1, NIS: n, NISN: rec.NISN || '', 'Nama Siswa': rec.Nama || nmSiswa(n), 'Tempat Tanggal Lahir': rec.TTL || '' };
      st.kelompok.forEach(g => (g.item || []).forEach(it => { [it].concat(it.sub || []).forEach(x => { (x.sem || []).forEach(k => (o[x.nama + ' · S' + k] = (rec.Nilai[x.id] || {})[k] === undefined ? '' : rec.Nilai[x.id][k])); }); o[it.nama + ' · Rata2'] = h.item[it.id].rata === null ? '' : Math.round(h.item[it.id].rata * 100) / 100; }));
      sem.forEach(k => (o['Jumlah S' + k] = h.jumlah[k] || '')); sem.forEach(k => (o['Rata2 S' + k] = h.rataSem[k] === null ? '' : Math.round(h.rataSem[k] * 100) / 100));
      o['Rata-rata'] = h.total === null ? '' : Math.round(h.total * 100) / 100;
      sem.concat([6]).forEach(k => ['I', 'S', 'A'].forEach(j => (o['Sem' + k + ' ' + j] = ((rec.Absensi || {})[k] || {})[j] == null ? '' : rec.Absensi[k][j])));
      ['X', 'XI', 'XII'].forEach(k => (o['Wali Kelas ' + k] = (rec.WaliKelas || {})[k] || '')); sem.forEach(k => (o['Peringkat S' + k] = (rec.Ranking || {})[k] || ''));
      o.Status = rec.Status || ''; rows.push(o);
    });
    if (!rows.length) { toast('Belum ada data rapor.', 'warn'); return; }
    eksporXlsx({ 'Nilai Rapor': rows }, 'Rekapitulasi Nilai Raport');
  };
  Act.raporPkl = async btn => {
    const st = struktur(), it = st.kelompok.flatMap(g => g.item || []).find(x => x.id === 'pkl' || /praktik kerja lapangan|^pkl$/i.test(x.nama));
    if (!it) { toast('Mata pelajaran PKL tidak ada di struktur rapor.', 'warn'); return; }
    const k = (it.sem || []).slice(-1)[0], rows = [];
    S.data.siswa.forEach(s => { const v = ['1', '2'].map(p => rekap(s.NIS, p)).filter(rk => rk.pen && rk.kunci && rk.akhir).map(rk => rk.akhir); if (v.length) rows.push({ NIS: s.NIS, Nama: s.Nama, Nilai: { [it.id]: { [k]: Math.round(v.reduce((a, b) => a + b, 0) / v.length) } } }); });
    if (!rows.length) { toast('Belum ada nilai akhir PKL yang sudah ditutup (dikunci).', 'warn'); return; }
    if (!(await konfirmasi('Isi nilai <b>' + esc(it.nama) + '</b> semester ' + k + ' untuk <b>' + rows.length + ' siswa</b> dari nilai akhir PKL di SIGAPKL (hanya nilai yang sudah ditutup)? Nilai mata pelajaran lain tidak berubah.', { ok: 'Isi nilai PKL' }))) return;
    simpan(btn, 'rapor.impor', { rows, timpa: true });
  };

  /* ---------- Pengaturan ---------- */
  Act.raporAtur = () => {
    const c = cfg();
    formModal({ title: 'Pengaturan Nilai Rapor', icon: 'tune', action: 'rapor.atur', size: 'lg',
      fields: [{ name: 'tampil', label: 'Tampilkan nilai rapor ke siswa & guru', type: 'select', kosong: false, value: c.tampil ? '1' : '0', options: [{ v: '1', l: 'Ya, tampilkan' }, { v: '0', l: 'Tidak, sembunyikan dulu' }] },
        { name: 'izinSemua', label: 'Izinkan siswa mengisi / mengubah', type: 'select', kosong: false, value: c.izinSemua ? '1' : '0', options: [{ v: '0', l: 'Hanya siswa yang diizinkan satu per satu' }, { v: '1', l: 'Semua siswa' }] },
        { name: 'izinSampai', label: 'Batas waktu pengisian siswa (opsional)', type: 'date', value: c.izinSampai },
        { name: 'desimal', label: 'Pembulatan rata-rata', type: 'select', kosong: false, value: String(c.desimal || 0), options: [{ v: '0', l: 'Bilangan bulat (seperti berkas sekolah)' }, { v: '1', l: '1 angka desimal' }, { v: '2', l: '2 angka desimal' }] },
        { name: 'judul', label: 'Judul lembar', value: c.judul, full: true },
        { name: 'program', label: 'Program studi keahlian (bawaan)', value: c.program }, { name: 'konsentrasi', label: 'Konsentrasi keahlian (bawaan)', value: c.konsentrasi },
        { name: 'kota', label: 'Kota (tanda tangan)', value: c.kota, ph: 'Ketapang' }, { name: 'tanggal', label: 'Tanggal (tanda tangan)', value: c.tanggal, ph: '20 Juni 2026' }],
      olah: d => ({ cfg: { tampil: d.tampil === '1', izinSemua: d.izinSemua === '1', izinSampai: d.izinSampai, desimal: +d.desimal, judul: d.judul, program: d.program, konsentrasi: d.konsentrasi, kota: d.kota, tanggal: d.tanggal } }) });
  };

  /* ---------- Struktur mata pelajaran ---------- */
  Act.raporStruktur = () => {
    const st = JSON.parse(JSON.stringify(struktur())), sem = semua(st);
    const cek = (x, cls) => '<span class="rp-sems">' + sem.map(k => '<label title="Semester ' + k + '"><input type="checkbox" data-s="' + k + '"' + ((x.sem || []).indexOf(k) > -1 ? ' checked' : '') + '>' + k + '</label>').join('') + '</span>';
    const baris = (x, sub) => '<div class="rp-srow' + (sub ? ' sub' : '') + '" data-row data-id="' + esc(x.id || '') + '" data-kind="' + (sub ? 'sub' : 'item') + '"><input class="input" data-f="no" maxlength="12" aria-label="Nomor" value="' + esc(x.no || '') + '"><input class="input" data-f="nama" maxlength="120" aria-label="Nama mata pelajaran" placeholder="Nama mata pelajaran" value="' + esc(x.nama || '') + '">' + cek(x) +
      (sub ? '' : '<button type="button" class="btn ghost xs" data-act="rpTambahSub" title="Tambah sub mata pelajaran">' + ic('subdirectory_arrow_right') + '</button>') + '<button type="button" class="btn ghost xs" data-act="rpHapusBaris" aria-label="Hapus">' + ic('close') + '</button></div>';
    const grup = (g, i) => '<div class="rp-sgrp" data-g="' + i + '" data-gid="' + esc(g.id) + '"><div class="row gap-s"><input class="input" data-f="gno" maxlength="6" style="width:60px" value="' + esc(g.no || '') + '" aria-label="Nomor kelompok"><input class="input grow" data-f="gnama" maxlength="120" value="' + esc(g.nama || '') + '" aria-label="Nama kelompok"></div>' +
      '<div class="rp-slist">' + (g.item || []).map(it => baris(it) + (it.sub || []).map(x => baris(x, true)).join('')).join('') + '</div><button type="button" class="btn ghost sm mt-s" data-act="rpTambahMapel">' + ic('add') + 'Tambah mata pelajaran</button></div>';
    const m = modal({ title: 'Mata Pelajaran Rapor', icon: 'account_tree', size: 'lg',
      body: '<p class="small muted" style="margin-top:0">Atur nama dan semester tiap mata pelajaran. Kotak angka = semester yang memiliki nilai. Sub mata pelajaran (mis. Muatan Lokal) dirata-ratakan menjadi nilai induknya. Menghapus mata pelajaran tidak menghapus nilai yang sudah tersimpan.</p>' +
        st.kelompok.map(grup).join('') + '<template id="tpl-rp-item">' + baris({ sem }) + '</template><template id="tpl-rp-sub">' + baris({ sem }, true) + '</template>',
      foot: '<button class="btn ghost" data-x>Batal</button><button class="btn ghost" data-act="rpStrukturBawaan">' + ic('restart_alt') + 'Kembalikan bawaan</button><button class="btn" data-ok>' + ic('save') + 'Simpan</button>' });
    m.el.querySelector('[data-ok]').onclick = e => {
      const slug = t => (t.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 14) || 'mp') + Math.random().toString(36).slice(2, 6);
      const kelompok = [...m.el.querySelectorAll('.rp-sgrp')].map((gEl, i) => {
        const g = { id: gEl.dataset.gid, no: gEl.querySelector('[data-f=gno]').value.trim(), nama: gEl.querySelector('[data-f=gnama]').value.trim(), item: [] }; let induk = null;
        gEl.querySelectorAll('[data-row]').forEach(r => {
          const nama = r.querySelector('[data-f=nama]').value.trim(); if (!nama) return;
          const x = { id: r.dataset.id || slug(nama), no: r.querySelector('[data-f=no]').value.trim(), nama, sem: [...r.querySelectorAll('[data-s]:checked')].map(c => +c.dataset.s) };
          if (r.dataset.kind === 'sub' && induk) (induk.sub = induk.sub || []).push(x); else if (r.dataset.kind !== 'sub') { induk = x; g.item.push(x); }
        });
        return g;
      });
      const kosong = kelompok.flatMap(g => g.item.flatMap(it => [it].concat(it.sub || []))).find(x => !x.sem.length);
      if (kosong) { toast('"' + kosong.nama + '": centang minimal satu semester.', 'warn'); return; }
      simpan(e.currentTarget, 'rapor.atur', { struktur: { kelas: st.kelas, kelompok } }, { tutup: m.close });
    };
  };
  Act.rpTambahMapel = el => { const t = $('tpl-rp-item'); el.closest('.rp-sgrp').querySelector('.rp-slist').appendChild(t.content.cloneNode(true)); };
  Act.rpTambahSub = el => { const t = $('tpl-rp-sub'), row = el.closest('[data-row]'); let akhir = row; while (akhir.nextElementSibling && akhir.nextElementSibling.dataset.kind === 'sub') akhir = akhir.nextElementSibling; akhir.after(t.content.cloneNode(true)); };
  Act.rpHapusBaris = el => { const r = el.closest('[data-row]'); if (r.dataset.kind !== 'sub') { while (r.nextElementSibling && r.nextElementSibling.dataset.kind === 'sub') r.nextElementSibling.remove(); } r.remove(); };
  Act.rpStrukturBawaan = async btn => { if (await konfirmasi('Kembalikan daftar mata pelajaran ke bawaan (sesuai templat sekolah)?', { ok: 'Kembalikan' })) { document.querySelector('.modal [data-x]') && document.querySelector('.modal [data-x]').click(); simpan(btn, 'rapor.atur', { struktur: RAPOR_BAWAAN() }); } };
  const RAPOR_BAWAAN = () => ({ kelas: [{ nama: 'KELAS X', sem: [1, 2] }, { nama: 'KELAS XI', sem: [3, 4] }, { nama: 'KELAS XII', sem: [5] }], kelompok: [
    { id: 'umum', no: '1', nama: 'KELOMPOK MATA PELAJARAN UMUM', item: [['agama', '1.1', 'Pendidikan Agama dan Budi Pekerti', [1, 2, 3, 4, 5]], ['pancasila', '1.2', 'Pendidikan Pancasila', [1, 2, 3, 4, 5]], ['bindo', '1.3', 'Bahasa Indonesia', [1, 2, 3, 4, 5]],
      ['pjok', '1.4', 'Pendidikan Jasmani, Olahraga dan Kesehatan', [1, 2, 3, 4]], ['sejarah', '1.5', 'Sejarah', [1, 2, 3, 4]], ['senbud', '1.6', 'Seni Budaya', [1, 2]]].map(x => ({ id: x[0], no: x[1], nama: x[2], sem: x[3] }))
      .concat([{ id: 'mulok', no: '1.7', nama: 'Muatan Lokal', sem: [1, 2, 3, 4, 5], sub: [{ id: 'mulok1', no: '1.7.1', nama: 'Keterampilan Mengetik Sepuluh Jari', sem: [1, 2, 3, 4, 5] }, { id: 'mulok2', no: '1.7.2', nama: 'Ketapang Tanah Kayong', sem: [1, 2, 3, 4, 5] }] }]) },
    { id: 'kejuruan', no: '2', nama: 'KELOMPOK MATA PELAJARAN KEJURUAN', item: [['mtk', '2.1', 'Matematika', [1, 2, 3, 4, 5]], ['bing', '2.2', 'Bahasa Inggris', [1, 2, 3, 4, 5]], ['informatika', '2.3', 'Informatika', [1, 2]], ['ipas', '2.4', 'Projek Ilmu Pengetahuan Alam dan Sosial', [1, 2]],
      ['ddpk', '2.5', 'Dasar - Dasar Program Keahlian', [1, 2]], ['kk', '2.6', 'Konsentrasi Keahlian', [3, 4, 5]], ['pkk', '2.7', 'Projek Kreatif dan Kewirausahaan', [3, 4, 5]], ['pkl', '2.8', 'Praktik Kerja Lapangan', [5]]].map(x => ({ id: x[0], no: x[1], nama: x[2], sem: x[3] }))
      .concat([{ id: 'pilihan', no: '2.9', nama: 'Mata Pelajaran Pilihan', sem: [3, 4, 5], sub: [{ id: 'pilihan1', no: '2.9.1', nama: 'Pemrograman Web', sem: [3, 4, 5] }] }]) }] });

  /* ---------- Impor Excel (format rekap nilai sekolah) ---------- */
  const norm = t => String(t == null ? '' : t).toLowerCase().replace(/[^a-z0-9]+/g, '');
  const ALIAS = { pancasila: ['pendidikanpancasila', 'pkn', 'ppkn', 'pendidikankewarganegaraan'], agama: ['pendidikanagama', 'agama'], bindo: ['bahasaindonesia'], pjok: ['pjok', 'penjas', 'pendidikanjasmani'],
    ipas: ['ipas', 'projekilmupengetahuanalamdansosial'], pkl: ['pkl', 'praktikkerjalapangan'], kk: ['konsentrasikeahlian'], pkk: ['projekkreatifdankewirausahaan', 'pkk'], ddpk: ['dasardasarprogramkeahlian', 'dasarprogramkeahlian'],
    mulok: ['muatanlokal', 'mulok'], pilihan: ['matapelajaranpilihan', 'mapelpilihan'], mtk: ['matematika'], bing: ['bahasainggris'], senbud: ['senibudaya'], informatika: ['informatika'], sejarah: ['sejarah'] };
  function cariMapel(label, st) {
    const L = norm(label); if (!L) return null;
    const semuaItem = st.kelompok.flatMap(g => (g.item || []).flatMap(it => [it].concat(it.sub || [])));
    let hit = semuaItem.find(x => norm(x.nama) === L || norm(x.label) === L || x.id === L) || semuaItem.find(x => (ALIAS[x.id] || []).indexOf(L) > -1);
    if (!hit) hit = semuaItem.find(x => { const n = norm(x.nama); return n.length >= 6 && (L.indexOf(n) === 0 || n.indexOf(L) === 0); }) || semuaItem.find(x => (ALIAS[x.id] || []).some(a => a.length >= 3 && L.indexOf(a) === 0));
    return hit || null;
  }
  function bacaRekap(rows, st) {
    let r0 = rows.findIndex(r => r.some(v => norm(v) === 'nis') && r.some(v => /nama/.test(norm(v)))); if (r0 < 0) throw new Error('Baris judul tidak ditemukan. Pastikan ada kolom "NIS" dan "NAMA SISWA".');
    const h1 = rows[r0], h2 = rows[r0 + 1] || [], lebar = Math.max(h1.length, h2.length), label = [], peta = [], abaikan = {};
    let akhir = '';
    for (let c = 0; c < lebar; c++) { if (h1[c] !== '' && h1[c] != null) akhir = String(h1[c]); label[c] = akhir; }
    for (let c = 0; c < lebar; c++) {
      const L = norm(label[c]), sub = String(h2[c] == null ? '' : h2[c]).trim(), subN = norm(sub);
      if (L === 'no' || L === 'nomor') continue;
      if (L === 'nis') { peta[c] = { f: 'NIS' }; continue; } if (L === 'nisn') { peta[c] = { f: 'NISN' }; continue; } if (L === 'nisnisn') { peta[c] = { f: 'NISNISN' }; continue; }
      if (/^nama/.test(L)) { peta[c] = { f: 'Nama' }; continue; } if (/tempattanggallahir|ttl/.test(L)) { peta[c] = { f: 'TTL' }; continue; }
      if (/^jumlah|^rata/.test(L)) continue;
      const ms = L.match(/^semester(\d)$/); if (ms && /^[isa]$/.test(subN)) { peta[c] = { f: 'ABS', k: ms[1], j: subN.toUpperCase() }; continue; }
      if (/walikelas/.test(L) && /^(x|xi|xii)$/.test(subN)) { peta[c] = { f: 'WALI', k: subN.toUpperCase() }; continue; }
      if (/rangking|ranking|peringkat/.test(L) && /^\d$/.test(subN)) { peta[c] = { f: 'RANK', k: subN }; continue; }
      if (/rangking|ranking|peringkat|walikelas|^semester\d$/.test(L)) continue;
      const it = cariMapel(label[c], st);
      if (!it) { if (label[c]) abaikan[label[c]] = 1; continue; }
      if (/^rata/.test(subN)) continue;
      const k = /^\d$/.test(subN) ? +subN : (!subN && (it.sem || []).length === 1 ? it.sem[0] : null);
      if (k && (it.sem || []).indexOf(k) > -1) peta[c] = { f: 'N', id: it.id, k, nama: it.nama }; else if (k) abaikan[label[c] + ' (semester ' + k + ' tidak ada di struktur)'] = 1;
    }
    const hasil = [];
    for (let i = r0 + 2; i < rows.length; i++) {
      const r = rows[i], o = { NIS: '', Nilai: {}, Absensi: {}, Ranking: {}, WaliKelas: {} };
      peta.forEach((p, c) => {
        if (!p) return; const v = r[c]; if (v === '' || v == null) return; const t = String(v).trim();
        if (p.f === 'NIS') o.NIS = t.replace(/\.0+$/, ''); else if (p.f === 'NISN') o.NISN = o.NISN || t.replace(/\.$/, ''); else if (p.f === 'NISNISN') { const b = t.split('/'); if (b[1] && b[1].trim()) o.NISN = b[1].trim().replace(/\.$/, ''); if (!o.NIS && b[0].trim()) o.NIS = b[0].trim(); }
        else if (p.f === 'Nama') o.Nama = t; else if (p.f === 'TTL') o.TTL = t;
        else if (p.f === 'ABS') { const n = +t; if (isFinite(n)) (o.Absensi[p.k] = o.Absensi[p.k] || {})[p.j] = n; }
        else if (p.f === 'WALI') o.WaliKelas[p.k] = t; else if (p.f === 'RANK') { const n = +t; if (n >= 1) o.Ranking[p.k] = n; }
        else if (p.f === 'N') { const n = +String(t).replace(',', '.'); if (isFinite(n) && n > 0 && n <= 100) (o.Nilai[p.id] = o.Nilai[p.id] || {})[p.k] = n; }
      });
      if (!/^[0-9A-Za-z.\-]{3,30}$/.test(o.NIS) || !o.Nama) continue;     // lewati baris nomor kolom / baris kosong
      hasil.push(o);
    }
    const mapel = {}; peta.forEach(p => { if (p && p.f === 'N') (mapel[p.nama] = mapel[p.nama] || []).push(p.k); });
    return { hasil, mapel, abaikan: Object.keys(abaikan), info: { abs: peta.some(p => p && p.f === 'ABS'), wali: peta.some(p => p && p.f === 'WALI'), rank: peta.some(p => p && p.f === 'RANK') } };
  }
  /* ---------- Templat Excel: tata letak SAMA dengan berkas "Rekapitulasi Nilai Raport" sekolah ----------
   * No. | NIS | NISN | NIS / NISN | NAMA SISWA | TEMPAT TANGGAL LAHIR | mapel (semester… + Rata2) per kelompok + "Rata - Rata Kelompok …"
   * | JUMLAH NILAI Sem1… | RATA2 NILAI Sem1… | Semester 1…6 (I,S,A) | WALI KELAS (X,XI,XII) | RANGKING 1…  — baris 3 = nomor kolom.
   * Kolom hitungan (Rata2, rata-rata kelompok, jumlah, rata2 nilai) diisi nilai hitungan aplikasi dan DIABAIKAN saat impor. */
  const judulKel = t => String(t || '').toLowerCase().replace(/(^|\s)\S/g, x => x.toUpperCase());
  function templatAoa(st, data) {
    const sem = semua(st), d = +cfg().desimal || 0, h1 = [], h2 = [], kol = [], merges = [];
    const bulat = v => v === null || v === undefined ? '' : Math.round(v * Math.pow(10, d)) / Math.pow(10, d);
    const nilai = v => v === null || v === undefined ? '' : Math.round(v * 100) / 100;
    const satu = (label, isi) => { const c = h1.length; h1.push(label); h2.push(''); kol.push(isi); merges.push({ s: { r: 0, c }, e: { r: 1, c } }); };
    const grup = (label, subs, isi) => { const c0 = h1.length; subs.forEach((x, i) => { h1.push(i ? '' : label); h2.push(x); kol.push(isi(x)); }); if (subs.length > 1) merges.push({ s: { r: 0, c: c0 }, e: { r: 0, c: c0 + subs.length - 1 } }); };
    satu('No.', c => c.i + 1); satu('NIS', c => c.nis); satu('NISN', c => c.nisn); satu('NIS / NISN', c => c.nis + (c.nisn ? ' / ' + c.nisn : ''));
    satu('NAMA SISWA', c => c.nama); satu('TEMPAT TANGGAL LAHIR', c => c.ttl);
    st.kelompok.forEach(g => {
      // seperti berkas sekolah: mapel satu kolom (mis. PKL) ditaruh di akhir kelompoknya
      (g.item || []).filter(it => (it.sem || []).length > 1).concat((g.item || []).filter(it => (it.sem || []).length <= 1)).forEach(it => {
        const lbl = it.label || it.nama, ss = (it.sem || []).slice();
        if (ss.length === 1) satu(lbl, c => nilai(c.h.item[it.id].sem[ss[0]]));
        else grup(lbl, ss.concat(['Rata2']), x => x === 'Rata2' ? c => bulat(c.h.item[it.id].rata) : c => nilai(c.h.item[it.id].sem[x]));
      });
      satu('Rata - Rata ' + judulKel(g.nama), c => bulat(c.h.grup[g.id].rata));
    });
    grup('JUMLAH \nNILAI', sem.map(k => 'Sem' + k), x => c => bulat(c.h.jumlah[+x.slice(3)]));
    grup('RATA2\nNILAI', sem.map(k => 'Sem' + k), x => c => bulat(c.h.rataSem[+x.slice(3)]));
    sem.concat(sem.indexOf(6) < 0 ? [6] : []).forEach(k => grup('Semester ' + k, ['I', 'S', 'A'], j => c => { const v = (((c.rec && c.rec.Absensi) || {})[k] || {})[j]; return v === undefined ? '' : v; }));
    grup('WALI KELAS', ['X', 'XI', 'XII'], k => c => ((c.rec && c.rec.WaliKelas) || {})[k] || '');
    grup('RANGKING', sem.map(String), k => c => { const v = ((c.rec && c.rec.Ranking) || {})[k]; return v === undefined ? '' : v; });
    const nomor = h1.map((x, i) => i + 1);
    const baris = data.map((x, i) => { const rec = x.rec || null, c = { i, rec, h: hitung(rec, st), nis: String(x.nis), nisn: String((rec && rec.NISN) || x.nisn || ''), nama: (rec && rec.Nama) || x.nama || '', ttl: (rec && rec.TTL) || '' }; return kol.map(f => f(c)); });
    return { aoa: [h1, h2, nomor].concat(baris), merges, lebar: h1.length };
  }
  Act.raporTemplat = async () => {
    try { await muatXlsx(); } catch (e) { toast('Pustaka Excel gagal dimuat. Periksa koneksi.', 'bad'); return; }
    const m = semuaNis(), data = Object.keys(m).map(n => ({ nis: n, rec: m[n], nama: nmSiswa(n), nisn: (S.ix.siswa[n] || {}).NISN }))
      .sort((a, b) => String((a.rec && a.rec.Nama) || a.nama).localeCompare(String((b.rec && b.rec.Nama) || b.nama)));
    const t = templatAoa(struktur(), data), ws = XLSX.utils.aoa_to_sheet(t.aoa);
    ws['!merges'] = t.merges; ws['!cols'] = [{ wch: 4 }, { wch: 8 }, { wch: 12 }, { wch: 20 }, { wch: 28 }, { wch: 26 }].concat(Array(t.lebar - 6).fill({ wch: 5 }));
    ws['!freeze'] = { xSplit: 5, ySplit: 3 };
    const info = XLSX.utils.aoa_to_sheet([['PETUNJUK PENGISIAN TEMPLAT NILAI RAPOR'], [''], ['Tata letak templat ini SAMA dengan berkas "Rekapitulasi Nilai Raport" sekolah, jadi data bisa disalin-tempel langsung dari berkas sekolah.'], [''],
      ['1. Jangan mengubah baris judul (baris 1–2) dan jangan menyisipkan atau menggeser kolom. Baris 3 (nomor kolom) boleh dibiarkan.'], ['2. Satu baris untuk satu siswa. NIS wajib sama dengan NIS di aplikasi SIGAPKL.'],
      ['3. Isi nilai 0–100 di kolom semester (1, 2, 3, …) setiap mata pelajaran. Kosongkan bila belum ada nilai.'], ['4. Kolom Rata2, Rata-rata Kelompok, JUMLAH NILAI, dan RATA2 NILAI dihitung otomatis oleh aplikasi; boleh dikosongkan, isinya diabaikan saat impor.'],
      ['5. Kolom Semester 1–6 (I/S/A) = jumlah hari izin, sakit, tanpa keterangan. WALI KELAS diisi nama. RANGKING diisi angka peringkat per semester.'],
      ['6. Simpan, lalu unggah lewat menu Nilai Rapor → Impor Excel. Berkas rekap asli sekolah juga dapat diimpor langsung tanpa templat ini.'], [''], ['Templat ini sudah berisi data yang tersimpan saat diunduh (' + new Date().toLocaleString('id-ID') + ').']]);
    info['!cols'] = [{ wch: 95 }];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Nilai Rapor'); XLSX.utils.book_append_sheet(wb, info, 'Petunjuk');
    XLSX.writeFile(wb, 'Templat Nilai Rapor SIGAPKL.xlsx');
    toast('Templat Excel diunduh (' + data.length + ' siswa).', 'ok');
  };
  Act.raporImpor = () => {
    const m = modal({ title: 'Impor Nilai Rapor dari Excel', icon: 'upload_file', size: 'lg',
      body: '<p class="small muted" style="margin-top:0">Gunakan berkas rekap nilai sekolah (satu baris per siswa, kolom per mata pelajaran dan semester). Kolom dikenali dari judulnya: NIS, NISN, Nama Siswa, Tempat Tanggal Lahir, mata pelajaran (semester 1–5), Semester I/S/A, Wali Kelas, Rangking. Kolom jumlah dan rata-rata dihitung ulang oleh aplikasi.</p>' +
        '<div class="alert info mb">' + ic('download') + '<div class="grow"><p class="small">Belum punya berkas? Unduh templat dari aplikasi: sudah berisi daftar siswa dan nilai yang tersimpan, tinggal diisi atau diperbaiki lalu diunggah kembali.</p></div><button type="button" class="btn sec sm" data-act="raporTemplat">' + ic('download') + 'Unduh templat</button></div>' +
        '<div class="field"><label for="rp-file">Berkas Excel (.xlsx / .xls / .csv)</label><input type="file" id="rp-file" class="input" accept=".xlsx,.xls,.csv"></div><div id="rp-pratinjau"></div>',
      foot: '<button class="btn ghost" data-x>Batal</button><button class="btn" data-ok disabled>' + ic('upload') + 'Impor</button>' });
    let data = null; const ok = m.el.querySelector('[data-ok]');
    m.el.querySelector('#rp-file').onchange = async e => {
      const f = e.target.files[0], box = m.el.querySelector('#rp-pratinjau'); data = null; ok.disabled = true; if (!f) return;
      box.innerHTML = '<div class="skel" style="height:120px"></div>';
      try {
        await muatXlsx(); const wb = XLSX.read(await f.arrayBuffer(), { type: 'array', sheetRows: 1500 }), st = struktur();
        let pakai = null;
        for (const nm of wb.SheetNames) { const rows = XLSX.utils.sheet_to_json(wb.Sheets[nm], { header: 1, defval: '', raw: true }); try { const b = bacaRekap(rows, st); if (b.hasil.length && (!pakai || b.hasil.length > pakai.b.hasil.length)) pakai = { nm, b }; } catch (er) { /* lembar lain */ } }
        if (!pakai) throw new Error('Tidak ada lembar berisi data siswa (kolom NIS & Nama Siswa) di berkas ini.');
        const b = pakai.b, terdaftar = b.hasil.filter(x => S.ix.siswa[x.NIS]).length, adaRapor = b.hasil.filter(x => (R.list || []).some(r => r.NIS === x.NIS)).length;
        data = b.hasil; ok.disabled = false; ok.innerHTML = ic('upload') + 'Impor ' + b.hasil.length + ' siswa';
        box.innerHTML = '<div class="alert info mt">' + ic('task_alt') + '<div><h4>Lembar "' + esc(pakai.nm) + '": ' + b.hasil.length + ' siswa terbaca</h4><p class="small">' + terdaftar + ' cocok dengan siswa di aplikasi' + (b.hasil.length - terdaftar ? ', ' + (b.hasil.length - terdaftar) + ' belum terdaftar (tetap disimpan dan terlihat setelah siswanya didaftarkan)' : '') + '. ' + adaRapor + ' sudah memiliki data rapor.</p></div></div>' +
          '<div class="small mt"><b>Mata pelajaran dikenali:</b> ' + Object.keys(b.mapel).map(k => esc(k) + ' <span class="muted">(S' + b.mapel[k].join(', S') + ')</span>').join(' · ') + '</div>' +
          '<div class="small mt-s"><b>Data lain:</b> ' + [b.info.abs ? 'ketidakhadiran' : '', b.info.wali ? 'wali kelas' : '', b.info.rank ? 'peringkat' : ''].filter(Boolean).join(', ') + '</div>' +
          (b.abaikan.length ? '<div class="alert warn mt-s">' + ic('info') + '<div><p class="small">Kolom tidak dikenali dan dilewati: ' + b.abaikan.map(esc).join(', ') + '. Tambahkan mata pelajarannya di menu "Mata pelajaran" bila perlu, lalu impor ulang.</p></div></div>' : '') +
          '<label class="check small mt"><input type="checkbox" id="rp-timpa" checked> Timpa nilai yang sudah ada dengan nilai dari berkas</label>' +
          '<div class="tbl-wrap mt-s" style="max-height:260px"><table class="tbl compact"><thead><tr><th>NIS</th><th>Nama</th><th class="num">Jumlah nilai</th><th>Terdaftar</th></tr></thead><tbody>' + b.hasil.slice(0, 200).map(x => '<tr><td class="mono small">' + esc(x.NIS) + '</td><td class="small">' + esc(x.Nama) + '</td><td class="num">' + Object.keys(x.Nilai).reduce((a, k) => a + Object.keys(x.Nilai[k]).length, 0) + '</td><td>' + (S.ix.siswa[x.NIS] ? pill('Ya', 'ok') : pill('Belum', 'warn')) + '</td></tr>').join('') + '</tbody></table></div>';
      } catch (er) { box.innerHTML = '<div class="alert bad mt">' + ic('error') + '<div><p class="small">' + esc(er.message || 'Berkas tidak dapat dibaca.') + '</p></div></div>'; }
    };
    ok.onclick = e => { if (!data) return; simpan(e.currentTarget, 'rapor.impor', { rows: data, timpa: m.el.querySelector('#rp-timpa').checked }, { tutup: m.close }); };
  };

  window.Rapor = { hitung, bacaRekap, struktur, templatAoa, lembarHtml: (rec, nis) => GAYA_CETAK + lembar(rec, nis) };
})();
