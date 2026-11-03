/* SIGAPKL · Halaman ADMIN / KOORDINATOR PKL */
(function () {
  'use strict';
  const D = () => S.data;
  const opsiDudi = () => D().dudi.map(d => ({ v: d.DUDIID, l: d.Nama }));
  const opsiGuru = () => D().guru.map(g => ({ v: g.GuruID, l: g.Nama + (g.NIP ? ' · ' + g.NIP : '') }));
  const opsiSiswa = (filter) => D().siswa.filter(filter || (() => true)).map(s => ({ v: s.NIS, l: s.Nama + ' · ' + s.NIS + ' · ' + (s.Kelas || '') }));
  const pekerjaan = () => String(P('PEKERJAAN_SPESIFIK') || '').split(';').map(x => x.trim()).filter(Boolean);
  const terisi = (dudi, p) => D().penempatan.filter(x => x.DUDIID === dudi && String(x.Periode) === String(p)).length;
  const tblWrap = (head, rows, kosong) => rows.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + head.map(h => '<th' + (/^#/.test(h) ? ' class="num"' : '') + '>' + esc(h.replace(/^#/, '')) + '</th>').join('') + '</tr></thead><tbody>' + rows.join('') + '</tbody></table></div>' : '<div class="card empty">' + ic('inbox') + esc(kosong || 'Belum ada data.') + '</div>';
  window.tblWrap = tblWrap;
  const aksiBtn = (act, id, icon, cls, title) => '<button class="btn ' + (cls || 'ghost') + ' xs" data-act="' + act + '" data-id="' + esc(id) + '" title="' + esc(title || '') + '">' + ic(icon) + '</button>';

  /* ======================= DASHBOARD ======================= */
  Pages['ADMIN:dashboard'] = {
    render() {
      const d = D(), pa = periodeAktif(), pen = d.penempatan.filter(p => String(p.Periode) === pa), prg = d.peringatan.filter(p => p.Status === 'Belum ditangani');
      const kuota = d.dudi.filter(x => x.Status !== 'Nonaktif').reduce((a, x) => a + (+x.Kuota || 0), 0), belum = d.siswa.filter(s => !penOf(s.NIS, pa)).length;
      const per = {}; d.absensi.filter(a => String(a.Periode) === pa).forEach(a => { const k = +a.MingguKe || 0; const o = per[k] = per[k] || { h: 0, t: 0, a: 0 }; o.h += +a.Hadir; o.t += (+a.Hadir) + (+a.Izin) + (+a.Sakit) + (+a.Alfa); o.a += +a.Alfa; });
      const mg = Object.keys(per).map(Number).sort((a, b) => a - b).slice(-10);
      const komp = Object.keys(JENIS).map(j => ({ j, n: pen.filter(p => S.ix.nilai[p.NIS + '|' + pa + '|' + j]).length }));
      const totalKomp = pen.length * 6, sudah = komp.reduce((a, b) => a + b.n, 0), persen = totalKomp ? Math.round(sudah / totalKomp * 100) : 0;
      const perDudi = d.dudi.map(x => ({ x, n: terisi(x.DUDIID, pa) })).filter(o => o.n).sort((a, b) => b.n - a.n).slice(0, 6);
      const ag = d.presentasi.filter(p => p.Tanggal >= hariIni()).sort((a, b) => a.Tanggal.localeCompare(b.Tanggal)).slice(0, 4);
      const pesanBaru = d.pesan.filter(m => m.Status === 'Baru');
      return '<div class="with-panel"><div class="grid">' +
        '<div class="hero"><div class="row between wrap" style="position:relative;z-index:1"><div><h2>Halo, ' + esc(Sesi.me.nama.split(' ')[0]) + '! 👋</h2><p class="muted" style="margin:6px 0 0">Ringkasan PKL ' + esc(P('NAMA_SEKOLAH')) + ' · TA ' + esc(P('TAHUN_AJARAN')) + ' · Periode aktif ' + esc(pa) + '.</p></div><div class="actions"><a class="btn" href="#/penempatan">' + ic('add') + 'Atur Penempatan</a><a class="btn sec" href="#/rekap">' + ic('monitoring') + 'Rekap</a></div></div></div>' +
        '<div class="grid g4 keep2"><a class="tile t-teal" href="#/induk"><span class="ic">' + ic('groups') + '</span><div><div class="v">' + d.siswa.length + '</div><div class="l">Total siswa</div></div></a>' +
        '<a class="tile t-indigo" href="#/penempatan"><span class="ic">' + ic('hub') + '</span><div><div class="v">' + pen.length + '</div><div class="l">Sudah ditempatkan' + (belum ? ' · ' + belum + ' belum' : '') + '</div></div></a>' +
        '<a class="tile t-amber" href="#/dudi"><span class="ic">' + ic('apartment') + '</span><div><div class="v">' + d.dudi.length + '</div><div class="l">DUDI · sisa kuota ' + Math.max(0, kuota - pen.length) + '</div></div></a>' +
        '<a class="tile t-rose" href="#/peringatan"><span class="ic">' + ic('notification_important') + '</span><div><div class="v">' + prg.length + '</div><div class="l">Peringatan aktif</div></div></a></div>' +
        '<div class="grid g2"><div class="card"><div class="card-h"><h3 class="grow">Kehadiran per Minggu</h3>' + pill('Periode ' + pa, 'info') + '</div>' + (mg.length ? barChart({ label: 'Kehadiran', labels: mg.map(m => 'M' + m), max: 100, unit: '%', series: [{ name: 'Hadir %', color: Tema.c('teal-500'), values: mg.map(m => per[m].t ? Math.round(per[m].h / per[m].t * 100) : 0) }, { name: 'Alfa (hari)', color: '#F87171', values: mg.map(m => Math.min(100, per[m].a * 10)) }] }) + '<div class="xs muted">Batang merah = jumlah hari Alfa × 10 (skala visual).</div>' : '<div class="empty">' + ic('bar_chart') + 'Belum ada absensi.</div>') + '</div>' +
        '<div class="card"><div class="card-h"><h3 class="grow">Progres Penilaian</h3><a class="small b" href="#/nilai">Detail</a></div>' + donut({ center: persen + '%', sub: 'komponen', total: Math.max(pen.length, 1), segments: komp.map((k, i) => ({ label: JENIS[k.j], value: k.n, teks: k.n + '/' + pen.length, color: [Tema.c(), Tema.c('teal-500'), '#F59E0B', '#FB7185', '#6366F1', '#115E59'][i] })) }) + '</div></div>' +
        '<div class="grid g2"><div class="card"><div class="card-h"><h3 class="grow">Siswa per DUDI</h3><span class="small muted">Periode ' + pa + '</span></div>' + (perDudi.length ? '<div class="list">' + perDudi.map(o => '<div><div class="row between small"><b>' + esc(o.x.Nama) + '</b><span>' + o.n + ' / ' + esc(o.x.Kuota) + '</span></div><div class="bar mt-s ' + (o.n >= +o.x.Kuota ? 'amber' : '') + '"><i style="width:' + Math.min(100, o.n / Math.max(1, +o.x.Kuota) * 100) + '%"></i></div></div>').join('') + '</div>' : '<div class="empty small">Belum ada penempatan.</div>') + '</div>' +
        '<div class="card"><div class="card-h"><h3 class="grow">Peringatan Terbaru</h3><a class="small b" href="#/peringatan">Semua</a></div>' + (prg.length ? '<div class="list">' + prg.slice(0, 5).map(p => '<div class="li">' + av(nmSiswa(p.NIS), (S.ix.siswa[p.NIS] || {}).FotoURL, 'av-xs') + '<div class="grow"><div class="b small">' + esc(nmSiswa(p.NIS)) + '</div><div class="xs muted">' + esc(nmGuru((penOf(p.NIS, p.Periode) || {}).GuruID)) + '</div></div>' + pill((p.Jenis === 'ALFA' ? 'Alfa ' : 'Izin ') + p.Jumlah, p.Jenis === 'ALFA' ? 'bad' : 'warn') + '</div>').join('') + '</div>' : '<div class="empty small">' + ic('verified') + 'Tidak ada peringatan aktif.</div>') + '</div></div>' +
        '</div><div class="grid"><div class="card profile"><div class="profile-top"></div><div class="profile-av">' + esc(inisial(Sesi.me.nama)) + '</div><div class="body"><h3>' + esc(Sesi.me.nama) + '</h3><div class="small muted">Koordinator PKL · ' + esc(P('KOMPETENSI')) + '</div><div class="row mt-s" style="justify-content:center">' + pill('Admin', 'ok', true) + (Sesi.me.darurat ? pill('Akses darurat', 'bad') : '') + '</div></div></div>' +
        '<div class="card"><div class="card-h"><h3 class="grow">Agenda Presentasi</h3><a class="small b" href="#/presentasi">+ Atur</a></div>' + (ag.length ? '<div class="list">' + ag.map(p => '<div class="li"><div class="date-box"><div class="m">' + BLN[tglObj(p.Tanggal).getMonth()] + '</div><div class="d">' + tglObj(p.Tanggal).getDate() + '</div></div><div><div class="b small">' + esc(nmSiswa(p.NIS)) + '</div><div class="xs muted">' + esc(p.Jam || '') + ' · ' + esc(p.Ruang || '') + ' · ' + esc(nmGuru(p.PengujiID)) + '</div></div></div>').join('') + '</div>' : '<div class="empty small">Belum ada jadwal.</div>') + '</div>' +
        '<div class="card"><div class="card-h"><h3 class="grow">Notifikasi</h3></div>' + (pesanBaru.length ? pesanBaru.slice(0, 3).map(m => '<div class="alert bad" style="margin-bottom:8px">' + ic('emergency') + '<div><h4 class="small">' + esc(m.Subjek) + '</h4><p class="xs">' + esc(nmSiswa(m.NIS)) + ' → ' + esc(nmGuru(m.GuruID)) + '</p></div></div>').join('') : '<div class="alert">' + ic('check_circle') + '<p class="small">Tidak ada pesan darurat baru.</p></div>') +
        (belum ? '<div class="alert warn mt-s">' + ic('person_alert') + '<div><h4 class="small">' + belum + ' siswa belum ditempatkan</h4><p class="xs"><a href="#/penempatan">Atur penempatan sekarang</a></p></div></div>' : '') + '</div></div></div>';
    }
  };

  /* ======================= DUDI ======================= */
  Pages['ADMIN:dudi'] = {
    render(param) {
      const pa = periodeAktif(), f = param || 'semua';
      const rows = D().dudi.filter(x => cari(x, S.q)).filter(x => f === 'semua' || (f === 'penuh' ? terisi(x.DUDIID, pa) >= +x.Kuota : terisi(x.DUDIID, pa) < +x.Kuota));
      return head(ic('apartment') + ' Data Master', 'Data DUDI', 'Mitra Dunia Usaha & Dunia Industri: profil, lokasi, dan kuota per periode.', '<button class="btn ghost" data-act="go" data-href="#/migrasi/import">' + ic('upload_file') + 'Import Excel</button><button class="btn" data-act="formDudi">' + ic('add') + 'Tambah DUDI</button>') +
        '<div class="toolbar"><div class="seg">' + [['semua', 'Semua'], ['tersedia', 'Kuota tersedia'], ['penuh', 'Penuh']].map(o => '<button class="' + (f === o[0] ? 'on' : '') + '" data-act="go" data-href="#/dudi/' + o[0] + '">' + o[1] + '</button>').join('') + '</div><span class="small muted">' + rows.length + ' DUDI · kuota dihitung untuk Periode ' + pa + '</span></div>' +
        tblWrap(['Nama DUDI', 'Lokasi', 'Bidang', 'Kuota P' + pa, 'Instruktur', 'Status', ''], rows.map(x => {
          const n = terisi(x.DUDIID, pa), k = +x.Kuota || 0, inst = D().instruktur.filter(i => i.DUDIID === x.DUDIID);
          return '<tr><td><b>' + esc(x.Nama) + '</b><div class="xs muted">' + esc(x.Pimpinan || '') + ' ' + esc(x.Telepon || '') + '</div></td><td class="small">' + esc(x.Alamat || '-') + '<div class="xs muted">' + esc(x.Kota || '') + (x.LinkPeta ? ' · <a href="' + esc(x.LinkPeta) + '" target="_blank" rel="noopener">peta</a>' : '') + '</div></td>' +
            '<td class="small">' + esc(x.Bidang || '-') + '</td><td style="min-width:120px"><div class="row between small"><b>' + n + '/' + k + '</b>' + (n >= k ? pill('Penuh', 'warn') : '') + '</div><div class="bar mt-s ' + (n >= k ? 'amber' : '') + '"><i style="width:' + Math.min(100, n / Math.max(k, 1) * 100) + '%"></i></div></td>' +
            '<td class="small">' + (inst.map(i => esc(i.Nama)).join(', ') || '-') + '</td><td>' + pillStatus(x.Status || 'Aktif') + '</td><td class="right" style="white-space:nowrap">' + aksiBtn('formDudi', x.DUDIID, 'edit', 'ghost', 'Ubah') + ' ' + aksiBtn('hapusDudi', x.DUDIID, 'delete', 'ghost', 'Hapus') + '</td></tr>';
        }), 'Belum ada DUDI.');
    }
  };
  Act.formDudi = el => {
    const x = el.dataset.id ? S.ix.dudi[el.dataset.id] : {};
    formModal({ title: x.DUDIID ? 'Ubah DUDI' : 'Tambah DUDI', icon: 'apartment', action: 'dudi.simpan', size: 'lg', fields: [
      { name: 'Nama', label: 'Nama DUDI', req: true, value: x.Nama, full: true }, { name: 'Bidang', label: 'Bidang usaha', value: x.Bidang }, { name: 'Kuota', label: 'Kuota siswa per periode', type: 'number', min: 0, req: true, value: x.Kuota || 2 },
      { name: 'Alamat', label: 'Alamat', type: 'textarea', full: true, value: x.Alamat, rows: 2 }, { name: 'Kota', label: 'Kota/Kecamatan', value: x.Kota }, { name: 'Koordinat', label: 'Koordinat (lat, long)', value: x.Koordinat, ph: '-6.2088, 106.8456' },
      { name: 'LinkPeta', label: 'Link Google Maps', value: x.LinkPeta, full: true, ph: 'https://maps.app.goo.gl/…' }, { name: 'Pimpinan', label: 'Nama pimpinan / kontak', value: x.Pimpinan },
      { name: 'Telepon', label: 'Telepon / WA', value: x.Telepon }, { name: 'Email', label: 'Email', type: 'email', value: x.Email }, { name: 'Status', label: 'Status', type: 'select', options: ['Aktif', 'Nonaktif'], value: x.Status || 'Aktif', kosong: false }],
      olah: d => Object.assign(d, { DUDIID: x.DUDIID || '' }) });
  };
  Act.hapusDudi = async el => { if (await konfirmasi('Hapus DUDI <b>' + esc(nmDudi(el.dataset.id)) + '</b>?', { danger: true, ok: 'Hapus' })) simpan(el, 'dudi.hapus', { DUDIID: el.dataset.id }); };

  /* ======================= SISWA · GURU · INSTRUKTUR ======================= */
  Pages['ADMIN:induk'] = {
    render(param) {
      const tab = ['siswa', 'guru', 'instruktur'].indexOf(param) > -1 ? param : 'siswa', d = D();
      const tabs = '<div class="tabs">' + [['siswa', 'Siswa', d.siswa.length], ['guru', 'Guru Pembimbing', d.guru.length], ['instruktur', 'Instruktur Lapangan', d.instruktur.length]].map(t => '<button class="' + (t[0] === tab ? 'on' : '') + '" data-act="go" data-href="#/induk/' + t[0] + '">' + t[1] + ' ' + pill(t[2], 'mute') + '</button>').join('') + '</div>';
      const akunPill = (ref, peran) => S.ix.akun[ref + '|' + peran] ? pill('Ada akun', 'ok') : pill('Belum ada akun', 'warn');
      let isi;
      if (tab === 'siswa') isi = tblWrap(['Siswa', 'Kelas', 'Kontak', 'Wali', 'Penempatan', 'Akun', ''], d.siswa.filter(s => cari(s, S.q)).map(s => { const p = penOf(s.NIS);
        return '<tr><td><div class="who">' + av(s.Nama, s.FotoURL) + '<div><div class="n">' + esc(s.Nama) + '</div><div class="s">NIS ' + esc(s.NIS) + (s.Sumber ? ' · ' + esc(s.Sumber) : '') + '</div></div></div></td><td>' + esc(s.Kelas) + '</td><td class="small">' + esc(s.NoHP || '-') + '<div class="xs muted">' + esc(s.Email || '') + '</div></td><td class="small">' + esc(s.NamaWali || '-') + '<div class="xs muted">' + esc(s.NoHPWali || '') + '</div></td>' +
          '<td class="small">' + (p ? esc(nmDudi(p.DUDIID)) : pill('Belum', 'warn')) + '</td><td>' + akunPill(s.NIS, 'SISWA') + '</td><td class="right" style="white-space:nowrap">' + aksiBtn('formSiswa', s.NIS, 'edit') + ' ' + aksiBtn('hapusSiswa', s.NIS, 'delete') + '</td></tr>'; }), 'Belum ada data siswa. Sinkron dari E-Jurnal atau import Excel.');
      if (tab === 'guru') isi = tblWrap(['Guru', 'NIP', 'Kontak', '#Bimbingan', 'Akun', ''], d.guru.filter(g => cari(g, S.q)).map(g => '<tr><td><div class="who">' + av(g.Nama, '') + '<div class="n">' + esc(g.Nama) + '</div></div></td><td class="mono">' + esc(g.NIP || '-') + '</td><td class="small">' + esc(g.NoHP || '-') + '<div class="xs muted">' + esc(g.Email || '') + '</div></td>' +
        '<td class="num">' + d.penempatan.filter(p => p.GuruID === g.GuruID).length + '</td><td>' + akunPill(g.GuruID, 'GURU') + '</td><td class="right" style="white-space:nowrap">' + aksiBtn('formGuru', g.GuruID, 'edit') + ' ' + aksiBtn('hapusGuru', g.GuruID, 'delete') + '</td></tr>'), 'Belum ada data guru.');
      if (tab === 'instruktur') isi = tblWrap(['Instruktur', 'DUDI', 'Jabatan', 'Kontak', 'Akun', ''], d.instruktur.filter(i => cari(i, S.q)).map(i => '<tr><td><div class="who">' + av(i.Nama, '') + '<div><div class="n">' + esc(i.Nama) + '</div><div class="s">' + esc(i.InstrukturID) + '</div></div></div></td><td>' + esc(nmDudi(i.DUDIID)) + '</td><td class="small">' + esc(i.Jabatan || '-') + '</td><td class="small">' + esc(i.NoHP || '-') + '</td>' +
        '<td>' + akunPill(i.InstrukturID, 'INSTRUKTUR') + '</td><td class="right" style="white-space:nowrap">' + aksiBtn('formIns', i.InstrukturID, 'edit') + ' ' + aksiBtn('hapusIns', i.InstrukturID, 'delete') + '</td></tr>'), 'Belum ada data instruktur.');
      const tambah = { siswa: 'formSiswa', guru: 'formGuru', instruktur: 'formIns' }[tab];
      return head(ic('groups') + ' Data Master · Sumber E-Jurnal', 'Siswa · Guru · Instruktur', 'Data induk disalin dari E-Jurnal (hanya baca) atau ditambah manual/impor. Perubahan di sini tidak mengubah E-Jurnal.',
        '<button class="btn ghost" data-act="go" data-href="#/migrasi/ejurnal">' + ic('sync') + 'Sinkron E-Jurnal</button><button class="btn ghost" data-act="go" data-href="#/migrasi/import">' + ic('upload_file') + 'Import</button><button class="btn" data-act="' + tambah + '">' + ic('add') + 'Tambah</button>') + tabs + isi;
    }
  };
  Act.formSiswa = el => { const s = el.dataset.id ? S.ix.siswa[el.dataset.id] : {};
    formModal({ title: s.NIS ? 'Ubah Siswa' : 'Tambah Siswa', icon: 'person_add', action: 'siswa.simpan', size: 'lg', fields: [
      { name: 'NIS', label: 'NIS', req: true, value: s.NIS, attr: s.NIS ? ' readonly' : '' }, { name: 'NISN', label: 'NISN', value: s.NISN }, { name: 'Nama', label: 'Nama lengkap', req: true, value: s.Nama, full: true },
      { name: 'Kelas', label: 'Kelas', value: s.Kelas || 'XII TKJ 1' }, { name: 'JK', label: 'Jenis kelamin', type: 'select', options: [{ v: 'L', l: 'Laki-laki' }, { v: 'P', l: 'Perempuan' }], value: s.JK || 'L', kosong: false },
      { name: 'NoHP', label: 'No. HP / WA', value: s.NoHP }, { name: 'Email', label: 'Email', type: 'email', value: s.Email }, { name: 'NamaWali', label: 'Nama wali', value: s.NamaWali }, { name: 'NoHPWali', label: 'No. HP wali', value: s.NoHPWali },
      { name: 'FotoURL', label: 'Link foto (Google Drive)', value: s.FotoURL, full: true }], olah: d => Object.assign(d, { _baru: !s.NIS }) }); };
  Act.hapusSiswa = async el => { if (await konfirmasi('Hapus siswa <b>' + esc(nmSiswa(el.dataset.id)) + '</b>?', { danger: true, ok: 'Hapus' })) simpan(el, 'siswa.hapus', { NIS: el.dataset.id }); };
  Act.formGuru = el => { const g = el.dataset.id ? S.ix.guru[el.dataset.id] : {};
    formModal({ title: g.GuruID ? 'Ubah Guru' : 'Tambah Guru Pembimbing', icon: 'school', action: 'guru.simpan', fields: [{ name: 'Nama', label: 'Nama lengkap & gelar', req: true, full: true, value: g.Nama }, { name: 'NIP', label: 'NIP / Kode guru', value: g.NIP },
      { name: 'NoHP', label: 'No. HP / WA', value: g.NoHP }, { name: 'Email', label: 'Email', type: 'email', full: true, value: g.Email }], olah: d => Object.assign(d, { GuruID: g.GuruID || '' }) }); };
  Act.hapusGuru = async el => { if (await konfirmasi('Hapus guru <b>' + esc(nmGuru(el.dataset.id)) + '</b>?', { danger: true, ok: 'Hapus' })) simpan(el, 'guru.hapus', { GuruID: el.dataset.id }); };
  Act.formIns = el => { const i = el.dataset.id ? S.ix.ins[el.dataset.id] : {};
    formModal({ title: i.InstrukturID ? 'Ubah Instruktur' : 'Tambah Instruktur Lapangan', icon: 'engineering', action: 'instruktur.simpan', fields: [{ name: 'Nama', label: 'Nama lengkap', req: true, full: true, value: i.Nama },
      { name: 'DUDIID', label: 'DUDI', type: 'select', req: true, options: opsiDudi(), value: i.DUDIID }, { name: 'Jabatan', label: 'Jabatan', value: i.Jabatan }, { name: 'NoHP', label: 'No. HP / WA', value: i.NoHP }, { name: 'Email', label: 'Email', type: 'email', value: i.Email }],
      olah: d => Object.assign(d, { InstrukturID: i.InstrukturID || '' }) }); };
  Act.hapusIns = async el => { if (await konfirmasi('Hapus instruktur <b>' + esc(nmIns(el.dataset.id)) + '</b>?', { danger: true, ok: 'Hapus' })) simpan(el, 'instruktur.hapus', { InstrukturID: el.dataset.id }); };

  /* ======================= PENEMPATAN ======================= */
  Pages['ADMIN:penempatan'] = {
    render(param) {
      const p = param === '2' ? '2' : param === '1' ? '1' : periodeAktif(), d = D();
      const rows = d.penempatan.filter(x => String(x.Periode) === p).filter(x => cari({ n: nmSiswa(x.NIS), d: nmDudi(x.DUDIID), g: nmGuru(x.GuruID), k: x.PekerjaanSpesifik }, S.q));
      const belum = d.siswa.filter(s => !penOf(s.NIS, p));
      return head(ic('hub') + ' Data Master', 'Penempatan Siswa', 'Atur penempatan skema 1 atau 2 periode. Sistem menolak kuota penuh dan penempatan ganda di periode yang sama.', '<button class="btn" data-act="formPen" data-periode="' + p + '">' + ic('add') + 'Atur Penempatan</button>') +
        '<div class="toolbar"><div class="seg">' + ['1', '2'].map(x => '<button class="' + (p === x ? 'on' : '') + '" data-act="go" data-href="#/penempatan/' + x + '">Periode ' + x + ' ' + pill(d.penempatan.filter(y => String(y.Periode) === x).length, 'mute') + '</button>').join('') + '</div>' +
        (belum.length ? '<span class="pill warn dot">' + belum.length + ' siswa belum ditempatkan di Periode ' + p + '</span>' : pill('Semua siswa sudah ditempatkan', 'ok', true)) + '</div>' +
        tblWrap(['Siswa', 'Skema', 'DUDI', 'Guru Pembimbing', 'Instruktur', 'Pekerjaan Spesifik', 'Rentang', 'Status', ''], rows.map(x => '<tr><td><div class="who">' + av(nmSiswa(x.NIS), (S.ix.siswa[x.NIS] || {}).FotoURL, 'av-xs') + '<div><div class="n">' + esc(nmSiswa(x.NIS)) + '</div><div class="s">' + esc(x.NIS) + '</div></div></div></td>' +
          '<td>' + pill(x.Skema + ' periode', 'info') + '</td><td><b>' + esc(nmDudi(x.DUDIID)) + '</b></td><td class="small">' + esc(nmGuru(x.GuruID)) + '</td><td class="small">' + esc(nmIns(x.InstrukturID)) + '</td><td class="small">' + esc(x.PekerjaanSpesifik || '-') + '</td>' +
          '<td class="small">' + esc(fmtTgl(x.TglMulai)) + '<br>' + esc(fmtTgl(x.TglSelesai)) + '</td><td>' + pillStatus(x.Status) + '</td><td class="right" style="white-space:nowrap">' + aksiBtn('formPen', x.PenempatanID, 'edit') + ' ' + aksiBtn('hapusPen', x.PenempatanID, 'delete') + '</td></tr>'), 'Belum ada penempatan pada Periode ' + p + '.') +
        (belum.length ? '<div class="card mt"><div class="card-h"><h3 class="grow">Belum ditempatkan (Periode ' + p + ')</h3></div><div class="row wrap">' + belum.slice(0, 60).map(s => '<button class="tag" style="cursor:pointer;border:0" data-act="formPen" data-nis="' + esc(s.NIS) + '" data-periode="' + p + '">' + esc(s.Nama) + ' +</button>').join('') + '</div></div>' : '');
    }
  };
  Act.formPen = el => {
    const x = el.dataset.id ? D().penempatan.find(p => p.PenempatanID === el.dataset.id) : { NIS: el.dataset.nis || '', Periode: el.dataset.periode || periodeAktif(), Skema: '1', Status: 'Aktif' };
    const p1 = x.NIS ? penOf(x.NIS, '1') : null;
    const opsiDudiKuota = () => D().dudi.filter(d => d.Status !== 'Nonaktif').map(d => ({ v: d.DUDIID, l: d.Nama + ' (' + terisi(d.DUDIID, x.Periode) + '/' + d.Kuota + ')' }));
    const m = formModal({ title: x.PenempatanID ? 'Ubah Penempatan' : 'Atur Penempatan', icon: 'hub', action: 'penempatan.simpan', size: 'lg', fields: [
      { name: 'NIS', label: 'Siswa', type: 'select', req: true, full: true, options: opsiSiswa(s => x.PenempatanID ? s.NIS === x.NIS : !penOf(s.NIS, x.Periode) || s.NIS === x.NIS), value: x.NIS },
      { name: 'Skema', label: 'Skema', type: 'select', options: [{ v: '1', l: '1 Periode' }, { v: '2', l: '2 Periode' }], value: x.Skema, kosong: false }, { name: 'Periode', label: 'Periode', type: 'select', options: ['1', '2'], value: x.Periode, kosong: false },
      { name: 'DUDIID', label: 'DUDI (terisi/kuota)', type: 'select', req: true, full: true, options: opsiDudiKuota(), value: x.DUDIID }, { name: 'GuruID', label: 'Guru Pembimbing', type: 'select', req: true, options: opsiGuru(), value: x.GuruID || (p1 || {}).GuruID },
      { name: 'InstrukturID', label: 'Instruktur lapangan', type: 'select', options: D().instruktur.filter(i => i.DUDIID === x.DUDIID).map(i => ({ v: i.InstrukturID, l: i.Nama })), value: x.InstrukturID, ph: '— Pilih DUDI dulu —' },
      { name: 'PekerjaanSpesifik', label: 'Pekerjaan spesifik', value: x.PekerjaanSpesifik, attr: ' list="dl-pek"', full: true, help: 'Menentukan indikator Lembar Observasi.' },
      { name: 'TglMulai', label: 'Tanggal mulai', type: 'date', req: true, value: x.TglMulai }, { name: 'TglSelesai', label: 'Tanggal selesai', type: 'date', req: true, value: x.TglSelesai },
      { name: 'Status', label: 'Status', type: 'select', options: ['Aktif', 'Selesai', 'Batal'], value: x.Status, kosong: false }],
      extra: '<datalist id="dl-pek">' + pekerjaan().map(p => '<option value="' + esc(p) + '">').join('') + '</datalist>',
      olah: d => Object.assign(d, { PenempatanID: x.PenempatanID || '' }) });
    const f = m.el.querySelector('#fm');
    f.DUDIID.onchange = () => { f.InstrukturID.innerHTML = '<option value="">— Pilih —</option>' + D().instruktur.filter(i => i.DUDIID === f.DUDIID.value).map(i => '<option value="' + esc(i.InstrukturID) + '">' + esc(i.Nama) + '</option>').join(''); };
    f.Skema.onchange = () => { if (f.Skema.value === '1') f.Periode.value = '1'; };
  };
  Act.hapusPen = async el => { if (await konfirmasi('Hapus penempatan ini?', { danger: true, ok: 'Hapus' })) simpan(el, 'penempatan.hapus', { PenempatanID: el.dataset.id }); };

  /* ======================= AKUN ======================= */
  Pages['ADMIN:akun'] = {
    render(param) {
      const f = ['ADMIN', 'GURU', 'INSTRUKTUR', 'SISWA'].indexOf(param) > -1 ? param : '', akun = (D().akun || []).filter(a => !f || a.Peran === f).filter(a => cari(a, S.q));
      const lbl = { ADMIN: 'Admin', GURU: 'Guru', INSTRUKTUR: 'Instruktur', SISWA: 'Siswa' };
      const refNama = a => a.Peran === 'SISWA' ? nmSiswa(a.RefID) : a.Peran === 'INSTRUKTUR' ? nmIns(a.RefID) : a.RefID ? nmGuru(a.RefID) : '-';
      return head(ic('manage_accounts') + ' Data Master · Keamanan', 'Akun Pengguna', 'Admin membuat semua akun dengan sandi sementara (wajib diganti saat masuk pertama). Sandi tidak pernah disimpan dalam bentuk asli.',
        '<button class="btn ghost" data-act="akunMassal">' + ic('group_add') + 'Buat Akun Massal</button><button class="btn" data-act="formAkun">' + ic('person_add') + 'Buat Akun</button>') +
        '<div class="toolbar"><div class="seg"><button class="' + (!f ? 'on' : '') + '" data-act="go" data-href="#/akun">Semua ' + pill((D().akun || []).length, 'mute') + '</button>' + Object.keys(lbl).map(k => '<button class="' + (f === k ? 'on' : '') + '" data-act="go" data-href="#/akun/' + k + '">' + lbl[k] + ' ' + pill((D().akun || []).filter(a => a.Peran === k).length, 'mute') + '</button>').join('') + '</div></div>' +
        tblWrap(['Username', 'Nama', 'Peran', 'Terkait', 'Status', 'Login terakhir', ''], akun.map(a => '<tr><td class="mono"><b>' + esc(a.Username) + '</b></td><td>' + esc(a.Nama) + '</td><td>' + pill(lbl[a.Peran] || a.Peran, 'info') + (a.PeranTambahan ? ' ' + pill('+ ' + a.PeranTambahan, 'ok') : '') + '</td><td class="small">' + esc(refNama(a)) + '</td>' +
          '<td>' + pillStatus(a.Status) + (a.WajibGanti === 'YA' ? ' ' + pill('Sandi sementara', 'warn') : '') + '</td><td class="small">' + esc(a.LoginTerakhir ? fmtWaktu(a.LoginTerakhir) : '-') + '</td>' +
          '<td class="right" style="white-space:nowrap">' + aksiBtn('formAkun', a.UserID, 'edit', 'ghost', 'Ubah') + ' <button class="btn sec xs" data-act="resetAkun" data-id="' + esc(a.UserID) + '">' + ic('lock_reset') + 'Reset sandi</button></td></tr>'), 'Belum ada akun.');
    }
  };
  function tampilSandi(judul, list) {
    const m = modal({ title: judul, icon: 'key', size: list.length > 1 ? 'lg' : 'sm', body: '<div class="alert warn mb">' + ic('visibility_lock') + '<div><h4>Hanya ditampilkan sekali</h4><p>Catat/unduh sekarang lalu bagikan ke pengguna. Sandi wajib diganti saat masuk pertama.</p></div></div>' +
      tblWrap(['Nama', 'Username', 'Sandi sementara'], list.map(x => '<tr><td>' + esc(x.Nama || '') + '</td><td class="mono"><b>' + esc(x.Username) + '</b></td><td class="mono"><b>' + esc(x.Sandi) + '</b></td></tr>')),
      foot: '<button class="btn ghost" data-salin>' + ic('content_copy') + 'Salin</button>' + (list.length > 1 ? '<button class="btn sec" data-xlsx>' + ic('download') + 'Unduh Excel</button>' : '') + '<button class="btn" data-x>Selesai</button>' });
    m.el.querySelector('[data-salin]').onclick = () => { navigator.clipboard.writeText(list.map(x => (x.Nama ? x.Nama + '\t' : '') + x.Username + '\t' + x.Sandi).join('\n')).then(() => toast('Disalin.', 'ok')); };
    const xl = m.el.querySelector('[data-xlsx]'); if (xl) xl.onclick = () => eksporXlsx({ Akun: list.map(x => ({ Nama: x.Nama, Username: x.Username, 'Sandi Sementara': x.Sandi, Peran: x.Peran, URL: P('APP_URL') || location.href.replace(/#.*$/, '') })) }, 'Akun SIGAPKL ' + hariIni());
  }
  Act.formAkun = el => {
    const a = el.dataset.id ? (D().akun || []).find(x => x.UserID === el.dataset.id) : { Peran: 'SISWA', Status: 'Aktif' };
    const refOpsi = peran => peran === 'SISWA' ? opsiSiswa() : peran === 'INSTRUKTUR' ? D().instruktur.map(i => ({ v: i.InstrukturID, l: i.Nama + ' · ' + nmDudi(i.DUDIID) })) : opsiGuru();
    const m = formModal({ title: a.UserID ? 'Ubah Akun' : 'Buat Akun', icon: 'person_add', action: 'akun.simpan', fields: [
      { name: 'Peran', label: 'Peran', type: 'select', options: ['ADMIN', 'GURU', 'INSTRUKTUR', 'SISWA'], value: a.Peran, kosong: false }, { name: 'Status', label: 'Status', type: 'select', options: ['Aktif', 'Nonaktif'], value: a.Status, kosong: false },
      { name: 'RefID', label: 'Data terkait', type: 'select', full: true, options: refOpsi(a.Peran), value: a.RefID, help: 'Admin boleh dikaitkan ke data Guru bila juga menjadi Guru Pembimbing.' },
      { name: 'Username', label: 'Username', req: true, value: a.Username, help: 'Disarankan: NIS (siswa), NIP (guru), kode (instruktur).' }, { name: 'Nama', label: 'Nama tampilan', req: true, value: a.Nama },
      { name: 'PeranTambahan', label: 'Multi-peran (khusus Admin)', type: 'select', options: [{ v: 'GURU', l: 'Juga Guru Pembimbing' }], value: a.PeranTambahan, ph: '— Tidak ada —', full: true }],
      olah: d => Object.assign(d, { UserID: a.UserID || '' }), sesudah: r => { if (r.data && r.data.sandiSementara) tampilSandi('Akun dibuat', [{ Username: r.data.Username, Sandi: r.data.sandiSementara, Nama: '' }]); } });
    const f = m.el.querySelector('#fm');
    f.Peran.onchange = () => { f.RefID.innerHTML = '<option value="">— Pilih —</option>' + refOpsi(f.Peran.value).map(o => '<option value="' + esc(o.v) + '">' + esc(o.l) + '</option>').join(''); };
    f.RefID.onchange = () => { if (!f.Nama.value) f.Nama.value = (f.RefID.selectedOptions[0] || {}).text.split(' · ')[0]; if (!f.Username.value) f.Username.value = f.Peran.value === 'SISWA' ? f.RefID.value : f.RefID.value.toLowerCase(); };
  };
  Act.resetAkun = async el => {
    const a = (D().akun || []).find(x => x.UserID === el.dataset.id);
    if (!(await konfirmasi('Reset sandi <b>' + esc(a.Username) + '</b> menjadi sandi sementara baru? Sesi pengguna di semua perangkat akan berakhir.', { ok: 'Reset' }))) return;
    const r = await simpan(el, 'akun.reset', { UserID: a.UserID }, { diam: true });
    if (r && r.success) tampilSandi('Sandi sementara baru', [{ Nama: a.Nama, Username: r.data.Username, Sandi: r.data.sandiSementara }]);
  };
  Act.akunMassal = () => {
    const m = modal({ title: 'Buat Akun Massal', icon: 'group_add', body: '<p class="muted" style="margin-top:0">Membuat akun untuk data yang belum memiliki akun (maks. 150 per proses). Username otomatis: NIS (siswa), NIP/ID (guru), ID instruktur.</p>' +
      '<div class="list">' + [['SISWA', 'Siswa', D().siswa.filter(s => !S.ix.akun[s.NIS + '|SISWA']).length], ['GURU', 'Guru Pembimbing', D().guru.filter(g => !S.ix.akun[g.GuruID + '|GURU']).length], ['INSTRUKTUR', 'Instruktur', D().instruktur.filter(i => !S.ix.akun[i.InstrukturID + '|INSTRUKTUR']).length]]
        .map(x => '<div class="li"><div class="grow"><b>' + x[1] + '</b><div class="small muted">' + x[2] + ' data belum punya akun</div></div><button class="btn sm" data-peran="' + x[0] + '"' + (x[2] ? '' : ' disabled') + '>Buat ' + x[2] + ' akun</button></div>').join('') + '</div>' });
    m.el.querySelectorAll('[data-peran]').forEach(b => b.onclick = async () => { const r = await simpan(b, 'akun.massal', { Peran: b.dataset.peran }, { diam: true }); if (r && r.success) { m.close(); if (r.data.dibuat.length) tampilSandi(r.data.dibuat.length + ' akun dibuat', r.data.dibuat); else toast(r.message, 'ok'); } });
  };

  /* ======================= ABSENSI (monitor + koreksi) ======================= */
  Pages['ADMIN:absensi'] = {
    render(param) {
      const p = param === '2' ? '2' : param === '1' ? '1' : periodeAktif();
      const rows = D().absensi.filter(a => String(a.Periode) === p).filter(a => cari({ n: nmSiswa(a.NIS), d: nmDudi((penOf(a.NIS, p) || {}).DUDIID), t: a.TglMulai }, S.q)).sort((a, b) => b.TglMulai.localeCompare(a.TglMulai) || nmSiswa(a.NIS).localeCompare(nmSiswa(b.NIS)));
      let tH = 0, tT = 0, tA = 0; rows.forEach(a => { tH += +a.Hadir; tA += +a.Alfa; tT += (+a.Hadir) + (+a.Izin) + (+a.Sakit) + (+a.Alfa); });
      return head(ic('fact_check') + ' Monitoring PKL', 'Monitoring & Koreksi Absensi', 'Absensi mingguan diinput Instruktur DUDI. Admin dapat mengoreksi bila ada kesalahan (perubahan tercatat di log).', '<button class="btn ghost" data-act="eksporAbsensi">' + ic('table_view') + 'Ekspor Excel</button>') +
        '<div class="toolbar"><div class="seg">' + ['1', '2'].map(x => '<button class="' + (p === x ? 'on' : '') + '" data-act="go" data-href="#/absensi/' + x + '">Periode ' + x + '</button>').join('') + '</div><span class="pill ok">Kehadiran rata-rata ' + (tT ? Math.round(tH / tT * 100) : 0) + '%</span>' + pill('Total Alfa ' + tA + ' hari', tA ? 'bad' : 'mute') + '</div>' +
        tblWrap(['Siswa', 'DUDI', 'Minggu', 'Rentang', 'Harian', '#H', '#I', '#S', '#A', 'Diinput', ''], rows.slice(0, 400).map(a => '<tr class="' + (+a.Alfa ? 'bad-row' : '') + '"><td><b>' + esc(nmSiswa(a.NIS)) + '</b><div class="xs muted">' + esc(a.NIS) + '</div></td><td class="small">' + esc(nmDudi((penOf(a.NIS, p) || {}).DUDIID)) + '</td><td>' + esc(a.MingguKe) + '</td>' +
          '<td class="small">' + esc(fmtTgl(a.TglMulai)) + ' – ' + esc(fmtTgl(a.TglSelesai)) + '</td><td class="mono">' + esc(a.Harian) + '</td><td class="num">' + esc(a.Hadir) + '</td><td class="num">' + esc(a.Izin) + '</td><td class="num">' + esc(a.Sakit) + '</td><td class="num">' + (+a.Alfa ? '<b style="color:var(--rose-700)">' + a.Alfa + '</b>' : '0') + '</td>' +
          '<td class="xs muted">' + esc(a.DiinputOleh) + '<br>' + esc(fmtWaktu(a.DiperbaruiPada)) + '</td><td class="right"><button class="btn ghost xs" data-act="koreksiAbs" data-id="' + esc(a.AbsensiID) + '">' + ic('edit') + 'Koreksi</button></td></tr>'), 'Belum ada absensi pada periode ini.') +
        (rows.length > 400 ? '<p class="small muted">Menampilkan 400 dari ' + rows.length + ' baris — gunakan pencarian atau Ekspor Excel.</p>' : '');
    }
  };
  Act.koreksiAbs = el => {
    const a = D().absensi.find(x => x.AbsensiID === el.dataset.id); if (!a) return;
    formModal({ title: 'Koreksi Absensi · ' + nmSiswa(a.NIS), icon: 'edit_calendar', action: 'absensi.simpan', size: 'sm',
      intro: '<p class="small muted" style="margin-top:0">' + esc(fmtTglL(a.TglMulai)) + ' – ' + esc(fmtTglL(a.TglSelesai)) + ' · Periode ' + esc(a.Periode) + '</p>',
      fields: [{ name: 'Harian', label: 'Status harian (H/I/S/A per hari, Sen–Jum)', req: true, full: true, value: a.Harian, attr: ' maxlength="7" style="font-family:monospace;letter-spacing:.3em;text-transform:uppercase"' }, { name: 'Catatan', label: 'Catatan koreksi', full: true, value: a.Catatan }],
      olah: d => ({ Periode: a.Periode, TglMulai: a.TglMulai, TglSelesai: a.TglSelesai, MingguKe: a.MingguKe, rows: [{ NIS: a.NIS, Harian: d.Harian.toUpperCase(), Catatan: d.Catatan }] }) });
  };

  /* ======================= PERINGATAN (pemantau) ======================= */
  Pages['ADMIN:peringatan'] = {
    render(param) {
      const st = param || 'Belum ditangani', all = D().peringatan, list = all.filter(p => st === 'semua' || p.Status === st).filter(p => cari({ n: nmSiswa(p.NIS), g: nmGuru((penOf(p.NIS, p.Periode) || {}).GuruID) }, S.q));
      return head(ic('notification_important') + ' Monitoring PKL', 'Pemantauan Peringatan Izin/Alfa', 'Ambang: Alfa = ' + esc(P('AMBANG_ALFA')) + ' hari, Izin = ' + esc(P('AMBANG_IZIN')) + ' hari per periode. Penanganan dilakukan Guru Pembimbing; Admin memantau.',
        '<button class="btn ghost" data-act="eksporPrg">' + ic('table_view') + 'Ekspor Excel</button>') +
        '<div class="seg mb">' + ['Belum ditangani', 'Sudah ditangani', 'Dicabut', 'semua'].map(x => '<button class="' + (st === x ? 'on' : '') + '" data-act="go" data-href="#/peringatan/' + encodeURIComponent(x) + '">' + esc(x === 'semua' ? 'Semua' : x) + ' ' + pill(x === 'semua' ? all.length : all.filter(p => p.Status === x).length, 'mute') + '</button>').join('') + '</div>' +
        tabelPeringatan(list, false).replace('<th>Periode</th>', '<th>Periode</th>');
    }
  };
  Act.eksporPrg = () => eksporXlsx({ Peringatan: D().peringatan.map(p => ({ NIS: p.NIS, Nama: nmSiswa(p.NIS), Guru: nmGuru((penOf(p.NIS, p.Periode) || {}).GuruID), Periode: p.Periode, Jenis: p.Jenis, Jumlah: +p.Jumlah, Status: p.Status, Catatan: p.Catatan, DitanganiOleh: p.DitanganiOleh, Diperbarui: p.DiperbaruiPada })) }, 'Peringatan Kehadiran PKL');

  /* ======================= PRESENTASI ======================= */
  Pages['ADMIN:presentasi'] = {
    render() {
      const rows = D().presentasi.filter(p => cari({ n: nmSiswa(p.NIS), g: nmGuru(p.PengujiID), r: p.Ruang }, S.q)).sort((a, b) => (a.Tanggal + a.Jam).localeCompare(b.Tanggal + b.Jam));
      const belum = D().siswa.filter(s => penOf(s.NIS) && !S.ix.pres[s.NIS]).length;
      return head(ic('co_present') + ' Monitoring PKL', 'Jadwal Presentasi & Penunjukan Penguji', 'Guru penguji yang ditunjuk dapat mengisi Nilai Presentasi siswa tersebut.', '<button class="btn" data-act="formPres">' + ic('add') + 'Tambah Jadwal</button>') +
        (belum ? '<div class="alert warn mb">' + ic('pending_actions') + '<div><h4>' + belum + ' siswa belum dijadwalkan presentasi</h4></div></div>' : '') +
        tblWrap(['Siswa', 'DUDI', 'Tanggal', 'Jam', 'Ruang', 'Penguji', 'Nilai', ''], rows.map(p => { const n = rekap(p.NIS).nilai.PRESENTASI;
          return '<tr><td><b>' + esc(nmSiswa(p.NIS)) + '</b><div class="xs muted">' + esc(p.NIS) + '</div></td><td class="small">' + esc(nmDudi((penOf(p.NIS) || {}).DUDIID)) + '</td><td>' + esc(fmtTgl(p.Tanggal)) + '</td><td>' + esc(p.Jam || '-') + '</td><td>' + esc(p.Ruang || '-') + '</td><td class="small">' + esc(nmGuru(p.PengujiID)) + '</td>' +
            '<td>' + (n !== undefined ? pill(num(n), 'ok') : pill('Belum', 'mute')) + '</td><td class="right" style="white-space:nowrap">' + aksiBtn('formPres', p.PresentasiID, 'edit') + ' ' + aksiBtn('hapusPres', p.PresentasiID, 'delete') + '</td></tr>'; }), 'Belum ada jadwal presentasi.');
    }
  };
  Act.formPres = el => { const p = el.dataset.id ? D().presentasi.find(x => x.PresentasiID === el.dataset.id) : {};
    formModal({ title: p.PresentasiID ? 'Ubah Jadwal Presentasi' : 'Jadwal Presentasi', icon: 'co_present', action: 'presentasi.simpan', fields: [
      { name: 'NIS', label: 'Siswa', type: 'select', req: true, full: true, options: opsiSiswa(s => penOf(s.NIS) && (!S.ix.pres[s.NIS] || s.NIS === p.NIS)), value: p.NIS },
      { name: 'Tanggal', label: 'Tanggal', type: 'date', req: true, value: p.Tanggal }, { name: 'Jam', label: 'Jam', value: p.Jam || '08.00 – 08.30' }, { name: 'Ruang', label: 'Ruang', value: p.Ruang || 'Lab TKJ' },
      { name: 'PengujiID', label: 'Guru penguji', type: 'select', req: true, options: opsiGuru(), value: p.PengujiID }, { name: 'Catatan', label: 'Catatan', type: 'textarea', full: true, value: p.Catatan }] }); };
  Act.hapusPres = async el => { if (await konfirmasi('Hapus jadwal presentasi ini?', { danger: true, ok: 'Hapus' })) simpan(el, 'presentasi.hapus', { PresentasiID: el.dataset.id }); };

  /* ======================= NILAI & PENUTUPAN ======================= */
  Pages['ADMIN:nilai'] = {
    render(param) {
      const p = param === '2' ? '2' : param === '1' ? '1' : periodeAktif(), pen = D().penempatan.filter(x => String(x.Periode) === p).filter(x => cari({ n: nmSiswa(x.NIS), d: nmDudi(x.DUDIID) }, S.q));
      const cnt = Object.keys(JENIS).map(j => pen.filter(x => S.ix.nilai[x.NIS + '|' + p + '|' + j]).length);
      return head(ic('lock') + ' Monitoring PKL', 'Penilaian & Penutupan Nilai', 'Menutup nilai mengunci nilai Guru dan Instruktur serta absensi siswa terkait. Hanya Admin yang dapat membuka kembali.',
        '<button class="btn ghost" data-act="kunciMassal" data-st="BUKA" data-p="' + p + '">' + ic('lock_open') + 'Buka Kunci Terpilih</button><button class="btn danger" data-act="kunciMassal" data-st="TUTUP" data-p="' + p + '">' + ic('lock') + 'Tutup Nilai Terpilih</button>') +
        '<div class="toolbar"><div class="seg">' + ['1', '2'].map(x => '<button class="' + (p === x ? 'on' : '') + '" data-act="go" data-href="#/nilai/' + x + '">Periode ' + x + '</button>').join('') + '</div></div>' +
        '<div class="grid g3 keep2 mb" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">' + Object.keys(JENIS).map((j, i) => '<div class="card tight"><span class="stat-lbl">' + esc(JENIS[j]) + '</span><div class="stat-val mt-s" style="font-size:22px">' + cnt[i] + '<small> / ' + pen.length + '</small></div><div class="bar mt-s"><i style="width:' + (pen.length ? cnt[i] / pen.length * 100 : 0) + '%"></i></div></div>').join('') + '</div>' +
        tblWrap(['', 'Siswa', 'Obs 1', 'Obs 2', 'Pembimbing', 'Laporan', 'Presentasi', 'Akhir DUDI', 'Nilai Akhir', 'Kunci'], pen.map(x => { const rk = rekap(x.NIS, p), c = j => rk.nilai[j] !== undefined ? '<span class="' + (rk.nilai[j + '_draf'] ? 'muted' : 'b') + '">' + num(rk.nilai[j]) + '</span>' : '<span class="muted">–</span>';
          return '<tr><td><input type="checkbox" class="pilih-nis" value="' + esc(x.NIS) + '" aria-label="Pilih"></td><td><b>' + esc(nmSiswa(x.NIS)) + '</b><div class="xs muted">' + esc(nmDudi(x.DUDIID)) + '</div></td>' + ['OBS1', 'OBS2', 'PEMBIMBING', 'LAPORAN', 'PRESENTASI', 'AKHIR'].map(j => '<td class="num">' + c(j) + '</td>').join('') +
            '<td class="num"><b>' + num(rk.akhir) + '</b> ' + pill(rk.predikat, rk.predikat === 'D' ? 'bad' : 'ok') + '</td><td>' + (rk.kunci ? pill('Ditutup', 'bad', true) : pill('Terbuka', 'ok', true)) + '</td></tr>'; }), 'Belum ada penempatan.').replace('<th></th>', '<th><input type="checkbox" data-chg="pilihSemua" aria-label="Pilih semua"></th>');
    }
  };
  Act.pilihSemua = el => document.querySelectorAll('.pilih-nis').forEach(c => (c.checked = el.checked));
  Act.kunciMassal = async el => {
    const nis = [...document.querySelectorAll('.pilih-nis:checked')].map(c => c.value);
    if (!nis.length) { toast('Centang siswa terlebih dahulu.', 'warn'); return; }
    const tutup = el.dataset.st === 'TUTUP';
    if (!(await konfirmasi((tutup ? 'Menutup' : 'Membuka') + ' nilai <b>' + nis.length + ' siswa</b> (Periode ' + el.dataset.p + '). ' + (tutup ? 'Nilai Guru dan Instruktur serta absensi akan terkunci.' : ''), { danger: tutup, ok: tutup ? 'Ya, tutup nilai' : 'Ya, buka kunci' }))) return;
    simpan(el, 'kunci.set', { NIS: nis, Periode: el.dataset.p, Status: el.dataset.st });
  };

  /* ======================= PESAN (pantau) ======================= */
  Pages['ADMIN:pesan'] = {
    render() {
      const list = D().pesan.slice().sort((a, b) => b.DibuatPada.localeCompare(a.DibuatPada)).filter(m => cari({ s: m.Subjek, i: m.Isi, n: nmSiswa(m.NIS) }, S.q));
      return head(ic('emergency') + ' Monitoring PKL', 'Pesan Darurat (Pantau)', 'Seluruh pesan darurat Instruktur → Guru Pembimbing beserta status balasannya.') +
        tblWrap(['Waktu', 'Dari', 'Ke', 'Siswa', 'Subjek & Isi', 'Status'], list.map(m => '<tr class="' + (m.Status === 'Baru' ? 'warn-row' : '') + '"><td class="small">' + esc(fmtWaktu(m.DibuatPada)) + '</td><td class="small">' + esc(nmIns(m.InstrukturID)) + '</td><td class="small">' + esc(nmGuru(m.GuruID)) + '</td><td class="small">' + esc(nmSiswa(m.NIS)) + '</td>' +
          '<td><b class="small">' + esc(m.Subjek) + '</b><div class="xs muted">' + esc(m.Isi) + '</div>' + (m.Balasan ? '<div class="xs" style="color:var(--teal-700)">↳ ' + esc(m.Balasan) + '</div>' : '') + '</td><td>' + pillStatus(m.Status) + '</td></tr>'), 'Belum ada pesan darurat.');
    }
  };

  /* ======================= REKAP & LAPORAN ======================= */
  Pages['ADMIN:rekap'] = {
    render(param) {
      const p = param === '2' ? '2' : param === '1' ? '1' : periodeAktif(), pen = D().penempatan.filter(x => String(x.Periode) === p);
      const rows = pen.map(x => ({ x, rk: rekap(x.NIS, p) })).filter(o => cari({ n: nmSiswa(o.x.NIS), d: nmDudi(o.x.DUDIID), g: nmGuru(o.x.GuruID) }, S.q));
      const perDudi = {}; rows.forEach(o => { const k = o.x.DUDIID; const d = perDudi[k] = perDudi[k] || { n: 0, h: 0, t: 0 }; d.n++; d.h += o.rk.t.H; d.t += o.rk.hari; });
      const dk = Object.keys(perDudi).slice(0, 12), pred = { A: 0, B: 0, C: 0, D: 0, '-': 0 }; rows.forEach(o => pred[o.rk.predikat]++);
      return head(ic('monitoring') + ' Laporan', 'Rekap & Laporan PKL', 'Grafik, tabel yang dapat dicari, ekspor Excel, dan cetak lembar nilai (PDF).', '<button class="btn ghost" data-act="cetakLembarMassal" data-p="' + p + '">' + ic('print') + 'Cetak Lembar Nilai</button><button class="btn" data-act="eksporRekap" data-p="' + p + '">' + ic('table_view') + 'Ekspor Excel</button>') +
        '<div class="toolbar"><div class="seg">' + ['1', '2'].map(x => '<button class="' + (p === x ? 'on' : '') + '" data-act="go" data-href="#/rekap/' + x + '">Periode ' + x + '</button>').join('') + '</div><span class="small muted">' + rows.length + ' siswa</span></div>' +
        '<div class="grid g2"><div class="card"><div class="card-h"><h3 class="grow">Kehadiran & Jumlah Siswa per DUDI</h3></div>' + (dk.length ? barChart({ label: 'per DUDI', labels: dk.map(k => nmDudi(k).replace(/^(PT|CV)\.?\s+/i, '').slice(0, 10)), series: [{ name: 'Kehadiran %', color: Tema.c('teal-500'), values: dk.map(k => perDudi[k].t ? Math.round(perDudi[k].h / perDudi[k].t * 100) : 0) }, { name: 'Jumlah siswa ×10', color: '#F59E0B', values: dk.map(k => perDudi[k].n * 10) }], max: 100 }) : '<div class="empty">Belum ada data.</div>') + '</div>' +
        '<div class="card"><div class="card-h"><h3 class="grow">Sebaran Predikat Nilai Akhir</h3></div>' + donut({ center: rows.length, sub: 'siswa', segments: [{ label: 'A · Amat Baik', value: pred.A, color: Tema.c() }, { label: 'B · Baik', value: pred.B, color: Tema.c('teal-500') }, { label: 'C · Cukup', value: pred.C, color: '#F59E0B' }, { label: 'D · Kurang', value: pred.D, color: '#F43F5E' }, { label: 'Belum dinilai', value: pred['-'], color: '#CBD5E1' }] }) + '</div></div>' +
        '<div class="mt">' + tblWrap(['Siswa', 'DUDI', 'Guru', '#Hadir', '#Izin', '#Alfa', '#Kehadiran', '#Nilai Akhir', 'Predikat', 'Status', ''], rows.map(o => '<tr><td><b>' + esc(nmSiswa(o.x.NIS)) + '</b><div class="xs muted">' + esc(o.x.NIS) + '</div></td><td class="small">' + esc(nmDudi(o.x.DUDIID)) + '</td><td class="small">' + esc(nmGuru(o.x.GuruID)) + '</td>' +
          '<td class="num">' + o.rk.t.H + '</td><td class="num">' + o.rk.t.I + '</td><td class="num">' + (o.rk.t.A ? '<b style="color:var(--rose-700)">' + o.rk.t.A + '</b>' : 0) + '</td><td class="num">' + num(o.rk.persen) + '%</td><td class="num"><b>' + num(o.rk.akhir) + '</b></td><td>' + pill(o.rk.predikat, o.rk.predikat === 'D' ? 'bad' : o.rk.predikat === '-' ? 'mute' : 'ok') + '</td>' +
          '<td>' + (o.rk.kunci ? pill('Final', 'bad') : pill(o.rk.lengkap + '/6', 'warn')) + '</td><td class="right"><button class="btn ghost xs" data-act="detailSiswa" data-nis="' + esc(o.x.NIS) + '">Detail</button></td></tr>'), 'Belum ada data.') + '</div>';
    }
  };
  Act.eksporRekap = el => {
    const p = el.dataset.p, pen = D().penempatan.filter(x => String(x.Periode) === p);
    const rekapRows = pen.map(x => { const rk = rekap(x.NIS, p), s = S.ix.siswa[x.NIS] || {}; return { NIS: x.NIS, Nama: s.Nama, Kelas: s.Kelas, DUDI: nmDudi(x.DUDIID), 'Pekerjaan Spesifik': x.PekerjaanSpesifik, 'Guru Pembimbing': nmGuru(x.GuruID), Instruktur: nmIns(x.InstrukturID),
      Hadir: rk.t.H, Izin: rk.t.I, Sakit: rk.t.S, Alfa: rk.t.A, 'Kehadiran %': rk.persen, 'Observasi 1': rk.nilai.OBS1 ?? '', 'Observasi 2': rk.nilai.OBS2 ?? '', Pembimbing: rk.nilai.PEMBIMBING ?? '', Laporan: rk.nilai.LAPORAN ?? '', Presentasi: rk.nilai.PRESENTASI ?? '', 'Akhir DUDI': rk.nilai.AKHIR ?? '', 'Nilai Akhir': rk.akhir, Predikat: rk.predikat, Status: rk.kunci ? 'FINAL' : 'Sementara' }; });
    const abs = D().absensi.filter(a => String(a.Periode) === p).map(a => ({ NIS: a.NIS, Nama: nmSiswa(a.NIS), Minggu: a.MingguKe, Mulai: a.TglMulai, Selesai: a.TglSelesai, Harian: a.Harian, Hadir: +a.Hadir, Izin: +a.Izin, Sakit: +a.Sakit, Alfa: +a.Alfa, Catatan: a.Catatan }));
    const dudi = D().dudi.map(d => ({ DUDI: d.Nama, Bidang: d.Bidang, Kota: d.Kota, Kuota: +d.Kuota, Terisi: terisi(d.DUDIID, p), Pimpinan: d.Pimpinan, Telepon: d.Telepon }));
    eksporXlsx({ 'Rekap Nilai': rekapRows, Absensi: abs, DUDI: dudi }, 'Rekap PKL Periode ' + p + ' ' + hariIni());
  };
  Act.cetakLembarMassal = el => {
    const nis = [...new Set(D().penempatan.filter(x => String(x.Periode) === el.dataset.p).map(x => x.NIS))].filter(n => cari({ n: nmSiswa(n) }, S.q));
    if (!nis.length) { toast('Tidak ada siswa.', 'warn'); return; }
    cetak(nis.map(n => lembarRekap(n)).join('<div class="page-break"></div>'), 'Lembar Nilai PKL');
  };

  /* ======================= KARTU PKL MASSAL ======================= */
  Pages['ADMIN:kartu'] = {
    render(param) {
      const [kelas, dudi] = String(param || '').split('|');
      const sis = D().siswa.filter(s => (!kelas || s.Kelas === kelas) && (!dudi || (penOf(s.NIS) || {}).DUDIID === dudi)).filter(s => cari(s, S.q));
      const kelasList = [...new Set(D().siswa.map(s => s.Kelas).filter(Boolean))].sort();
      return head(ic('badge') + ' Dokumen', 'Cetak Kartu PKL Massal', 'Pilih kelas/DUDI lalu cetak — satu PDF berisi banyak kartu (8 kartu per halaman A4).', '<button class="btn" data-act="cetakTerpilih">' + ic('print') + 'Buat PDF Massal</button>') +
        '<div class="toolbar"><select class="input" data-chg="filterKartu" data-k="kelas"><option value="">Semua kelas</option>' + kelasList.map(k => '<option' + (k === kelas ? ' selected' : '') + '>' + esc(k) + '</option>').join('') + '</select>' +
        '<select class="input" data-chg="filterKartu" data-k="dudi"><option value="">Semua DUDI</option>' + D().dudi.map(d => '<option value="' + esc(d.DUDIID) + '"' + (d.DUDIID === dudi ? ' selected' : '') + '>' + esc(d.Nama) + '</option>').join('') + '</select>' +
        '<label class="check"><input type="checkbox" checked data-chg="pilihSemuaKartu"> Pilih semua (' + sis.length + ')</label></div>' +
        '<div class="grid" style="grid-template-columns:minmax(220px,300px) 1fr"><div class="card tight" style="max-height:70vh;overflow:auto">' + sis.map(s => '<label class="check" style="padding:7px 4px;border-bottom:1px solid var(--line-2)"><input type="checkbox" class="pilih-kartu" value="' + esc(s.NIS) + '" checked> <span class="grow"><b class="small">' + esc(s.Nama) + '</b><br><span class="xs muted">' + esc(s.Kelas) + ' · ' + esc(nmDudi((penOf(s.NIS) || {}).DUDIID)) + (s.FotoURL ? '' : ' · tanpa foto') + '</span></span></label>').join('') + '</div>' +
        '<div class="card"><div class="row between mb"><h3>Pratinjau (6 pertama)</h3>' + pill(sis.length + ' kartu', 'info') + '</div><div class="card-grid">' + sis.slice(0, 6).map(s => K.kartu(s.NIS)).join('') + '</div></div></div>';
    }
  };
  Act.filterKartu = () => { const s = document.querySelectorAll('[data-chg=filterKartu]'); App.go('#/kartu/' + encodeURIComponent(s[0].value + '|' + s[1].value)); };
  Act.pilihSemuaKartu = el => document.querySelectorAll('.pilih-kartu').forEach(c => (c.checked = el.checked));
  Act.cetakTerpilih = el => { const nis = [...document.querySelectorAll('.pilih-kartu:checked')].map(c => c.value); if (!nis.length) { toast('Pilih siswa.', 'warn'); return; } el.dataset.nis = nis.join(','); Act.cetakKartu(el); };

  /* ======================= INSTRUMEN ======================= */
  Pages['ADMIN:instrumen'] = {
    render(param) {
      const [jenisP, pekP] = String(param || '').split('|'), jenis = JENIS[jenisP] ? jenisP : 'OBS1', obs = jenis === 'OBS1' || jenis === 'OBS2';
      const pekList = [...new Set(['Umum'].concat(pekerjaan(), D().instrumen.filter(i => i.PekerjaanSpesifik).map(i => i.PekerjaanSpesifik)))];
      const pek = obs ? (pekP || pekList[0]) : '';
      const items = D().instrumen.filter(i => i.Jenis === jenis && (!obs || (i.PekerjaanSpesifik || '').toLowerCase() === pek.toLowerCase())).sort((a, b) => a.No - b.No);
      const baris = (i, k) => '<div class="aspek" data-item data-id="' + esc(i.InstrumenID || '') + '"><div class="row"><span class="aspek-no">' + (k + 1) + '</span><input class="input" data-f="Aspek" value="' + esc(i.Aspek || '') + '" placeholder="Nama aspek/indikator"><input class="input" data-f="Bobot" type="number" min="0" max="100" value="' + esc(i.Bobot || 0) + '" style="width:90px" data-inp="bobotTotal" aria-label="Bobot"><button class="btn ghost xs" data-act="hapusAspek">' + ic('close') + '</button></div><textarea class="input mt-s" data-f="Deskripsi" rows="2" placeholder="Deskripsi / kriteria">' + esc(i.Deskripsi || '') + '</textarea></div>';
      const tot = items.reduce((a, i) => a + (+i.Bobot || 0), 0);
      return head(ic('checklist') + ' Sistem', 'Instrumen Penilaian Resmi', 'Atur indikator & bobot tiap komponen. Lembar Observasi diatur per Pekerjaan Spesifik (fallback "Umum"). Aspek yang dihapus dinonaktifkan agar nilai lama tetap terbaca.') +
        '<div class="tabs">' + Object.keys(JENIS).map(j => '<button class="' + (j === jenis ? 'on' : '') + '" data-act="go" data-href="#/instrumen/' + j + '">' + esc(JENIS[j]) + '</button>').join('') + '</div>' +
        (obs ? '<div class="toolbar"><span class="b small">Pekerjaan spesifik:</span><select class="input" data-chg="pilihPek" data-j="' + jenis + '">' + pekList.map(p => '<option' + (p === pek ? ' selected' : '') + '>' + esc(p) + '</option>').join('') + '</select><button class="btn ghost sm" data-act="pekBaru" data-j="' + jenis + '">' + ic('add') + 'Pekerjaan baru</button></div>' : '') +
        '<div class="with-panel"><div id="ins-list">' + (items.length ? items.map(baris).join('') : baris({}, 0)) + '<button class="btn sec mt" data-act="tambahAspek">' + ic('add') + 'Tambah aspek</button></div>' +
        '<div class="card sticky-side"><span class="stat-lbl">Total bobot</span><div class="big-score mt-s" id="tot-bobot">' + tot + '</div><p class="small muted">Disarankan total 100. Nilai dihitung terbobot (Σ skor×bobot / Σ bobot).</p><button class="btn block lg" data-act="simpanInstrumen" data-j="' + jenis + '" data-pek="' + esc(pek) + '">' + ic('save') + 'Simpan Instrumen</button></div></div>' +
        '<template id="tpl-aspek">' + baris({}, 0) + '</template>';
    }
  };
  Inp.bobotTotal = () => { const t = [...document.querySelectorAll('#ins-list [data-f=Bobot]')].reduce((a, i) => a + (+i.value || 0), 0); const el = document.getElementById('tot-bobot'); if (el) { el.textContent = t; el.style.color = t === 100 ? '' : 'var(--amber-700)'; } };
  Act.pilihPek = el => App.go('#/instrumen/' + el.dataset.j + '|' + encodeURIComponent(el.value));
  Act.pekBaru = el => { const n = prompt('Nama pekerjaan spesifik baru (mis. "Administrasi Server"):'); if (n && n.trim()) App.go('#/instrumen/' + el.dataset.j + '|' + encodeURIComponent(n.trim())); };
  Act.tambahAspek = el => { const t = document.getElementById('tpl-aspek').content.cloneNode(true); el.before(t); document.querySelectorAll('#ins-list .aspek-no').forEach((n, i) => (n.textContent = i + 1)); App.dirty = true; };
  Act.hapusAspek = el => { el.closest('[data-item]').remove(); document.querySelectorAll('#ins-list .aspek-no').forEach((n, i) => (n.textContent = i + 1)); Inp.bobotTotal(); App.dirty = true; };
  Act.simpanInstrumen = el => {
    const items = [...document.querySelectorAll('#ins-list [data-item]')].map(x => ({ InstrumenID: x.dataset.id, Aspek: x.querySelector('[data-f=Aspek]').value, Deskripsi: x.querySelector('[data-f=Deskripsi]').value, Bobot: x.querySelector('[data-f=Bobot]').value })).filter(i => i.Aspek.trim());
    simpan(el, 'instrumen.simpan', { Jenis: el.dataset.j, PekerjaanSpesifik: el.dataset.pek, items });
  };

  /* ======================= PENGATURAN ======================= */
  Pages['ADMIN:pengaturan'] = {
    render() {
      let bb = {}; try { bb = JSON.parse(P('BOBOT_NILAI')); } catch (e) {}
      const f = (k, label, o) => fld(Object.assign({ name: k, label, value: P(k) }, o || {}));
      return head(ic('settings') + ' Sistem', 'Pengaturan', 'Identitas sekolah, periode aktif, ambang peringatan, bobot nilai, dan integrasi. Rahasia (token, ID E-Jurnal) disimpan di Script Properties — tidak di spreadsheet.') +
        '<form id="f-set" data-dirty><div class="grid g2"><div class="card"><div class="card-h"><span class="ic teal">' + ic('school') + '</span><h3>Identitas & Periode</h3></div><div class="form-grid">' +
        f('NAMA_SEKOLAH', 'Nama sekolah', { full: true }) + f('ALAMAT_SEKOLAH', 'Alamat sekolah', { full: true }) + f('KOMPETENSI', 'Kompetensi keahlian', { full: true }) + f('TAHUN_AJARAN', 'Tahun ajaran') +
        fld({ name: 'PERIODE_AKTIF', label: 'Periode aktif', type: 'select', options: ['1', '2'], value: P('PERIODE_AKTIF'), kosong: false }) + f('LOGO_URL', 'Link logo (Google Drive)', { full: true }) +
        f('KOORDINATOR_NAMA', 'Nama Koordinator PKL') + f('KOORDINATOR_NIP', 'NIP Koordinator') + f('KOORDINATOR_KONTAK', 'Kontak / ruang koordinator', { full: true, help: 'Tampil di halaman Lupa Sandi.' }) +
        f('EJURNAL_URL', 'Alamat aplikasi E-Jurnal Guru', { full: true }) + f('APP_URL', 'URL aplikasi ini (GitHub Pages)', { full: true, help: 'Dipakai untuk tautan notifikasi & QR verifikasi.', ph: location.href.replace(/#.*$/, '') }) + '</div></div>' +
        '<div class="card"><div class="card-h"><span class="ic rose">' + ic('rule') + '</span><h3>Aturan PKL</h3></div><div class="form-grid">' + f('AMBANG_ALFA', 'Ambang Alfa / periode', { type: 'number', min: 1 }) + f('AMBANG_IZIN', 'Ambang Izin / periode', { type: 'number', min: 1 }) +
        f('KKM', 'KKM nilai PKL', { type: 'number', min: 0, max: 100 }) + f('SESI_JAM', 'Masa sesi login (jam)', { type: 'number', min: 1, max: 72 }) + '</div>' +
        '<div class="lbl mt">Bobot nilai akhir (%)</div><div class="form-grid mt-s">' + Object.keys(JENIS).map(j => fld({ name: 'bb_' + j, label: JENIS[j], type: 'number', min: 0, max: 100, value: bb[j] || 0 })).join('') + '</div>' +
        f('PEKERJAAN_SPESIFIK', 'Daftar pekerjaan spesifik (pisah ;)', { type: 'textarea', rows: 2 }) + '</div></div>' +
        '<div class="card mt"><div class="card-h"><span class="ic indigo">' + ic('sync') + '</span><div class="grow"><h3>Pemetaan E-Jurnal</h3><div class="sub">Nama sheet & kolom di spreadsheet E-Jurnal (JSON). Sumber hanya dibaca.</div></div></div>' +
        f('EJ_PETA', 'EJ_PETA', { type: 'textarea', rows: 4 }) + f('EJ_FILTER_KELAS', 'Filter kelas siswa (mengandung teks)') + '</div>' +
        '<div class="row mt" style="justify-content:flex-end"><button class="btn lg" data-act="simpanSetting">' + ic('save') + 'Simpan Pengaturan</button></div></form>' +
        '<div class="card mt" id="tema-card"><div class="card-h"><span class="ic teal">' + ic('palette') + '</span><div class="grow"><h3>Tema & Suasana Aplikasi</h3><div class="sub">Warna aplikasi menyesuaikan hari peringatan. Berlaku untuk semua pengguna, termasuk halaman login.</div></div></div><div id="tema-box"></div></div>' +
        '<div class="grid g2 mt"><div class="card"><div class="card-h"><span class="ic amber">' + ic('key') + '</span><div class="grow"><h3>Keamanan & Integrasi</h3><div class="sub">Disimpan di Script Properties, ditampilkan tersamar.</div></div></div><div id="rahasia-box"><div class="skel" style="height:120px"></div></div></div>' +
        '<div class="card"><div class="card-h"><span class="ic teal">' + ic('monitor_heart') + '</span><h3 class="grow">Status Sistem</h3><button class="btn ghost xs" data-act="perf">' + ic('speed') + 'Perf</button></div><div id="sistem-box"><div class="skel" style="height:120px"></div></div></div></div>';
    },
    async after() {
      TemaEd.mulai(); TemaEd.gambar();
      const [ra, si] = await Promise.all([api('rahasia.status', {}), api('sistem.status', {})]);
      const rb = document.getElementById('rahasia-box'), sb = document.getElementById('sistem-box'); if (!rb) return;
      const lbl = { EJURNAL_SPREADSHEET_ID: 'ID / URL Spreadsheet E-Jurnal', VP_URL: 'URL Verifikasi Pusat (opsional)', VP_KODE_APP: 'Kode aplikasi Verifikasi Pusat', VP_KUNCI: 'Kunci Verifikasi Pusat', FONNTE_TOKEN: 'Token Fonnte (WhatsApp)' };
      rb.innerHTML = ra.success ? Object.keys(ra.data).map(k => '<div class="field"><label>' + esc(lbl[k] || k) + ' ' + (ra.data[k].ada ? pill('Tersimpan', 'ok') : pill('Kosong', 'mute')) + '</label><div class="row"><input class="input" type="password" autocomplete="off" data-rahasia="' + k + '" placeholder="' + esc(ra.data[k].samar || 'Belum diisi') + '"><button class="btn sec sm" data-act="simpanRahasia" data-k="' + k + '">Simpan</button>' + (ra.data[k].ada ? '<button class="btn ghost sm" data-act="hapusRahasia" data-k="' + k + '" title="Hapus">' + ic('delete') + '</button>' : '') + '</div></div>').join('') +
        '<hr style="border:0;border-top:1px solid var(--line);margin:16px 0"><div class="row between"><div><b class="small">Sandi akses darurat</b><div class="xs muted">Rotasi setelah dipakai (min. 12 karakter).</div></div><button class="btn danger-o sm" data-act="rotasiDarurat">' + ic('emergency_home') + 'Rotasi</button></div>' : '<div class="empty">' + esc(ra.message) + '</div>';
      if (si.success) { const s = si.data; sb.innerHTML = '<dl class="kv"><dt>Versi backend</dt><dd>' + esc(s.versi) + '</dd><dt>Cache terakhir dipanaskan</dt><dd>' + esc(s.warm ? fmtWaktu(s.warm.at) + ' (' + s.warm.scope + ')' : '-') + '</dd><dt>Trigger aktif</dt><dd>' + (s.trigger.map(t => pill(t, 'ok')).join(' ') || pill('Tidak ada', 'bad')) + '</dd><dt>Keep warm</dt><dd>' + (s.keepWarm ? 'Aktif' : 'Dimatikan') + '</dd><dt>Ukuran Script Properties</dt><dd>' + Math.round(s.ukuranProps / 1024) + ' KB / 500 KB</dd></dl><a class="btn ghost sm mt" target="_blank" rel="noopener" href="' + esc(s.spreadsheetUrl) + '">' + ic('table') + 'Buka Database (Sheets)</a>'; }
      else sb.innerHTML = '<div class="empty">' + esc(si.message) + '</div>';
    }
  };

  /* ---------- Tema & suasana (editor) ---------- */
  const BAWAAN_TEMA = { preset: 'mint', otomatis: true, motif: true, hari: ['kartini', 'hardiknas', 'kemerdekaan', 'batik', 'sumpahpemuda', 'pahlawan', 'guru'], ucapanTampil: true, ucapan: '', kustom: { p: '#0D9488', a: '#F43F5E' }, jadwal: [] };
  const TemaEd = {
    c: null, fokus: null,
    mulai() { const c = Tema.cfg(); TemaEd.c = Object.assign(JSON.parse(JSON.stringify(BAWAAN_TEMA)), c, { kustom: Object.assign({}, BAWAAN_TEMA.kustom, c.kustom || {}), jadwal: (c.jadwal || []).slice(), hari: Array.isArray(c.hari) ? c.hari.slice() : BAWAAN_TEMA.hari.slice() }); TemaEd.fokus = null; },
    /** Tema yang dipratinjau = pilihan terakhir yang disentuh admin (bukan selalu yang aktif hari ini). */
    lihat() { const t = TemaEd._lihat(); t.motif = TemaEd.c.motif !== false; return t; },
    _lihat() {
      const c = TemaEd.c, f = TemaEd.fokus;
      if (f && f !== 'kustom') { const pr = Tema.preset(f); return { id: pr.id, n: pr.n, p: pr.p, a: pr.a, u: pr.u, sumber: 'dasar' }; }
      if (f === 'kustom' || c.preset === 'kustom') return { id: 'kustom', n: 'Warna sendiri', p: c.kustom.p, a: c.kustom.a, u: c.ucapan, sumber: 'dasar' };
      return Tema.aktif(c);
    },
    ubah() { App.dirty = true; Tema.pratinjau(TemaEd.lihat()); TemaEd.gambar(); },
    gambar() {
      const box = document.getElementById('tema-box'); if (!box || !TemaEd.c) return;
      const c = TemaEd.c, kini = Tema.aktif(c), lihat = TemaEd.lihat(), sw = (p, a, k) => '<span class="sw ' + (k || '') + '"><i style="background:' + esc(p) + '"></i><i style="background:' + esc(a) + '"></i></span>';
      const sumber = { jadwal: 'dari jadwal khusus ' + fmtTgl(kini.dari) + '–' + fmtTgl(kini.sampai), otomatis: 'otomatis karena hari peringatan', dasar: 'tema dasar' }[kini.sumber];
      const k = Tema.kontras(c.kustom.p), kOk = k >= 4.5, kCukup = k >= 3;
      const pr = Tema.PRESET, hariList = pr.filter(x => x.dari);
      const opsiPreset = (sel) => pr.map(x => '<option value="' + x.id + '"' + (x.id === sel ? ' selected' : '') + '>' + esc(x.n) + '</option>').join('');
      box.innerHTML = '<div class="alert info mb">' + sw(kini.p, kini.a) + '<div class="grow"><h4>Aktif hari ini setelah disimpan: ' + esc(kini.n) + '</h4><p class="small">' + esc(sumber) + (kini.u && c.ucapanTampil ? ' · ucapan: “' + esc(kini.u) + '”' : '') + '</p></div></div>' +
        '<div class="tema-lay"><div>' +
        '<div class="tema-sec">Tema dasar</div><p class="small muted" style="margin:-2px 0 10px">Dipakai di luar hari peringatan. Klik untuk melihat pratinjau.</p><div class="tema-grid">' +
        pr.map(x => '<button type="button" class="tema-opt' + (c.preset === x.id ? ' on' : '') + '" data-act="temaPilih" data-id="' + x.id + '" aria-pressed="' + (c.preset === x.id) + '"' + (c.motif !== false && Tema.MOTIF[x.id] ? ' style="background-image:' + esc(Tema.motifUrl(x.id, 'siluet', x.p, .12)) + '"' : '') + '>' + sw(x.p, x.a) + '<span class="n">' + esc(x.n) + '</span><span class="d">' + esc(x.tgl ? 'Peringatan ' + x.tgl : x.ket || '') + '</span></button>').join('') +
        '<button type="button" class="tema-opt' + (c.preset === 'kustom' ? ' on' : '') + '" data-act="temaPilih" data-id="kustom" aria-pressed="' + (c.preset === 'kustom') + '">' + sw(c.kustom.p, c.kustom.a) + '<span class="n">Warna sendiri</span><span class="d">Mis. warna logo sekolah</span></button></div>' +
        (c.preset === 'kustom' ? '<div class="tema-warna mt">' +
          '<div class="field"><label for="tw-p">Warna utama (menu aktif, tombol)</label><div class="pk"><input type="color" id="tw-p" value="' + esc(c.kustom.p) + '" data-inp="temaWarna" data-chg="temaWarnaSelesai" data-k="p"><input class="input mono" id="tw-p-hex" value="' + esc(c.kustom.p) + '" maxlength="7" data-chg="temaHex" data-k="p"></div>' +
          '<div class="kontras" style="color:' + (kOk ? 'var(--teal-700)' : kCukup ? 'var(--amber-700)' : 'var(--rose-700)') + '">' + ic(kOk ? 'check_circle' : 'warning', 'fill') + 'Teks putih di atas warna ini: rasio ' + k.toFixed(1) + ':1 ' + (kOk ? '(mudah dibaca)' : kCukup ? '(cukup, lebih gelap lebih baik)' : '(sulit dibaca)') + '</div>' +
          (kOk ? '' : '<button type="button" class="btn ghost xs mt-s" data-act="temaGelapkan">' + ic('contrast') + 'Gelapkan agar mudah dibaca</button>') + '</div>' +
          '<div class="field"><label for="tw-a">Warna aksen (hiasan, ucapan)</label><div class="pk"><input type="color" id="tw-a" value="' + esc(c.kustom.a) + '" data-inp="temaWarna" data-chg="temaWarnaSelesai" data-k="a"><input class="input mono" id="tw-a-hex" value="' + esc(c.kustom.a) + '" maxlength="7" data-chg="temaHex" data-k="a"></div></div></div>' : '') +
        '<div class="tema-sec">Hari peringatan</div><label class="check mb"><input type="checkbox" id="tm-oto" data-chg="temaSet" data-k="otomatis"' + (c.otomatis ? ' checked' : '') + '> Ganti tema otomatis pada hari peringatan berikut, lalu kembali ke tema dasar</label>' +
        '<div class="tema-hari"' + (c.otomatis ? '' : ' style="opacity:.5"') + '>' + hariList.map(x => '<label>' + '<input type="checkbox" data-chg="temaHari" value="' + x.id + '"' + (c.hari.indexOf(x.id) > -1 ? ' checked' : '') + (c.otomatis ? '' : ' disabled') + '>' + sw(x.p, x.a, 'sm') + esc(x.n) + ' <span class="t">' + esc(x.tgl) + '</span></label>').join('') + '</div>' +
        '<div class="tema-sec">Jadwal khusus</div><p class="small muted" style="margin:-2px 0 10px">Untuk tanggal yang berubah tiap tahun (Ramadan, Idulfitri) atau acara sekolah. Jadwal khusus mengalahkan pengaturan lain.</p><div class="tema-jadwal">' +
        (c.jadwal.length ? c.jadwal.map((j, i) => '<div class="jr"><select class="input" aria-label="Tema" data-chg="temaJadwal" data-i="' + i + '" data-f="preset">' + opsiPreset(j.preset) + '</select>' +
          '<input class="input" type="date" aria-label="Mulai" value="' + esc(j.dari || '') + '" data-chg="temaJadwal" data-i="' + i + '" data-f="dari"><input class="input" type="date" aria-label="Selesai" value="' + esc(j.sampai || '') + '" data-chg="temaJadwal" data-i="' + i + '" data-f="sampai">' +
          '<input class="input" aria-label="Ucapan (opsional)" placeholder="Ucapan (opsional)" maxlength="140" value="' + esc(j.ucapan || '') + '" data-chg="temaJadwal" data-i="' + i + '" data-f="ucapan"><button type="button" class="btn ghost sm" data-act="temaJadwalHapus" data-i="' + i + '" aria-label="Hapus jadwal">' + ic('delete') + '</button></div>').join('') : '<div class="small muted">Belum ada jadwal khusus.</div>') +
        '</div><button type="button" class="btn ghost sm mt-s" data-act="temaJadwalTambah">' + ic('add') + 'Tambah jadwal</button>' +
        '<div class="tema-sec">Hiasan</div><label class="check mb"><input type="checkbox" data-chg="temaSet" data-k="motif"' + (c.motif !== false ? ' checked' : '') + '> Tampilkan motif dan siluet khas (kawung & mega mendung saat Hari Batik, bendera saat HUT RI, bambu runcing saat Hari Pahlawan, ketupat saat Idulfitri, dll.)</label>' +
        '<div class="tema-sec">Ucapan</div><label class="check mb"><input type="checkbox" data-chg="temaSet" data-k="ucapanTampil"' + (c.ucapanTampil ? ' checked' : '') + '> Tampilkan ucapan di dashboard dan halaman login</label>' +
        fld({ name: 'tm-ucapan', label: 'Ucapan untuk tema dasar (kosongkan untuk memakai ucapan bawaan tema)', value: c.ucapan, ph: (Tema.preset(c.preset) || {}).u || 'Mis. Selamat datang di masa PKL 2026!', full: true, attr: ' maxlength="140" data-chg="temaUcapan"' }) +
        '</div><aside class="tema-prev" aria-label="Pratinjau"><div class="tp-h">Pratinjau · ' + esc(lihat.n) + '</div><div class="tp-b">' +
        (lihat.u ? '<div class="tema-ucapan"><span class="tu-ic">' + ic(lihat.id === 'kemerdekaan' ? 'flag' : 'celebration', 'fill') + '</span><div class="grow"><div class="tu-t">' + esc(lihat.u) + '</div></div></div>' : '') +
        '<div class="tp-nav"><span>' + ic('dashboard') + 'Dashboard</span><span class="on">' + ic('fact_check') + 'Penilaian</span><span>' + ic('event_available') + 'Absensi</span></div>' +
        '<div class="row wrap gap-s"><span class="btn sm">' + ic('save') + 'Simpan</span><span class="btn sec sm">Batal</span>' + pill('Periode 1', 'info') + '</div>' +
        '<div class="card tight"><div class="row between small"><b>Progres penilaian</b><span class="b" style="color:var(--teal-700)">72%</span></div><div class="tp-bar mt-s"><i></i></div></div>' +
        '<p class="xs muted" style="margin:0">Warna peringatan (Alfa, terkunci, gagal) tidak ikut berubah agar maknanya tetap jelas.</p></div></aside></div>' +
        '<div class="row wrap mt" style="justify-content:flex-end;gap:8px"><button type="button" class="btn ghost" data-act="temaBawaan">' + ic('restart_alt') + 'Kembalikan bawaan</button><button type="button" class="btn ghost" data-act="temaBatal">' + ic('undo') + 'Batalkan perubahan</button><button type="button" class="btn" data-act="temaSimpan">' + ic('palette') + 'Simpan Tema</button></div>';
    }
  };
  const hexOk = v => /^#[0-9A-Fa-f]{6}$/.test(v);
  Act.temaPilih = el => { TemaEd.c.preset = el.dataset.id; TemaEd.fokus = el.dataset.id; TemaEd.ubah(); };
  Inp.temaWarna = el => {
    TemaEd.c.kustom[el.dataset.k] = el.value.toUpperCase(); TemaEd.fokus = 'kustom'; App.dirty = true; Tema.pratinjau(TemaEd.lihat());
    const h = document.getElementById('tw-' + el.dataset.k + '-hex'); if (h) h.value = el.value.toUpperCase();
  };
  Act.temaWarnaSelesai = () => TemaEd.gambar();
  Act.temaHex = el => { let v = el.value.trim(); if (v && v[0] !== '#') v = '#' + v; if (!hexOk(v)) { toast('Kode warna harus 6 digit hex, mis. #0D9488.', 'warn'); el.value = TemaEd.c.kustom[el.dataset.k]; return; } TemaEd.c.kustom[el.dataset.k] = v.toUpperCase(); TemaEd.fokus = 'kustom'; TemaEd.ubah(); };
  Act.temaGelapkan = () => { TemaEd.c.kustom.p = Tema.gelapkan(TemaEd.c.kustom.p, 4.5); TemaEd.fokus = 'kustom'; TemaEd.ubah(); toast('Warna utama digelapkan menjadi ' + TemaEd.c.kustom.p + '.', 'ok'); };
  Act.temaSet = el => { TemaEd.c[el.dataset.k] = el.checked; TemaEd.fokus = null; TemaEd.ubah(); };
  Act.temaHari = el => { const h = TemaEd.c.hari, i = h.indexOf(el.value); if (el.checked && i < 0) h.push(el.value); if (!el.checked && i > -1) h.splice(i, 1); TemaEd.fokus = el.checked ? el.value : null; TemaEd.ubah(); };
  Act.temaUcapan = el => { TemaEd.c.ucapan = el.value.trim().slice(0, 140); TemaEd.fokus = null; TemaEd.ubah(); };
  Act.temaJadwal = el => { const j = TemaEd.c.jadwal[+el.dataset.i]; if (!j) return; j[el.dataset.f] = el.value; if (el.dataset.f === 'preset') TemaEd.fokus = el.value; App.dirty = true; if (el.dataset.f === 'preset') TemaEd.ubah(); else TemaEd.gambar(); };
  Act.temaJadwalTambah = () => { if (TemaEd.c.jadwal.length >= 20) { toast('Maksimal 20 jadwal khusus.', 'warn'); return; } const d = hariIni(); TemaEd.c.jadwal.push({ preset: 'ramadan', dari: d, sampai: tambahHari(d, 6), ucapan: '' }); TemaEd.fokus = 'ramadan'; TemaEd.ubah(); };
  Act.temaJadwalHapus = el => { TemaEd.c.jadwal.splice(+el.dataset.i, 1); TemaEd.fokus = null; TemaEd.ubah(); };
  Act.temaBatal = () => { TemaEd.mulai(); Tema.prev = null; App.dirty = false; Tema.sinkron(''); TemaEd.gambar(); toast('Perubahan tema dibatalkan.', 'ok'); };
  Act.temaBawaan = () => { TemaEd.c = JSON.parse(JSON.stringify(BAWAAN_TEMA)); TemaEd.fokus = 'mint'; TemaEd.ubah(); toast('Pengaturan bawaan dimuat. Tekan Simpan Tema untuk menerapkan.', 'ok'); };
  Act.temaSimpan = async btn => {
    const c = TemaEd.c;
    if (c.preset === 'kustom' && Tema.kontras(c.kustom.p) < 3) { toast('Warna utama terlalu terang: teks putih sulit dibaca. Tekan "Gelapkan agar mudah dibaca".', 'warn'); return; }
    for (let i = 0; i < c.jadwal.length; i++) { const j = c.jadwal[i]; if (!j.dari || !j.sampai) { toast('Jadwal khusus baris ' + (i + 1) + ': isi kedua tanggal.', 'warn'); return; } if (j.dari > j.sampai) { toast('Jadwal khusus baris ' + (i + 1) + ': tanggal mulai melewati tanggal selesai.', 'warn'); return; } }
    Tema.prev = null; App.dirty = false;
    const r = await simpan(btn, 'pengaturan.simpan', { pengaturan: { TEMA: JSON.stringify(c) } });
    if (r && r.success) { TemaEd.mulai(); TemaEd.gambar(); }
  };
  Act.perf = () => { Perf.table(); toast('Tabel kinerja ditampilkan di Console (F12).', 'ok'); };
  Act.simpanSetting = btn => {
    const d = bacaForm(document.getElementById('f-set')), bb = {}, out = {};
    Object.keys(JENIS).forEach(j => { bb[j] = +d['bb_' + j] || 0; delete d['bb_' + j]; });
    const tot = Object.values(bb).reduce((a, b) => a + b, 0); if (tot !== 100) { toast('Total bobot nilai harus 100 (sekarang ' + tot + ').', 'warn'); return; }
    Object.keys(d).forEach(k => (out[k] = d[k])); out.BOBOT_NILAI = JSON.stringify(bb);
    simpan(btn, 'pengaturan.simpan', { pengaturan: out });
  };
  Act.simpanRahasia = btn => { const i = document.querySelector('[data-rahasia=' + btn.dataset.k + ']'); if (!i.value.trim()) { toast('Isi nilai terlebih dahulu.', 'warn'); return; } simpan(btn, 'rahasia.simpan', { kunci: btn.dataset.k, nilai: i.value.trim() }, { reload: false }).then(r => { i.value = ''; if (r && r.success) App.render(true); }); };
  Act.hapusRahasia = async btn => { if (await konfirmasi('Hapus ' + btn.dataset.k + ' dari Script Properties?', { danger: true, ok: 'Hapus' })) simpan(btn, 'rahasia.simpan', { kunci: btn.dataset.k, nilai: '__HAPUS__' }, { reload: false }).then(() => App.render(true)); };
  Act.rotasiDarurat = () => formModal({ title: 'Rotasi Sandi Akses Darurat', icon: 'emergency_home', action: 'darurat.rotasi', size: 'sm', reload: false,
    fields: [{ name: 'sandiBaru', label: 'Sandi darurat baru (min. 12, huruf + angka)', type: 'password', req: true, full: true }] });

  /* ======================= LOG ======================= */
  Pages['ADMIN:log'] = {
    render() { return head(ic('history') + ' Sistem', 'Log Aktivitas', 'Jejak perubahan nilai, absensi, akun, dan konfigurasi. Nilai rahasia tidak pernah dicatat.') + '<div id="log-box"><div class="skel" style="height:240px"></div></div>'; },
    async after() {
      const r = await api('log.list', { limit: 500 }), box = document.getElementById('log-box'); if (!box) return;
      if (!r.success) { box.innerHTML = '<div class="card empty">' + esc(r.message) + '</div>'; return; }
      const rows = r.data.filter(l => cari(l, S.q));
      box.innerHTML = '<div class="toolbar"><button class="btn ghost sm" data-act="eksporLog">' + ic('download') + 'Ekspor</button><span class="small muted">' + rows.length + ' entri terbaru</span></div>' +
        tblWrap(['Waktu', 'Pengguna', 'Peran', 'Aksi', 'Entitas', 'Detail'], rows.map(l => '<tr class="' + (/GAGAL|DARURAT/.test(l.Aksi) ? 'warn-row' : '') + '"><td class="small">' + esc(fmtWaktu(l.Waktu)) + '</td><td class="mono">' + esc(l.Pengguna) + '</td><td class="small">' + esc(l.Peran) + '</td><td>' + pill(l.Aksi, /GAGAL/.test(l.Aksi) ? 'bad' : 'info') + '</td><td class="small">' + esc(l.Entitas) + '</td><td class="xs muted" style="max-width:380px;word-break:break-word">' + esc(l.Detail) + '</td></tr>'));
      window._logRows = rows;
    }
  };
  Act.eksporLog = () => eksporXlsx({ Log: (window._logRows || []).map(l => ({ Waktu: l.Waktu, Pengguna: l.Pengguna, Peran: l.Peran, Aksi: l.Aksi, Entitas: l.Entitas, Detail: l.Detail })) }, 'Log SIGAPKL');
})();
