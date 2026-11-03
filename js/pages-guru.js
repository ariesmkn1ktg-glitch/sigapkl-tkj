/* SIGAPKL · Halaman GURU PEMBIMBING */
(function () {
  'use strict';
  const ref = () => Sesi.me.ref;
  /** Siswa bimbingan (penempatan dengan GuruID = saya) — penguji presentasi saja tidak termasuk */
  function bimbingan() {
    const o = {}; S.data.penempatan.forEach(p => { if (p.GuruID === ref()) o[p.NIS] = 1; });
    return Object.keys(o).map(n => S.ix.siswa[n]).filter(Boolean).filter(s => cari({ n: s.Nama, i: s.NIS, d: nmDudi((penOf(s.NIS) || {}).DUDIID) }, S.q));
  }
  const diuji = () => S.data.presentasi.filter(p => p.PengujiID === ref());
  window.siswaBimbinganGuru = bimbingan;

  function statusNilaiGuru(nis) {
    const rk = rekap(nis), j = ['PEMBIMBING', 'LAPORAN'].filter(x => rk.nilai[x] !== undefined).length;
    return j === 2 ? pill('Nilai lengkap', 'ok', true) : j ? pill(j + '/2 dinilai', 'warn', true) : pill('Belum dinilai', 'mute', true);
  }
  function barisSiswa(s) {
    const rk = rekap(s.NIS), pen = rk.pen || {}, j = S.ix.jurnal[s.NIS + '|' + rk.periode];
    return '<tr class="' + (rk.prg.length ? 'bad-row' : '') + '"><td><div class="who">' + av(s.Nama, s.FotoURL) + '<div><div class="n">' + esc(s.Nama) + '</div><div class="s">NIS ' + esc(s.NIS) + ' · ' + esc(s.Kelas) + '</div></div></div></td>' +
      '<td><b>' + esc(nmDudi(pen.DUDIID)) + '</b><div class="xs muted">' + esc(pen.PekerjaanSpesifik || '') + '</div></td>' +
      '<td><b style="color:' + (rk.persen < 90 && rk.hari ? 'var(--rose-700)' : 'var(--teal-700)') + '">' + num(rk.persen, 0) + '%</b><div class="xs">' + (rk.t.A ? pill(rk.t.A + ' Alfa', 'bad') : '') + ' <span class="muted">' + rk.t.I + ' Izin</span></div></td>' +
      '<td>' + (j ? '<a class="pill ok" href="' + esc(j.Link) + '" target="_blank" rel="noopener">' + ic('cloud_done') + ' Buka</a>' : pill('Belum ada', 'mute')) + '</td>' +
      '<td>' + statusNilaiGuru(s.NIS) + '</td><td class="right"><button class="btn ghost xs" data-act="detailSiswa" data-nis="' + esc(s.NIS) + '">Detail</button></td></tr>';
  }

  /* ---------- Dashboard ---------- */
  Pages['GURU:dashboard'] = {
    render() {
      const sis = bimbingan(), g = S.ix.guru[ref()] || {}, prg = S.data.peringatan.filter(p => p.Status === 'Belum ditangani'), pesan = S.data.pesan.filter(p => p.Status === 'Baru');
      const dudi = new Set(sis.map(s => (penOf(s.NIS) || {}).DUDIID)).size;
      const komp = { PEMBIMBING: 0, LAPORAN: 0, PRESENTASI: 0 }; sis.forEach(s => { const rk = rekap(s.NIS); ['PEMBIMBING', 'LAPORAN'].forEach(j => { if (rk.nilai[j] !== undefined) komp[j]++; }); });
      diuji().forEach(p => { if (rekap(p.NIS).nilai.PRESENTASI !== undefined) komp.PRESENTASI++; });
      const totalTugas = sis.length * 2 + diuji().length, selesai = komp.PEMBIMBING + komp.LAPORAN + komp.PRESENTASI, persen = totalTugas ? Math.round(selesai / totalTugas * 100) : 0;
      const ag = S.data.bimbingan.filter(b => b.GuruID === ref() && b.Status === 'Terjadwal' && b.Tanggal >= hariIni()).sort((a, b) => a.Tanggal.localeCompare(b.Tanggal)).slice(0, 3);
      const p1 = prg[0];
      return '<div class="row small muted mb">' + ic('verified_user') + esc(g.Nama || Sesi.me.nama) + (g.NIP ? ' · NIP. ' + esc(g.NIP) : '') + '</div>' +
        head(ic('school') + ' Panel Supervisi Vokasi TKJ', 'Dashboard Guru Pembimbing PKL', 'Supervisi ' + sis.length + ' siswa bimbingan di ' + dudi + ' mitra DU/DI — monitoring kehadiran mingguan, penilaian, penanganan peringatan, dan pesan darurat.',
          '<button class="btn ghost" data-act="eksporGuru">' + ic('table_view') + 'Unduh Rekap (Excel)</button><a class="btn" href="#/bimbingan">' + ic('add_circle') + 'Jadwalkan Bimbingan</a>') +
        '<div class="grid g4">' +
        '<div class="card stat"><div class="stat-top"><span class="ic teal">' + ic('groups') + '</span>' + pill(dudi + ' DU/DI', 'info') + '</div><div class="stat-val">' + sis.length + '<small> siswa bimbingan</small></div><a class="small b" href="#/siswa">Lihat semua ' + ic('arrow_forward') + '</a></div>' +
        '<div class="card stat"><div class="stat-top"><span class="ic teal">' + ic('task_alt') + '</span>' + pill(persen + '% tercapai', 'ok') + '</div><div class="stat-val">' + selesai + '<small> / ' + totalTugas + ' penilaian</small></div><div class="bar"><i style="width:' + persen + '%"></i></div></div>' +
        '<div class="card stat rose"><div class="stat-top"><span class="ic rose">' + ic('warning') + '</span>' + (prg.length ? pill('Kritis', 'bad') : '') + '</div><div class="stat-val">' + prg.length + '<small> peringatan</small></div><a class="small b" style="color:var(--rose-700)" href="#/peringatan">Perlu intervensi ' + ic('arrow_forward') + '</a></div>' +
        '<div class="card stat"><div class="stat-top"><span class="ic amber">' + ic('emergency') + '</span>' + (pesan.length ? pill(pesan.length + ' baru', 'warn') : '') + '</div><div class="stat-val">' + pesan.length + '<small> pesan DU/DI</small></div><a class="small b" href="#/pesan">Buka pesan ' + ic('arrow_forward') + '</a></div></div>' +
        (p1 ? '<div class="alert bad big mt"><span class="ic">' + ic('crisis_alert', 'fill') + '</span><div class="grow"><h4>' + pill('Peringatan Disiplin Sistem', 'solid-bad') + ' Tindakan diperlukan</h4><p><b>' + esc(nmSiswa(p1.NIS)) + '</b> telah mencapai ' + esc(p1.Jumlah) + ' hari ' + (p1.Jenis === 'ALFA' ? 'Alfa' : 'Izin') + ' di ' + esc(nmDudi((penOf(p1.NIS, p1.Periode) || {}).DUDIID)) + ' (Periode ' + esc(p1.Periode) + ').' + (prg.length > 1 ? ' +' + (prg.length - 1) + ' peringatan lain.' : '') + '</p></div>' +
          '<div class="actions"><button class="btn danger sm" data-act="tangani" data-id="' + esc(p1.PeringatanID) + '">Tindak Lanjut & Catat</button><a class="btn danger-o sm" href="#/bimbingan">Jadwalkan Konseling</a></div></div>' : '') +
        '<div class="with-panel mt"><div class="card flush"><div class="row between wrap" style="padding:18px 20px"><div><h3>Daftar Siswa Bimbingan & Status Pemantauan</h3><div class="small muted">Periode aktif ' + esc(periodeAktif()) + ' · TA ' + esc(P('TAHUN_AJARAN')) + '</div></div></div>' +
        (sis.length ? '<div class="tbl-wrap" style="border:0;border-radius:0"><table class="tbl"><thead><tr><th>Siswa</th><th>DU/DI & Pekerjaan</th><th>Kehadiran</th><th>Jurnal</th><th>Status Penilaian</th><th></th></tr></thead><tbody>' + sis.map(barisSiswa).join('') + '</tbody></table></div>' : '<div class="empty">' + ic('group_off') + 'Belum ada siswa bimbingan.</div>') + '</div>' +
        '<div class="grid"><div class="card"><div class="row between mb"><h3>Progres Penilaian</h3>' + pill('TA ' + P('TAHUN_AJARAN'), 'ok') + '</div>' +
        donut({ center: persen + '%', sub: 'Tercapai', total: Math.max(totalTugas, 1), segments: [{ label: 'Penilaian Pembimbing', value: komp.PEMBIMBING, color: Tema.c(), teks: komp.PEMBIMBING + '/' + sis.length }, { label: 'Nilai Laporan', value: komp.LAPORAN, color: '#F59E0B', teks: komp.LAPORAN + '/' + sis.length }, { label: 'Presentasi (diuji)', value: komp.PRESENTASI, color: '#6366F1', teks: komp.PRESENTASI + '/' + diuji().length }] }) +
        '<a class="btn sec block mt" href="#/penilaian">Buka Lembar Penilaian ' + ic('arrow_forward') + '</a></div>' +
        (pesan[0] ? '<div class="card"><div class="row between mb"><h3 class="row">' + ic('emergency', 'fill') + ' Pesan Darurat DU/DI</h3>' + pill('Perlu balasan', 'solid-bad') + '</div><div class="info-box" style="background:var(--rose-50)"><div class="b small">' + esc(nmIns(pesan[0].InstrukturID)) + ' · ' + esc(fmtWaktu(pesan[0].DibuatPada)) + '</div><div class="xs" style="color:var(--rose-700)">Terkait: ' + esc(nmSiswa(pesan[0].NIS)) + '</div><p class="small" style="margin:8px 0 0">"' + esc(pesan[0].Isi) + '"</p></div><a class="btn block mt" href="#/pesan">' + ic('reply') + 'Balas Pesan</a></div>' : '') +
        '<div class="card"><div class="row between mb"><h3>Jadwal Supervisi Terdekat</h3><a class="small b" href="#/bimbingan">+ Tambah</a></div>' + (ag.length ? '<div class="list">' + ag.map(b => '<div class="li"><div class="date-box"><div class="m">' + BLN[tglObj(b.Tanggal).getMonth()] + '</div><div class="d">' + tglObj(b.Tanggal).getDate() + '</div></div><div><div class="b small">' + esc(b.Topik) + '</div><div class="xs muted">' + esc(b.Jam || '') + ' · ' + String(b.NIS).split(',').length + ' siswa · ' + esc(b.Metode) + '</div></div></div>').join('') + '</div>' : '<div class="empty small">Belum ada jadwal.</div>') + '</div></div></div>';
    }
  };
  Act.eksporGuru = () => {
    const rows = bimbingan().map(s => { const rk = rekap(s.NIS), pen = rk.pen || {}; return { NIS: s.NIS, Nama: s.Nama, Kelas: s.Kelas, DUDI: nmDudi(pen.DUDIID), Periode: rk.periode, Hadir: rk.t.H, Izin: rk.t.I, Sakit: rk.t.S, Alfa: rk.t.A, 'Kehadiran %': rk.persen,
      OBS1: rk.nilai.OBS1 ?? '', OBS2: rk.nilai.OBS2 ?? '', Pembimbing: rk.nilai.PEMBIMBING ?? '', Laporan: rk.nilai.LAPORAN ?? '', Presentasi: rk.nilai.PRESENTASI ?? '', 'Akhir DUDI': rk.nilai.AKHIR ?? '', 'Nilai Akhir': rk.akhir, Predikat: rk.predikat }; });
    eksporXlsx({ 'Siswa Bimbingan': rows }, 'Rekap Bimbingan ' + Sesi.me.nama);
  };
  /** Modal detail siswa (dipakai guru, instruktur, admin) */
  Act.detailSiswa = el => {
    const nis = el.dataset.nis, s = S.ix.siswa[nis] || {}, rk = rekap(nis), pen = rk.pen || {}, j = S.ix.jurnal[nis + '|' + rk.periode];
    modal({ title: s.Nama, icon: 'person', size: 'lg', body: '<div class="row wrap mb">' + av(s.Nama, s.FotoURL, '') + '<div class="grow"><div class="b">' + esc(s.Nama) + ' · ' + esc(nis) + '</div><div class="small muted">' + esc(s.Kelas) + ' · ' + esc(nmDudi(pen.DUDIID)) + ' · ' + esc(pen.PekerjaanSpesifik || '') + '</div></div>' +
      (j ? '<a class="btn sec sm" target="_blank" rel="noopener" href="' + esc(j.Link) + '">' + ic('folder_open') + 'Jurnal</a>' : '') + (s.NoHP ? '<a class="btn ghost sm" target="_blank" rel="noopener" href="' + esc(waLink(s.NoHP)) + '">' + ic('chat') + 'WA Siswa</a>' : '') + (s.NoHPWali ? '<a class="btn ghost sm" target="_blank" rel="noopener" href="' + esc(waLink(s.NoHPWali)) + '">' + ic('family_restroom') + 'WA Wali</a>' : '') + '</div>' +
      '<div class="grid g4 keep2"><div class="card tight"><span class="stat-lbl">Kehadiran</span><div class="stat-val" style="font-size:24px">' + num(rk.persen, 0) + '%</div></div><div class="card tight"><span class="stat-lbl">Alfa</span><div class="stat-val" style="font-size:24px;color:var(--rose-700)">' + rk.t.A + '</div></div><div class="card tight"><span class="stat-lbl">Izin</span><div class="stat-val" style="font-size:24px">' + rk.t.I + '</div></div><div class="card tight"><span class="stat-lbl">Nilai sementara</span><div class="stat-val" style="font-size:24px">' + num(rk.akhir, 0) + '</div></div></div>' +
      '<h4 class="mt mb">Nilai per komponen</h4>' + K.kartuNilai(nis) + '<h4 class="mt mb">Log absensi</h4>' + K.tabelAbsensi(nis),
      foot: '<button class="btn ghost" data-x>Tutup</button><button class="btn" data-cetak>' + ic('print') + 'Cetak Rekap</button>',
      onOpen: (m) => { m.querySelector('[data-cetak]').onclick = () => cetak(lembarRekap(nis), 'Rekap ' + s.Nama); } });
  };

  /* ---------- Daftar siswa ---------- */
  Pages['GURU:siswa'] = {
    render() {
      const sis = bimbingan();
      return head(ic('groups') + ' Siswa Bimbingan', 'Siswa Bimbingan Saya', 'Pantau kehadiran, jurnal, dan status penilaian setiap siswa.', '<button class="btn ghost" data-act="eksporGuru">' + ic('table_view') + 'Ekspor Excel</button>') +
        '<div class="card flush">' + (sis.length ? '<div class="tbl-wrap" style="border:0"><table class="tbl"><thead><tr><th>Siswa</th><th>DU/DI & Pekerjaan</th><th>Kehadiran</th><th>Jurnal</th><th>Status Penilaian</th><th></th></tr></thead><tbody>' + sis.map(barisSiswa).join('') + '</tbody></table></div>' : '<div class="empty">' + ic('search_off') + 'Tidak ada siswa yang cocok.</div>') + '</div>';
    }
  };

  /* ---------- Jadwal bimbingan ---------- */
  Pages['GURU:bimbingan'] = {
    render(param) {
      const semua = S.data.bimbingan.filter(b => b.GuruID === ref()).sort((a, b) => b.Tanggal.localeCompare(a.Tanggal)), sis = bimbingan();
      const filter = param || 'semua', metode = ['Kunjungan DUDI', 'Daring (Google Meet)', 'Lab TKJ Sekolah', 'Konseling Disiplin'];
      const list = semua.filter(b => filter === 'semua' || b.Metode === filter);
      const mendatang = list.filter(b => b.Status === 'Terjadwal'), riwayat = list.filter(b => b.Status !== 'Terjadwal');
      const tercakup = new Set(semua.flatMap(b => String(b.NIS).split(','))).size;
      const kartuAgenda = b => '<div class="card" style="border-left:4px solid ' + (b.Metode === 'Konseling Disiplin' ? 'var(--rose)' : 'var(--teal)') + '"><div class="row wrap between"><div class="row wrap">' + pill(fmtTgl(b.Tanggal) + (b.Jam ? ' · ' + b.Jam : ''), 'ok') + pill(b.Metode, 'info') + '</div>' + pillStatus(b.Status) + '</div>' +
        '<h3 class="mt-s" style="font-size:16px">' + esc(b.Topik) + '</h3><div class="small muted">' + ic('location_on') + ' ' + esc(b.Lokasi || '-') + '</div>' +
        '<div class="info-box mt-s row wrap">' + String(b.NIS).split(',').map(n => av(nmSiswa(n), (S.ix.siswa[n] || {}).FotoURL, 'av-xs')).join('') + '<span class="small">' + String(b.NIS).split(',').map(nmSiswa).map(esc).join(', ') + '</span></div>' +
        (b.Catatan ? '<p class="small mt-s">' + esc(b.Catatan) + '</p>' : '') +
        '<div class="actions mt-s"><button class="btn sm" data-act="selesaiBimb" data-id="' + esc(b.BimbinganID) + '">' + ic('edit_note') + 'Input Catatan / Selesai</button><button class="btn ghost sm" data-act="ubahBimb" data-id="' + esc(b.BimbinganID) + '">' + ic('edit_calendar') + 'Ubah</button><button class="btn ghost sm" data-act="hapusBimb" data-id="' + esc(b.BimbinganID) + '">' + ic('delete') + '</button></div></div>';
      return head(ic('event_note') + ' Panel Supervisi · Jadwal & Log', 'Manajemen & Jadwal Bimbingan Siswa', 'Kelola agenda kunjungan DU/DI, bimbingan daring/luring, dan log sistematika laporan.', '<button class="btn" data-act="ubahBimb">' + ic('add_circle') + 'Buat Sesi Bimbingan</button>') +
        '<div class="grid g3 keep2"><div class="card stat"><span class="stat-lbl">Total sesi bimbingan</span><div class="stat-val">' + semua.length + '<small> sesi</small></div><div class="stat-note">' + semua.filter(b => b.Status === 'Selesai').length + ' selesai · ' + semua.filter(b => b.Status === 'Terjadwal').length + ' mendatang</div></div>' +
        '<div class="card stat"><span class="stat-lbl">Cakupan siswa</span><div class="stat-val">' + tercakup + '<small> / ' + sis.length + '</small></div><div class="bar"><i style="width:' + (sis.length ? tercakup / sis.length * 100 : 0) + '%"></i></div></div>' +
        '<div class="card stat"><span class="stat-lbl">Kunjungan DU/DI</span><div class="stat-val">' + semua.filter(b => b.Metode === 'Kunjungan DUDI').length + '<small> fisik</small></div><div class="stat-note">' + semua.filter(b => /Daring/.test(b.Metode)).length + ' daring</div></div></div>' +
        '<div class="seg mt">' + ['semua'].concat(metode).map(m => '<button class="' + (filter === m ? 'on' : '') + '" data-act="go" data-href="#/bimbingan/' + encodeURIComponent(m) + '">' + esc(m === 'semua' ? 'Semua Sesi' : m) + ' <span class="pill mute">' + (m === 'semua' ? semua.length : semua.filter(b => b.Metode === m).length) + '</span></button>').join('') + '</div>' +
        '<h3 class="mt mb">Agenda Mendatang (' + mendatang.length + ')</h3>' + (mendatang.length ? '<div class="grid g2">' + mendatang.map(kartuAgenda).join('') + '</div>' : '<div class="card empty">' + ic('event_available') + 'Belum ada agenda.</div>') +
        '<div class="card flush mt"><div style="padding:18px 20px"><h3>Log Riwayat Sesi (' + riwayat.length + ')</h3></div>' + (riwayat.length ? '<div class="tbl-wrap" style="border:0"><table class="tbl"><thead><tr><th>Waktu</th><th>Siswa</th><th>Metode</th><th>Topik</th><th>Status</th><th>Catatan</th></tr></thead><tbody>' +
          riwayat.map(b => '<tr><td><b>' + esc(fmtTgl(b.Tanggal)) + '</b></td><td class="small">' + String(b.NIS).split(',').map(nmSiswa).map(esc).join(', ') + '</td><td>' + pill(b.Metode, 'info') + '</td><td>' + esc(b.Topik) + '</td><td>' + pillStatus(b.Status) + '</td><td class="small">' + esc(b.Catatan || '-') + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="empty">Belum ada riwayat.</div>') + '</div>';
    }
  };
  Act.ubahBimb = el => {
    const b = el.dataset.id ? S.data.bimbingan.find(x => x.BimbinganID === el.dataset.id) : null, pilih = b ? String(b.NIS).split(',') : [];
    const daftar = bimbingan().map(s => '<label class="check" style="padding:6px 0"><input type="checkbox" name="NIS" value="' + esc(s.NIS) + '"' + (pilih.indexOf(s.NIS) > -1 ? ' checked' : '') + '> ' + esc(s.Nama) + ' <span class="xs muted">(' + esc(nmDudi((penOf(s.NIS) || {}).DUDIID)) + ')</span></label>').join('');
    formModal({ title: b ? 'Ubah Jadwal Bimbingan' : 'Jadwalkan Bimbingan', icon: 'event', action: 'bimbingan.simpan',
      intro: '<div class="field"><label>Pilih siswa bimbingan <span class="req">*</span></label><div class="info-box" data-multi style="max-height:180px;overflow:auto">' + (daftar || '<span class="muted small">Belum ada siswa.</span>') + '</div></div>',
      fields: [{ name: 'Metode', label: 'Metode', type: 'select', options: ['Kunjungan DUDI', 'Daring (Google Meet)', 'Lab TKJ Sekolah', 'Konseling Disiplin'], value: b ? b.Metode : 'Kunjungan DUDI', kosong: false },
        { name: 'Lokasi', label: 'Lokasi / tautan', value: b ? b.Lokasi : '' }, { name: 'Tanggal', label: 'Tanggal', type: 'date', req: true, value: b ? b.Tanggal : hariIni() }, { name: 'Jam', label: 'Pukul', type: 'time', value: b ? b.Jam : '09:00' },
        { name: 'Topik', label: 'Topik / agenda', req: true, full: true, value: b ? b.Topik : '' }, { name: 'Catatan', label: 'Catatan / instruksi untuk siswa', type: 'textarea', full: true, value: b ? b.Catatan : '' }],
      olah: (d, form) => { const nis = [...form.querySelectorAll('input[name=NIS]:checked')].map(i => i.value); if (!nis.length) { toast('Pilih minimal satu siswa.', 'warn'); return null; } d.NIS = nis; d.BimbinganID = b ? b.BimbinganID : ''; d.Status = b ? b.Status : 'Terjadwal'; return d; } });
  };
  Act.selesaiBimb = el => {
    const b = S.data.bimbingan.find(x => x.BimbinganID === el.dataset.id); if (!b) return;
    formModal({ title: 'Catatan Hasil Bimbingan', icon: 'edit_note', action: 'bimbingan.simpan', ok: 'Simpan & Tandai Selesai',
      fields: [{ name: 'Catatan', label: 'Catatan pembimbing (tampil ke siswa)', type: 'textarea', full: true, req: true, value: b.Catatan, rows: 4 }, { name: 'Status', label: 'Status', type: 'select', options: ['Selesai', 'Terjadwal', 'Batal'], value: 'Selesai', kosong: false }],
      olah: d => Object.assign({}, b, d, { NIS: String(b.NIS).split(',') }) });
  };
  Act.hapusBimb = async el => { if (await konfirmasi('Hapus jadwal bimbingan ini?', { danger: true, ok: 'Hapus' })) simpan(el, 'bimbingan.hapus', { BimbinganID: el.dataset.id }); };

  /* ---------- Penilaian ---------- */
  Pages['GURU:penilaian'] = {
    render(param) {
      const [nisP, jenisP] = String(param || '').split('/'), sis = bimbingan(), uji = diuji().map(p => p.NIS);
      const semuaNis = [...new Set(sis.map(s => s.NIS).concat(uji))];
      const nis = semuaNis.indexOf(nisP) > -1 ? nisP : semuaNis[0];
      if (!nis) return head(ic('grading') + ' Panel Penilaian Resmi', 'Penilaian Siswa') + '<div class="card empty">' + ic('group_off') + 'Belum ada siswa untuk dinilai.</div>';
      const pembimbing = sis.some(s => s.NIS === nis), penguji = uji.indexOf(nis) > -1;
      const jenisBoleh = (pembimbing ? ['PEMBIMBING', 'LAPORAN'] : []).concat(penguji ? ['PRESENTASI'] : []);
      const jenis = jenisBoleh.indexOf(jenisP) > -1 ? jenisP : jenisBoleh[0];
      const s = S.ix.siswa[nis] || {}, pen = penOf(nis) || {}, jl = S.ix.jurnal[nis + '|' + pen.Periode];
      const judul = { PEMBIMBING: 'Penilaian Sikap & Bimbingan Berkala', LAPORAN: 'Penilaian Laporan Akhir PKL (Instrumen 5 Kriteria)', PRESENTASI: 'Penilaian Presentasi / Sidang (maks. 10 slide)' }[jenis];
      const antre = semuaNis.map(n => { const rk = rekap(n), j = jenisBoleh.length; const done = ['PEMBIMBING', 'LAPORAN', 'PRESENTASI'].filter(x => rk.nilai[x] !== undefined && (x !== 'PRESENTASI' || uji.indexOf(n) > -1) && (x === 'PRESENTASI' || sis.some(z => z.NIS === n))).length;
        return '<a class="li" href="#/penilaian/' + n + '" style="' + (n === nis ? 'border-color:var(--teal);background:var(--teal-50)' : '') + '">' + av(nmSiswa(n), (S.ix.siswa[n] || {}).FotoURL, 'av-xs') + '<div class="grow"><div class="b small">' + esc(nmSiswa(n)) + '</div><div class="xs muted">' + (rk.kunci ? 'Ditutup' : done + ' komponen dinilai') + (uji.indexOf(n) > -1 ? ' · penguji' : '') + '</div></div>' + ic(n === nis ? 'edit' : 'chevron_right') + '</a>'; }).join('');
      return head(ic('grading') + ' Panel Penilaian Resmi ' + esc(P('TAHUN_AJARAN')), judul, 'Isi skor 0–100 per indikator; nilai akhir dihitung otomatis terbobot. Dapat diedit selama belum ditutup Admin.') +
        '<div class="card tight mb"><div class="row wrap">' + av(s.Nama, s.FotoURL, '') + '<div class="grow"><div class="row wrap"><b style="font-size:16px">' + esc(s.Nama) + '</b>' + pill('NIS ' + nis, 'info') + pill(s.Kelas || '', 'mute') + '</div><div class="small muted">' + ic('apartment') + ' ' + esc(nmDudi(pen.DUDIID)) + ' · ' + esc(pen.PekerjaanSpesifik || '') + ' · Instruktur: ' + esc(nmIns(pen.InstrukturID)) + '</div></div>' +
        (jl ? '<a class="btn sec sm" target="_blank" rel="noopener" href="' + esc(jl.Link) + '">' + ic('visibility') + 'Buka Jurnal / Naskah</a>' : '') + '</div></div>' +
        '<div class="tabs">' + jenisBoleh.map(j => '<button class="' + (j === jenis ? 'on' : '') + '" data-act="go" data-href="#/penilaian/' + nis + '/' + j + '">' + esc(JENIS[j]) + (rekap(nis).nilai[j] !== undefined ? ' ' + ic('check_circle', 'fill') : '') + '</button>').join('') + '</div>' +
        '<div class="grid" style="grid-template-columns:minmax(0,1fr) 240px">' + K.formNilai(nis, pen.Periode, jenis, true) + '<div><div class="card tight sticky-side"><div class="row between mb"><b class="small">Antrean Siswa</b><span class="xs muted">' + semuaNis.length + ' siswa</span></div><div class="list">' + antre + '</div></div></div></div>';
    }
  };

  /* ---------- Peringatan ---------- */
  Pages['GURU:peringatan'] = {
    render(param) {
      const st = param || 'Belum ditangani', all = S.data.peringatan.filter(p => (penOf(p.NIS, p.Periode) || {}).GuruID === ref());
      const list = all.filter(p => st === 'semua' || p.Status === st).filter(p => cari({ n: nmSiswa(p.NIS) }, S.q));
      return head(ic('notification_important') + ' Supervisi Kedisiplinan', 'Penanganan Peringatan Izin/Alfa', 'Ambang: Alfa = ' + esc(P('AMBANG_ALFA')) + ' hari, Izin = ' + esc(P('AMBANG_IZIN')) + ' hari (dihitung per periode). Catat tindak lanjut Anda di sini.') +
        '<div class="seg mb">' + ['Belum ditangani', 'Sudah ditangani', 'Dicabut', 'semua'].map(x => '<button class="' + (st === x ? 'on' : '') + '" data-act="go" data-href="#/peringatan/' + encodeURIComponent(x) + '">' + esc(x === 'semua' ? 'Semua' : x) + ' <span class="pill mute">' + (x === 'semua' ? all.length : all.filter(p => p.Status === x).length) + '</span></button>').join('') + '</div>' +
        tabelPeringatan(list, true);
    }
  };
  function tabelPeringatan(list, bisaTangani) {
    if (!list.length) return '<div class="card empty">' + ic('verified') + 'Tidak ada peringatan pada filter ini.</div>';
    return '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Siswa</th><th>DU/DI</th><th>Jenis</th><th class="num">Jumlah</th><th>Periode</th><th>Status</th><th>Catatan Penanganan</th>' + (bisaTangani ? '<th></th>' : '') + '</tr></thead><tbody>' +
      list.map(p => '<tr class="' + (p.Status === 'Belum ditangani' ? 'bad-row' : '') + '"><td><div class="who">' + av(nmSiswa(p.NIS), (S.ix.siswa[p.NIS] || {}).FotoURL, 'av-xs') + '<div><div class="n">' + esc(nmSiswa(p.NIS)) + '</div><div class="s">' + esc(p.NIS) + '</div></div></div></td>' +
        '<td class="small">' + esc(nmDudi((penOf(p.NIS, p.Periode) || {}).DUDIID)) + '</td><td>' + pill(p.Jenis === 'ALFA' ? 'Alfa' : 'Izin', p.Jenis === 'ALFA' ? 'bad' : 'warn') + '</td><td class="num"><b>' + esc(p.Jumlah) + '</b></td><td>' + esc(p.Periode) + '</td><td>' + pillStatus(p.Status) + '</td>' +
        '<td class="small">' + esc(p.Catatan || '-') + (p.DitanganiOleh ? '<div class="xs muted">' + esc(p.DitanganiOleh) + ' · ' + esc(fmtWaktu(p.DiperbaruiPada)) + '</div>' : '') + '</td>' +
        (bisaTangani ? '<td class="right">' + (p.Status !== 'Dicabut' ? '<button class="btn sm" data-act="tangani" data-id="' + esc(p.PeringatanID) + '">Tangani</button>' : '') + '</td>' : '') + '</tr>').join('') + '</tbody></table></div>';
  }
  window.tabelPeringatan = tabelPeringatan;
  Act.tangani = el => {
    const p = S.data.peringatan.find(x => x.PeringatanID === el.dataset.id); if (!p) return;
    const rk = rekap(p.NIS, p.Periode);
    formModal({ title: 'Tangani Peringatan · ' + nmSiswa(p.NIS), icon: 'support_agent', action: 'peringatan.tangani',
      intro: '<div class="alert bad mb">' + ic('warning') + '<div><h4>' + (p.Jenis === 'ALFA' ? 'Alfa' : 'Izin') + ' ' + esc(p.Jumlah) + ' hari · Periode ' + esc(p.Periode) + '</h4><p>Total periode ini: Hadir ' + rk.t.H + ', Izin ' + rk.t.I + ', Sakit ' + rk.t.S + ', Alfa ' + rk.t.A + '.</p></div></div>',
      fields: [{ name: 'Catatan', label: 'Catatan penanganan', type: 'textarea', full: true, req: true, rows: 4, value: p.Catatan, ph: 'Contoh: Sudah menelepon orang tua, siswa dipanggil konseling 15 Nov.' },
        { name: 'Status', label: 'Status', type: 'select', full: true, options: ['Sudah ditangani', 'Belum ditangani'], value: 'Sudah ditangani', kosong: false }],
      olah: d => Object.assign(d, { PeringatanID: p.PeringatanID }) });
  };

  /* ---------- Pesan darurat ---------- */
  Pages['GURU:pesan'] = {
    render(param) {
      const list = S.data.pesan.slice().sort((a, b) => b.DibuatPada.localeCompare(a.DibuatPada)), sel = list.find(m => m.PesanID === param) || list[0];
      return head(ic('emergency') + ' Komunikasi DU/DI', 'Pesan Darurat dari Instruktur', 'Pesan kendala siswa dari pembimbing industri. Balasan Anda tampil di akun instruktur.') +
        (list.length ? '<div class="grid" style="grid-template-columns:minmax(240px,340px) 1fr"><div class="card tight"><div class="list">' + list.map(m => '<a class="li" href="#/pesan/' + m.PesanID + '" style="' + (sel && m.PesanID === sel.PesanID ? 'border-color:var(--teal);background:var(--teal-50)' : '') + '">' + (m.Status === 'Baru' ? '<span class="pill solid-bad" style="padding:2px 6px">●</span>' : ic('mark_email_read')) +
          '<div class="grow"><div class="b small ellipsis">' + esc(m.Subjek) + '</div><div class="xs muted">' + esc(nmSiswa(m.NIS)) + ' · ' + esc(fmtTgl(m.DibuatPada)) + '</div></div>' + pillStatus(m.Status) + '</a>').join('') + '</div></div>' +
          '<div class="card">' + (sel ? '<div class="row wrap between"><div><h3>' + esc(sel.Subjek) + '</h3><div class="small muted">Dari ' + esc(nmIns(sel.InstrukturID)) + ' (' + esc(nmDudi((S.ix.ins[sel.InstrukturID] || {}).DUDIID)) + ') · ' + esc(fmtWaktu(sel.DibuatPada)) + '</div></div>' + pillStatus(sel.Status) + '</div>' +
            '<div class="info-box mt"><div class="t">Terkait siswa</div><b>' + esc(nmSiswa(sel.NIS)) + '</b> · NIS ' + esc(sel.NIS) + '</div><p style="white-space:pre-wrap;line-height:1.6">' + esc(sel.Isi) + '</p>' +
            (sel.Balasan ? '<div class="alert">' + ic('reply') + '<div><h4>Balasan Anda · ' + esc(fmtWaktu(sel.DibalasPada)) + '</h4><p>' + esc(sel.Balasan) + '</p></div></div>' : '') +
            '<form id="f-balas" class="mt" data-dirty>' + fld({ name: 'Balasan', label: sel.Balasan ? 'Kirim balasan baru' : 'Balasan', type: 'textarea', rows: 4, ph: 'Tulis tanggapan untuk instruktur…' }) +
            '<div class="actions"><button class="btn" data-act="balasPesan" data-id="' + esc(sel.PesanID) + '">' + ic('send') + 'Kirim Balasan</button>' + (sel.Status === 'Baru' ? '<button class="btn ghost" data-act="bacaPesan" data-id="' + esc(sel.PesanID) + '">Tandai dibaca</button>' : '') +
            ((S.ix.ins[sel.InstrukturID] || {}).NoHP ? '<a class="btn ghost" target="_blank" rel="noopener" href="' + esc(waLink(S.ix.ins[sel.InstrukturID].NoHP)) + '">' + ic('call') + 'Hubungi via WA</a>' : '') + '</div></form>' : '') + '</div></div>'
          : '<div class="card empty">' + ic('mark_email_read') + 'Belum ada pesan darurat.</div>');
    }
  };
  Act.balasPesan = btn => { const v = document.querySelector('#f-balas [name=Balasan]').value.trim(); if (!v) { toast('Tulis balasan terlebih dahulu.', 'warn'); return; } simpan(btn, 'pesan.balas', { PesanID: btn.dataset.id, Balasan: v }); };
  Act.bacaPesan = btn => simpan(btn, 'pesan.balas', { PesanID: btn.dataset.id, Balasan: '' }, { diam: true });

  /* ---------- Persetujuan dokumen (pejabat) ---------- */
  Pages['GURU:dokumen'] = Pages['ADMIN:ttd'] = {
    render() { return head(ic('draw') + ' Dokumen Resmi', 'Persetujuan Dokumen', 'Dokumen yang menunggu tanda tangan Anda sebagai pejabat. Persetujuan memakai akun + PIN 6 digit.') + '<div id="ttd-box"><div class="skel" style="height:140px"></div></div>'; },
    async after() {
      const r = await api('de.dokumenList', {}), box = document.getElementById('ttd-box'); if (!box) return;
      if (!r.success) { box.innerHTML = '<div class="card empty">' + esc(r.message) + '</div>'; return; }
      const pj = r.data.pejabatSaya, rows = r.data.rows.filter(d => d.status === 'MENUNGGU_TTD');
      box.innerHTML = (pj ? '<div class="card tight mb"><div class="row wrap"><span class="ic teal">' + ic('pin') + '</span><div class="grow"><b>' + esc(pj.nama) + '</b><div class="small muted">' + (pj.pinAda ? 'PIN sudah diatur' : 'PIN belum diatur — wajib sebelum menyetujui') + '</div></div><button class="btn sec sm" data-act="aturPin" data-ada="' + (pj.pinAda ? 1 : 0) + '">' + ic('password') + (pj.pinAda ? 'Ganti PIN' : 'Atur PIN') + '</button></div></div>'
        : '<div class="alert warn mb">' + ic('info') + '<div><h4>Anda belum terdaftar sebagai pejabat</h4><p>Admin dapat mendaftarkan akun Anda di Doc Engine → Pejabat.</p></div></div>') +
        (rows.length ? '<div class="list">' + rows.map(d => { const slot = d.penandatangan.find(s => s.pejabatId === (pj || {}).id && s.status !== 'SETUJU');
          return '<div class="card tight"><div class="row wrap"><span class="ic amber">' + ic('pending_actions') + '</span><div class="grow"><div class="b">' + esc(d.judul) + '</div><div class="small muted">Dibuat ' + esc(fmtWaktu(d.dibuat)) + ' oleh ' + esc(d.oleh) + ' · ' + d.penandatangan.map(s => esc(s.label) + ': ' + (s.status === 'SETUJU' ? '✓' : '…')).join(' · ') + '</div></div>' +
            (slot ? '<button class="btn sm" data-act="setujuiDok" data-id="' + esc(d.id) + '" data-slot="' + slot.slot + '" data-kode="' + esc(d.kodeVerifikasi) + '">' + ic('draw') + 'Setujui (' + esc(slot.label) + ')</button>' : pill('Menunggu pejabat lain', 'warn')) + '</div></div>'; }).join('') + '</div>' : '<div class="card empty">' + ic('task') + 'Tidak ada dokumen yang menunggu persetujuan Anda.</div>');
    }
  };
  Act.aturPin = el => formModal({ title: 'Atur PIN Persetujuan', icon: 'pin', action: 'de.aturPin', size: 'sm', reload: false,
    fields: (el.dataset.ada === '1' ? [{ name: 'pinLama', label: 'PIN lama', type: 'password', req: true, full: true, attr: ' inputmode="numeric" maxlength="6"' }] : []).concat([{ name: 'pinBaru', label: 'PIN baru (6 angka)', type: 'password', req: true, full: true, attr: ' inputmode="numeric" maxlength="6" pattern="\\d{6}"' }]),
    sesudah: () => App.render() });
  Act.setujuiDok = async el => {
    const qr = await qrDataUrl((P('APP_URL') || location.href.replace(/#.*$/, '')).replace(/\/$/, '') + '/#/v/' + el.dataset.kode, 6);
    formModal({ title: 'Setujui Dokumen', icon: 'draw', action: 'de.setujui', size: 'sm', reload: false, ok: 'Setujui & Tanda Tangani',
      fields: [{ name: 'pin', label: 'PIN 6 digit', type: 'password', req: true, full: true, attr: ' inputmode="numeric" maxlength="6" autocomplete="one-time-code"' }, { name: 'catatan', label: 'Catatan (opsional)', full: true }],
      olah: d => Object.assign(d, { id: el.dataset.id, slot: el.dataset.slot, qr }), sesudah: () => App.render() });
  };
})();
