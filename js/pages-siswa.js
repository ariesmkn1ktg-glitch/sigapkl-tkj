/* SIGAPKL · Halaman SISWA */
(function () {
  'use strict';
  const nisSaya = () => Sesi.me.ref;
  const saya = () => S.ix.siswa[nisSaya()] || { Nama: Sesi.me.nama, NIS: nisSaya() };
  const waLink = hp => { const h = String(hp || '').replace(/\D/g, '').replace(/^0/, '62'); return h ? 'https://wa.me/' + h : ''; };
  const head = (eyebrow, judul, sub, aksi) => '<div class="page-head"><div><div class="eyebrow">' + eyebrow + '</div><h1 class="page-title">' + judul + '</h1>' + (sub ? '<p class="page-sub">' + sub + '</p>' : '') + '</div>' + (aksi ? '<div class="actions">' + aksi + '</div>' : '') + '</div>';
  window.head = head; window.waLink = waLink;

  function profilPanel() {
    const s = saya(), pen = penOf(s.NIS) || {}, g = S.ix.guru[pen.GuruID] || {}, ins = S.ix.ins[pen.InstrukturID] || {}, d = S.ix.dudi[pen.DUDIID] || {};
    const foto = driveImg(s.FotoURL, 300);
    return '<div class="card profile"><div class="profile-top"></div><div class="profile-av">' + (foto ? '<img src="' + esc(foto) + '" alt="" referrerpolicy="no-referrer" onerror="this.remove()">' : '') + esc(inisial(s.Nama)) + '</div><div class="body">' +
      '<h3>' + esc(s.Nama) + '</h3><div class="small muted">NIS ' + esc(s.NIS) + ' · ' + esc(P('NAMA_SEKOLAH')) + '</div><div class="row mt-s" style="justify-content:center">' + pill(s.Kelas || 'XII TKJ', 'info') + pill(pen.Status || 'Belum ditempatkan', pen.Status ? 'ok' : 'warn', true) + '</div>' +
      '<div class="info-box mt" style="text-align:left"><div class="t">Penempatan & Pembimbing</div><div class="list">' +
      '<div class="row">' + ic('apartment') + '<div><div class="xs muted">Mitra DU/DI</div><div class="b">' + esc(d.Nama || '-') + '</div><div class="xs muted">' + esc(d.Bidang || '') + '</div></div></div>' +
      '<div class="row">' + ic('engineering') + '<div><div class="xs muted">Instruktur Lapangan</div><div class="b">' + esc(ins.Nama || '-') + '</div><div class="xs muted">' + esc(ins.Jabatan || '') + '</div></div></div>' +
      '<div class="row">' + ic('school') + '<div><div class="xs muted">Guru Pembimbing</div><div class="b">' + esc(g.Nama || '-') + '</div>' + (g.NIP ? '<div class="xs muted">NIP. ' + esc(g.NIP) + '</div>' : '') + '</div></div></div></div></div></div>';
  }
  function agendaSaya() {
    const nis = nisSaya(), hari = hariIni(), out = [];
    S.data.bimbingan.filter(b => String(b.NIS).split(',').indexOf(nis) > -1 && b.Status !== 'Batal' && b.Tanggal >= hari).forEach(b => out.push({ tgl: b.Tanggal, jam: b.Jam, judul: b.Topik, jenis: 'Bimbingan', sub: (b.Lokasi || b.Metode) + ' · ' + nmGuru(b.GuruID), p: 'ok' }));
    const pr = S.ix.pres[nis]; if (pr && pr.Tanggal >= hari) out.push({ tgl: pr.Tanggal, jam: pr.Jam, judul: 'Presentasi Laporan Akhir PKL', jenis: 'Ujian Akhir', sub: (pr.Ruang || '') + ' · Penguji: ' + nmGuru(pr.PengujiID), p: 'warn' });
    return out.sort((a, b) => a.tgl.localeCompare(b.tgl));
  }
  const dateBox = t => { const d = tglObj(t); return '<div class="date-box"><div class="m">' + (d ? BLN[d.getMonth()] : '') + '</div><div class="d">' + (d ? d.getDate() : '-') + '</div></div>'; };

  /* ---------- Dashboard ---------- */
  Pages['SISWA:dashboard'] = {
    render() {
      const s = saya(), rk = rekap(s.NIS), pen = rk.pen || {}, aA = +P('AMBANG_ALFA') || 3, aI = +P('AMBANG_IZIN') || 5, ag = agendaSaya(), jur = S.ix.jurnal[s.NIS + '|' + rk.periode];
      const krit = rk.prg.filter(x => x.Jenis === 'ALFA')[0] || rk.prg[0];
      return '<div class="with-panel"><div class="grid">' +
        '<div class="hero"><div class="row between wrap" style="position:relative;z-index:1;gap:16px"><div><div class="row wrap"><h2>Halo, ' + esc(s.Nama.split(' ')[0]) + '! 👋</h2>' + (pen.DUDIID ? '<span class="hero-tag">' + ic('lan', '') + ' Peserta PKL TKJ</span>' : '') + '</div>' +
        '<p class="muted" style="margin:8px 0 0">' + (pen.DUDIID ? 'Selamat beraktivitas di <b>' + esc(nmDudi(pen.DUDIID)) + '</b> (Periode ' + esc(pen.Periode) + ': ' + esc(fmtTgl(pen.TglMulai)) + ' – ' + esc(fmtTgl(pen.TglSelesai)) + '). Patuhi K3 dan perbarui jurnalmu tepat waktu.' : 'Anda belum memiliki penempatan PKL. Hubungi Koordinator PKL.') + '</p></div>' +
        (pen.PekerjaanSpesifik ? '<div class="hero-side">' + ic('settings_ethernet') + '<div><div class="xs muted">Pekerjaan Spesifik</div>' + esc(pen.PekerjaanSpesifik) + '</div></div>' : '') + '</div></div>' +
        (krit ? '<div class="alert bad big"><span class="ic">' + ic('warning', 'fill') + '</span><div class="grow"><h4>PERINGATAN KEHADIRAN ' + pill('Batas tercapai', 'solid-bad') + '</h4><p>' + (krit.Jenis === 'ALFA' ? 'Alfa' : 'Izin') + ' ' + esc(krit.Jumlah) + ' hari telah mencapai batas pada Periode ' + esc(krit.Periode) + '. Catatan diteruskan ke Guru Pembimbing (' + esc(nmGuru(pen.GuruID)) + ') untuk tindak lanjut.</p></div><a class="btn danger sm" href="#/nilai/absensi">Lihat Riwayat ' + ic('arrow_forward') + '</a></div>' : '') +
        '<div class="grid g3">' +
        '<div class="card stat"><div class="stat-top"><span class="stat-lbl">Kehadiran PKL</span><span class="ic teal">' + ic('how_to_reg') + '</span></div><div class="stat-val">' + num(rk.persen, 0) + '<small>%</small></div><div class="stat-note">Hadir ' + rk.t.H + ' dari ' + rk.hari + ' hari kerja tercatat</div><div class="bar"><i style="width:' + rk.persen + '%"></i></div></div>' +
        '<div class="card stat ' + (rk.t.A >= aA ? 'rose' : '') + '"><div class="stat-top"><span class="stat-lbl">Rekap Ketidakhadiran</span><span class="ic rose">' + ic('event_busy') + '</span></div><div class="stat-val">' + rk.t.A + ' <small>Alfa · ' + rk.t.I + ' Izin</small></div><div class="stat-note">Batas: Alfa ' + aA + ' · Izin ' + aI + ' per periode</div>' + (rk.t.A >= aA ? pill('Batas Alfa tercapai', 'bad', true) : rk.t.I >= aI ? pill('Batas Izin tercapai', 'warn', true) : pill('Aman', 'ok', true)) + '</div>' +
        '<div class="card stat"><div class="stat-top"><span class="stat-lbl">Instrumen Nilai</span><span class="ic amber">' + ic('fact_check') + '</span></div><div class="stat-val">' + rk.lengkap + '<small> / 6 terisi</small></div><div class="stat-note">' + (rk.kunci ? 'Nilai sudah final (ditutup Admin)' : 'Penilaian berjalan') + '</div>' + (rk.akhir ? pill('Nilai sementara ' + num(rk.akhir) + ' (' + rk.predikat + ')', 'info') : pill('Belum ada nilai', 'mute')) + '</div></div>' +
        '<div class="card"><div class="card-h"><span class="ic solid">' + ic('event_upcoming') + '</span><div class="grow"><h3>Jadwal Terdekat</h3><div class="sub">Agenda bimbingan dan sidang presentasi</div></div>' + pill(ag.length + ' jadwal', 'info') + '</div>' +
        (ag.length ? '<div class="list">' + ag.slice(0, 4).map(a => '<div class="li">' + dateBox(a.tgl) + '<div class="grow"><div class="row wrap"><b>' + esc(a.judul) + '</b>' + pill(a.jenis, a.p) + '</div><div class="small muted mt-s">' + ic('schedule') + ' ' + esc(fmtTglL(a.tgl)) + (a.jam ? ' · ' + esc(a.jam) + ' WIB' : '') + '</div><div class="small muted">' + esc(a.sub) + '</div></div></div>').join('') + '</div>' : '<div class="empty">' + ic('event_available') + 'Belum ada jadwal mendatang.</div>') + '</div>' +
        '<div class="card"><div class="card-h"><span class="ic indigo">' + ic('bar_chart') + '</span><div class="grow"><h3>Tren Kehadiran per Minggu</h3><div class="sub">Periode ' + esc(rk.periode) + '</div></div></div>' + K.grafikMingguan(s.NIS) + '</div>' +
        '</div><div class="grid">' + profilPanel() +
        '<div class="card"><div class="card-h">' + ic('checklist') + '<h3 class="grow">Agenda Berikutnya</h3><span class="xs b muted">TUGAS SISWA</span></div><div class="list">' +
        '<a class="li" href="#/jurnal">' + ic(jur ? 'check_circle' : 'radio_button_unchecked', jur ? 'fill' : '') + '<div><div class="b small">' + (jur ? 'Folder jurnal tersambung' : 'Tempel link folder jurnal PKL') + '</div><div class="xs muted">' + (jur ? 'Diperbarui ' + esc(fmtWaktu(jur.DiperbaruiPada)) : 'Wajib agar pembimbing dapat memantau') + '</div></div></a>' +
        '<a class="li" href="#/jurnal">' + ic(s.FotoURL ? 'check_circle' : 'radio_button_unchecked', s.FotoURL ? 'fill' : '') + '<div><div class="b small">' + (s.FotoURL ? 'Foto identitas tersedia' : 'Unggah link foto identitas') + '</div><div class="xs muted">Dipakai untuk Kartu PKL</div></div></a>' +
        '<a class="li" href="#/kartu">' + ic('badge') + '<div><div class="b small">Cetak Kartu PKL Mandiri (PDF)</div><div class="xs muted">Bawa saat presensi di DUDI</div></div></a></div></div>' +
        (pen.GuruID && (S.ix.guru[pen.GuruID] || {}).NoHP ? '<div class="card tight"><div class="row"><span class="ic rose">' + ic('sos') + '</span><div class="grow"><div class="b small">Butuh bantuan mendesak?</div><div class="xs muted">Hubungi Guru Pembimbing</div></div><a class="btn danger-o xs" target="_blank" rel="noopener" href="' + esc(waLink(S.ix.guru[pen.GuruID].NoHP)) + '">WhatsApp</a></div></div>' : '') +
        '</div></div>';
    }
  };

  /* ---------- Penempatan & Jadwal ---------- */
  Pages['SISWA:penempatan'] = {
    render(param) {
      const nis = nisSaya(), daftar = S.ix.pen[nis] || [], p = param || (penOf(nis) || {}).Periode || '1', pen = penOf(nis, p);
      const tabs = '<div class="seg mb">' + ['1', '2'].map(x => { const ada = penOf(nis, x); return '<button class="' + (String(p) === x ? 'on' : '') + '" data-act="go" data-href="#/penempatan/' + x + '"' + (ada ? '' : ' disabled') + '>' + ic(ada ? 'radio_button_checked' : 'lock') + ' Periode ' + x + (ada ? ': ' + esc(fmtTgl(ada.TglMulai)) + ' – ' + esc(fmtTgl(ada.TglSelesai)) : ' (tidak ada)') + '</button>'; }).join('') + '</div>';
      if (!pen) return head(ic('hub') + ' Modul Penempatan', 'Penempatan DUDI & Jadwal') + tabs + '<div class="card empty">' + ic('apartment') + 'Belum ada penempatan untuk periode ini.</div>';
      const d = S.ix.dudi[pen.DUDIID] || {}, g = S.ix.guru[pen.GuruID] || {}, ins = S.ix.ins[pen.InstrukturID] || {};
      const total = Math.max(1, Math.round((tglObj(pen.TglSelesai) - tglObj(pen.TglMulai)) / 864e5)), jalan = Math.max(0, Math.min(total, Math.round((new Date() - tglObj(pen.TglMulai)) / 864e5))), persen = Math.round(jalan / total * 100);
      const bimb = S.data.bimbingan.filter(b => String(b.NIS).split(',').indexOf(nis) > -1).sort((a, b) => a.Tanggal.localeCompare(b.Tanggal));
      const pr = S.ix.pres[nis];
      const hari = pr ? Math.ceil((tglObj(pr.Tanggal) - new Date()) / 864e5) : null;
      return head(ic('hub') + ' Modul Penempatan & Evaluasi', 'Penempatan DUDI & Jadwal Aktivitas', 'Informasi resmi mitra DUDI, periode magang, jadwal bimbingan, dan sidang presentasi akhir.', '<button class="btn ghost" data-act="cetakHalaman">' + ic('print') + 'Cetak</button>') + tabs +
        '<div class="card"><div class="row wrap between"><div class="row"><span class="ic solid" style="width:56px;height:56px">' + ic('dns', 'fill') + '</span><div><h2 style="font-size:20px">' + esc(d.Nama || '-') + '</h2><div class="small muted">' + esc(d.Bidang || '') + (d.Kota ? ' · ' + esc(d.Kota) : '') + '</div></div></div>' +
        '<div class="actions">' + (d.LinkPeta ? '<a class="btn sec sm" target="_blank" rel="noopener" href="' + esc(d.LinkPeta) + '">' + ic('pin_drop') + 'Buka Peta</a>' : '') + pill(pen.Status || 'Aktif', 'ok', true) + '</div></div>' +
        '<div class="grid g3 mt"><div class="info-box"><div class="t">' + ic('location_on') + 'Alamat operasional</div><div class="b">' + esc(d.Alamat || '-') + '</div></div>' +
        '<div class="info-box"><div class="t">' + ic('code') + 'Pekerjaan spesifik</div><div class="b">' + esc(pen.PekerjaanSpesifik || '-') + '</div></div>' +
        '<div class="info-box"><div class="t">' + ic('date_range') + 'Masa magang terlaksana</div><div class="row between"><b>' + jalan + ' / ' + total + ' hari</b><span class="small muted">' + persen + '%</span></div><div class="bar mt-s"><i style="width:' + persen + '%"></i></div><div class="xs muted mt-s">' + esc(fmtTgl(pen.TglMulai)) + ' – ' + esc(fmtTgl(pen.TglSelesai)) + '</div></div>' +
        '<div class="info-box"><div class="t">' + ic('engineering') + 'Instruktur lapangan</div><div class="b">' + esc(ins.Nama || '-') + '</div><div class="small muted">' + esc(ins.Jabatan || '') + '</div>' + (ins.NoHP ? '<a class="btn sec xs mt-s" target="_blank" rel="noopener" href="' + esc(waLink(ins.NoHP)) + '">' + ic('chat') + ' WhatsApp</a>' : '') + '</div>' +
        '<div class="info-box"><div class="t">' + ic('school') + 'Guru pembimbing sekolah</div><div class="b">' + esc(g.Nama || '-') + '</div><div class="small muted">' + (g.NIP ? 'NIP. ' + esc(g.NIP) : '') + '</div>' + (g.NoHP ? '<a class="btn sec xs mt-s" target="_blank" rel="noopener" href="' + esc(waLink(g.NoHP)) + '">' + ic('call') + ' Hubungi</a>' : '') + '</div>' +
        '<div class="info-box"><div class="t">' + ic('call') + 'Kontak DUDI</div><div class="b">' + esc(d.Pimpinan || '-') + '</div><div class="small muted">' + esc(d.Telepon || '') + ' ' + esc(d.Email || '') + '</div></div></div></div>' +
        '<div class="card mt"><div class="card-h"><h3 class="grow">Jadwal Bimbingan & Supervisi Guru</h3>' + pill(bimb.length + ' sesi', 'info') + '</div>' +
        (bimb.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>No</th><th>Tanggal & Waktu</th><th>Topik</th><th>Media / Tempat</th><th>Status</th><th>Catatan Pembimbing</th></tr></thead><tbody>' +
          bimb.map((b, i) => '<tr><td>' + (i + 1) + '</td><td><b>' + esc(fmtTgl(b.Tanggal)) + '</b><div class="xs muted">' + esc(b.Jam || '') + '</div></td><td>' + esc(b.Topik) + '</td><td>' + pill(b.Metode || '-', 'info') + '<div class="xs muted">' + esc(b.Lokasi || '') + '</div></td><td>' + pillStatus(b.Status) + '</td><td class="small">' + esc(b.Catatan || '-') + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="empty">' + ic('event_note') + 'Belum ada jadwal bimbingan dari Guru Pembimbing.</div>') + '</div>' +
        '<div class="card mt" style="border-top:4px solid var(--amber)"><div class="row wrap between"><div class="grow">' + pill('Jadwal Resmi Koordinator PKL', 'warn') + '<h3 class="mt-s" style="font-size:18px">Sidang Ujian & Presentasi Laporan PKL</h3><p class="small muted">Uji pertanggungjawaban kompetensi industri di hadapan penguji sekolah.</p>' +
        (pr ? '<div class="grid g3 mt-s"><div class="info-box"><div class="t">Waktu sidang</div><b>' + esc(fmtTglL(pr.Tanggal)) + '</b><div class="small muted">' + esc(pr.Jam || '') + ' WIB</div></div><div class="info-box"><div class="t">Ruang</div><b>' + esc(pr.Ruang || '-') + '</b></div><div class="info-box"><div class="t">Penguji</div><b>' + esc(nmGuru(pr.PengujiID)) + '</b></div></div>' : '<div class="empty">' + ic('co_present') + 'Jadwal presentasi belum ditetapkan Admin.</div>') + '</div>' +
        (pr && hari !== null ? '<div class="card tight center" style="min-width:180px">' + donut({ segments: [{ label: 'Sisa hari', value: Math.max(hari, 0), color: Tema.c() }], total: 60, center: Math.max(hari, 0), sub: 'HARI LAGI', size: 120 }).replace('<div class="legend-v">', '<div class="legend-v hidden">') + '<div class="small b">Siapkan slide & laporan</div></div>' : '') + '</div>' +
        '<div class="alert warn mt">' + ic('task_alt') + '<div><h4>Ketentuan Wajib Presentasi</h4><p>1. Maksimal <b>10 slide</b> presentasi (fokus temuan industri & unjuk kerja). 2. Membawa laporan cetak yang telah disetujui pembimbing. 3. Berseragam praktik lengkap dengan Kartu PKL aktif.</p></div></div></div>';
    }
  };
  Act.cetakHalaman = () => window.print();

  /* ---------- Jurnal & Foto ---------- */
  Pages['SISWA:jurnal'] = {
    render() {
      const s = saya(), p = (penOf(s.NIS) || {}).Periode || periodeAktif(), j = S.ix.jurnal[s.NIS + '|' + p], foto = driveImg(s.FotoURL, 400);
      return head(ic('folder_shared') + ' Modul Siswa · Dokumentasi & Portofolio', 'Jurnal Kegiatan & Foto Profil PKL', 'Kelola tautan folder jurnal Google Drive dan perbarui foto identitas resmi untuk pencetakan Kartu PKL.',
        '<div class="hero-side">' + ic(j ? 'cloud_done' : 'cloud_off') + '<div><div class="xs muted">Status repositori</div>' + (j ? 'Tersambung' : 'Belum ada link') + '</div></div>') +
        '<div class="grid g2"><div class="card"><div class="card-h"><span class="ic teal">' + ic('folder_shared') + '</span><div class="grow"><h3>Link Folder Jurnal / Catatan PKL</h3><div class="sub">Log aktivitas, jobsheet, dan foto kegiatan teknis di DUDI (Periode ' + esc(p) + ')</div></div>' + (j ? pill('Tersambung', 'ok') : '') + '</div>' +
        '<form id="f-jurnal" data-dirty>' + fld({ name: 'Link', label: 'Tautan folder Google Drive', value: j ? j.Link : '', ph: 'https://drive.google.com/drive/folders/…', req: true, help: 'Format: https://drive.google.com/drive/folders/…' }) +
        '<div class="alert">' + ic('info') + '<div><h4>Petunjuk izin akses Google Drive</h4><p>Atur berbagi folder ke <b>"Siapa saja yang memiliki link dapat melihat"</b> agar Guru Pembimbing dan Instruktur dapat membuka jurnal tanpa meminta izin.</p></div></div>' +
        (j ? '<p class="xs muted mt">' + ic('history') + ' Terakhir diperbarui: ' + esc(fmtWaktu(j.DiperbaruiPada)) + '</p>' : '') +
        '<div class="actions mt"><button class="btn" data-act="simpanJurnal" data-periode="' + esc(p) + '">' + ic('save') + 'Simpan Tautan</button>' + (j ? '<a class="btn ghost" target="_blank" rel="noopener" href="' + esc(j.Link) + '">Buka Folder ' + ic('open_in_new') + '</a>' : '') + '</div></form></div>' +
        '<div class="card"><div class="card-h"><span class="ic indigo">' + ic('badge') + '</span><div class="grow"><h3>Foto Identitas Resmi</h3><div class="sub">Dipakai pada Kartu PKL dan dokumen resmi</div></div></div>' +
        '<div class="row" style="align-items:flex-start;gap:16px"><div style="width:140px;aspect-ratio:3/4;border-radius:14px;overflow:hidden;background:var(--teal-100);display:grid;place-items:center;font-size:38px;font-weight:800;color:var(--teal-700);flex:none">' + (foto ? '<img src="' + esc(foto) + '" style="width:100%;height:100%;object-fit:cover" alt="Foto" referrerpolicy="no-referrer" onerror="this.remove()">' : '') + esc(inisial(s.Nama)) + '</div>' +
        '<div class="small"><b>Ketentuan foto:</b><ul style="padding-left:18px;margin:6px 0;color:var(--text-2)"><li>Seragam praktik TKJ / OSIS lengkap</li><li>Latar polos (merah/biru)</li><li>Wajah menghadap lurus ke depan</li><li>Rasio pasfoto 3:4, terang & fokus</li></ul></div></div>' +
        '<form id="f-foto" class="mt" data-dirty>' + fld({ name: 'FotoURL', label: 'Tautan file foto Google Drive', value: s.FotoURL, ph: 'https://drive.google.com/file/d/…', req: true, help: 'Pastikan file dibagikan "Siapa saja yang memiliki link".' }) +
        '<div class="actions"><button class="btn" data-act="simpanFoto">' + ic('upload') + 'Simpan Foto</button><a class="btn ghost" href="#/kartu">' + ic('visibility') + 'Pratinjau Kartu PKL</a></div></form></div></div>';
    }
  };
  Act.simpanJurnal = btn => { const f = document.getElementById('f-jurnal'); simpan(btn, 'jurnal.simpan', { Periode: btn.dataset.periode, Link: f.Link.value.trim() }); };
  Act.simpanFoto = btn => { const f = document.getElementById('f-foto'); simpan(btn, 'foto.simpan', { FotoURL: f.FotoURL.value.trim() }); };

  /* ---------- Nilai & Kehadiran ---------- */
  Pages['SISWA:nilai'] = {
    render(param) {
      const s = saya(), tab = param === 'absensi' ? 'absensi' : 'nilai', rk = rekap(s.NIS), aA = +P('AMBANG_ALFA') || 3, aI = +P('AMBANG_IZIN') || 5;
      const t = '<div class="seg mb"><button class="' + (tab === 'nilai' ? 'on' : '') + '" data-act="go" data-href="#/nilai">' + ic('workspace_premium') + 'Instrumen Penilaian</button><button class="' + (tab === 'absensi' ? 'on' : '') + '" data-act="go" data-href="#/nilai/absensi">' + ic('fact_check') + 'Absensi & Peringatan ' + (rk.prg.length ? pill('Kritis', 'solid-bad') : '') + '</button></div>';
      let isi;
      if (tab === 'nilai') {
        isi = '<div class="alert ' + (rk.kunci ? '' : 'warn') + '">' + ic(rk.kunci ? 'lock' : 'lock_open') + '<div><h4>Status sesi penilaian: ' + (rk.kunci ? 'FINAL (ditutup Admin)' : 'Terbuka untuk evaluator') + '</h4><p>' + (rk.kunci ? 'Nilai tidak dapat diubah lagi.' : 'Nilai dapat berubah sampai Admin menutup sesi penilaian.') + '</p></div></div>' +
          '<div class="grid mt" style="grid-template-columns:minmax(220px,300px) 1fr"><div class="card center"><div class="row between"><span class="stat-lbl">Rekapitulasi Kumulatif</span>' + pill('Grade ' + rk.predikat, 'ok') + '</div>' +
          '<div class="big-score mt" style="font-size:56px">' + num(rk.akhir, 0) + '</div><div class="muted b">/ 100 · ' + esc(predikatTeks[rk.predikat]) + '</div>' +
          '<div class="mt">' + donut({ segments: [{ label: 'Komponen terisi', value: rk.lengkap, color: Tema.c() }, { label: 'Belum', value: 6 - rk.lengkap, color: Tema.c('canvas-2') }], total: 6, center: rk.lengkap + '/6', sub: 'komponen', size: 120 }) + '</div></div>' +
          K.kartuNilai(s.NIS) + '</div>';
      } else {
        isi = (rk.prg.length ? '<div class="alert bad big"><span class="ic">' + ic('crisis_alert', 'fill') + '</span><div class="grow"><h4>PERINGATAN TINGKAT TINGGI: AMBANG BATAS TERCAPAI</h4><p>' + rk.prg.map(x => (x.Jenis === 'ALFA' ? 'Alfa ' : 'Izin ') + x.Jumlah + ' hari').join(' · ') + '. Peringatan otomatis telah dikirim ke Guru Pembimbing.</p></div></div>' : '') +
          '<div class="grid g4 mt keep2"><div class="card stat"><span class="stat-lbl">Kehadiran total</span><div class="stat-val">' + num(rk.persen, 0) + '<small>%</small></div><div class="bar"><i style="width:' + rk.persen + '%"></i></div><div class="stat-note">' + rk.t.H + ' dari ' + rk.hari + ' hari</div></div>' +
          '<div class="card stat rose"><span class="stat-lbl">Alfa (tanpa ket.)</span><div class="stat-val">' + rk.t.A + '<small> / ' + aA + '</small></div><div class="bar rose"><i style="width:' + Math.min(100, rk.t.A / aA * 100) + '%"></i></div></div>' +
          '<div class="card stat"><span class="stat-lbl">Izin resmi</span><div class="stat-val">' + rk.t.I + '<small> / ' + aI + '</small></div><div class="bar amber"><i style="width:' + Math.min(100, rk.t.I / aI * 100) + '%"></i></div></div>' +
          '<div class="card stat"><span class="stat-lbl">Sakit</span><div class="stat-val">' + rk.t.S + '<small> hari</small></div></div></div>' +
          '<div class="card mt"><div class="card-h"><h3 class="grow">Tren Persentase Kehadiran per Minggu</h3></div>' + K.grafikMingguan(s.NIS) + '</div>' +
          '<div class="card mt"><div class="card-h"><h3 class="grow">Log Absensi Mingguan</h3>' + pill('Diisi Instruktur DUDI', 'ok') + '</div>' + K.tabelAbsensi(s.NIS) + '</div>';
      }
      return head(ic('workspace_premium') + ' Modul Siswa · Rekapitulasi', 'Nilai Resmi & Rekap Kehadiran', 'Transparansi penilaian resmi PKL dan pemantauan absensi mingguan per periode.', '<button class="btn" data-act="cetakRekapSaya">' + ic('download') + 'Unduh Rekap (PDF)</button>') + t + isi;
    }
  };
  Act.cetakRekapSaya = () => cetak(lembarRekap(Sesi.me.ref), 'Rekap PKL ' + nmSiswa(Sesi.me.ref));
  /** Lembar rekap nilai & kehadiran (dipakai siswa, guru, admin) */
  function lembarRekap(nis) {
    const s = S.ix.siswa[nis] || {}, list = (S.ix.pen[nis] || []);
    return '<div class="print-sheet"><div class="row" style="border-bottom:3px solid var(--teal);padding-bottom:10px;margin-bottom:14px">' + (P('LOGO_URL') ? '<img src="' + esc(driveImg(P('LOGO_URL'), 120)) + '" style="width:56px;height:56px;object-fit:contain" referrerpolicy="no-referrer">' : '') +
      '<div><div class="b" style="font-size:18px">' + esc(P('NAMA_SEKOLAH')) + '</div><div class="small">' + esc(P('KOMPETENSI')) + ' · Tahun Ajaran ' + esc(P('TAHUN_AJARAN')) + '</div></div></div>' +
      '<h2 style="text-align:center;font-size:18px">LEMBAR REKAP NILAI & KEHADIRAN PKL</h2><dl class="kv mt"><dt>Nama</dt><dd>' + esc(s.Nama) + '</dd><dt>NIS / Kelas</dt><dd>' + esc(nis) + ' / ' + esc(s.Kelas) + '</dd></dl>' +
      list.map(p => { const rk = rekap(nis, p.Periode); return '<h3 class="mt" style="font-size:15px">Periode ' + esc(p.Periode) + ' · ' + esc(nmDudi(p.DUDIID)) + '</h3><p class="small">' + esc(fmtTglL(p.TglMulai)) + ' – ' + esc(fmtTglL(p.TglSelesai)) + ' · Pembimbing: ' + esc(nmGuru(p.GuruID)) + ' · Instruktur: ' + esc(nmIns(p.InstrukturID)) + '</p>' +
        '<table class="tbl" style="min-width:0"><thead><tr><th>Komponen</th><th class="num">Bobot</th><th class="num">Nilai</th><th>Predikat</th></tr></thead><tbody>' + Object.keys(JENIS).map(j => '<tr><td>' + JENIS[j] + '</td><td class="num">' + (bobot()[j] || 0) + '%</td><td class="num">' + num(rk.nilai[j]) + '</td><td>' + (rk.nilai[j] !== undefined ? predikat(rk.nilai[j]) : '-') + '</td></tr>').join('') +
        '<tr><td><b>NILAI AKHIR</b></td><td></td><td class="num"><b>' + num(rk.akhir) + '</b></td><td><b>' + rk.predikat + ' (' + predikatTeks[rk.predikat] + ')</b></td></tr></tbody></table>' +
        '<p class="small">Kehadiran: Hadir ' + rk.t.H + ' · Izin ' + rk.t.I + ' · Sakit ' + rk.t.S + ' · Alfa ' + rk.t.A + ' (' + num(rk.persen) + '%) · Status nilai: ' + (rk.kunci ? 'FINAL' : 'sementara') + '</p>'; }).join('') +
      '<div class="row between mt" style="margin-top:40px"><div class="small center">Guru Pembimbing<br><br><br><br>(..............................)</div><div class="small center">' + esc(P('NAMA_SEKOLAH')) + ', ' + esc(fmtTglL(hariIni())) + '<br>Koordinator PKL<br><br><br><b>' + esc(P('KOORDINATOR_NAMA') || '(..............................)') + '</b>' + (P('KOORDINATOR_NIP') ? '<br>NIP. ' + esc(P('KOORDINATOR_NIP')) : '') + '</div></div></div>';
  }
  window.lembarRekap = lembarRekap;

  /* ---------- Kartu PKL ---------- */
  Pages['SISWA:kartu'] = {
    render() {
      const s = saya(), pen = penOf(s.NIS);
      return head(ic('badge') + ' Modul Siswa · Identitas Resmi PKL', 'Cetak Kartu Tanda Peserta PKL', 'Kartu identitas resmi PKL Tahun Ajaran ' + esc(P('TAHUN_AJARAN')) + '. Digunakan saat presensi di DUDI, supervisi guru, dan verifikasi ujian.',
        '<button class="btn sec" data-act="cetakKartu" data-nis="' + esc(s.NIS) + '">' + ic('print') + 'Cetak Langsung</button><button class="btn" data-act="cetakKartu" data-nis="' + esc(s.NIS) + '">' + ic('download') + 'Unduh PDF</button>') +
        (!pen ? '<div class="alert warn">' + ic('info') + '<div><h4>Belum ada penempatan</h4><p>Kartu akan lengkap setelah Admin menetapkan penempatan PKL Anda.</p></div></div>' : '') +
        (!s.FotoURL ? '<div class="alert warn mt-s">' + ic('photo_camera') + '<div><h4>Foto belum diisi</h4><p>Tambahkan link foto di menu <a href="#/jurnal">Jurnal & Foto</a> agar kartu tampil lengkap.</p></div></div>' : '') +
        '<div class="with-panel mt"><div class="card"><div class="row between mb"><h3>Pratinjau Cetak (85,6 × 54 mm)</h3>' + pill('Landscape', 'info') + '</div><div style="display:flex;justify-content:center;padding:10px">' + K.kartu(s.NIS) + '</div></div>' +
        '<div class="grid"><div class="card"><div class="card-h">' + ic('tune') + '<h3>Petunjuk Cetak Mandiri</h3></div><ul class="small muted" style="padding-left:18px;margin:0;line-height:1.8"><li>Tekan <b>Unduh PDF</b>, lalu pilih <b>Simpan sebagai PDF</b> pada dialog cetak.</li><li>Kertas: brief card / art paper 230–260 gsm.</li><li>Skala 100% (jangan "sesuaikan halaman").</li><li>Laminasi doff agar tahan lama.</li></ul></div>' +
        '<div class="card"><div class="card-h">' + ic('qr_code_2') + '<h3>Kode QR Kartu</h3></div><p class="small muted" style="margin:0">QR memuat kode kartu <b class="mono">SIGAPKL-' + esc(s.NIS) + '</b> untuk identifikasi cepat oleh pembimbing industri.</p></div></div></div>';
    }
  };

  /* ---------- Dokumen saya ---------- */
  Pages['SISWA:dokumen'] = {
    render() { return head(ic('description') + ' Dokumen', 'Dokumen Saya', 'Sertifikat, surat keterangan, dan lembar nilai resmi yang telah diterbitkan sekolah.') + '<div class="card" id="dok-saya"><div class="skel" style="height:120px"></div></div>'; },
    async after() {
      const r = await api('de.dokumenList', {}), box = document.getElementById('dok-saya'); if (!box) return;
      if (!r.success) { box.innerHTML = '<div class="empty">' + esc(r.message) + '</div>'; return; }
      box.innerHTML = r.data.rows.length ? '<div class="list">' + r.data.rows.map(d => '<div class="li"><span class="ic teal">' + ic('picture_as_pdf') + '</span><div class="grow"><div class="b">' + esc(d.judul) + '</div><div class="small muted">' + esc(d.nomor) + ' · ' + esc(fmtWaktu(d.terbit)) + '</div></div><button class="btn sm" data-act="unduhDok" data-id="' + esc(d.id) + '">' + ic('download') + 'Unduh</button></div>').join('') + '</div>' : '<div class="empty">' + ic('folder_open') + 'Belum ada dokumen terbit untuk Anda.</div>';
    }
  };
  Act.unduhDok = async (btn) => {
    await busy(btn, async () => {
      const r = await api('de.unduh', { id: btn.dataset.id, format: btn.dataset.format || 'pdf' });
      if (!r.success) { toast(r.message, 'bad'); return; }
      if (r.data.url) { window.open(r.data.url, '_blank', 'noopener'); return; }
      const a = document.createElement('a'); a.href = 'data:' + r.data.mime + ';base64,' + r.data.base64; a.download = r.data.nama; a.click();
    });
  };
})();
