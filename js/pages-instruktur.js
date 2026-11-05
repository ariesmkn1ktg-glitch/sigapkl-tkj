/* SIGAPKL · Halaman INSTRUKTUR LAPANGAN (DUDI) */
(function () {
  'use strict';
  const ins = () => S.ix.ins[Sesi.me.ref] || {};
  const siswaSaya = (periode) => S.data.siswa.filter(s => penOf(s.NIS, periode || periodeAktif())).filter(s => cari({ n: s.Nama, i: s.NIS }, S.q));
  const senin = s => { const d = tglObj(s) || new Date(); const k = (d.getDay() + 6) % 7; d.setDate(d.getDate() - k); return isoTgl(d); };

  /* ---------- Dashboard ---------- */
  Pages['INSTRUKTUR:dashboard'] = {
    render() {
      const sis = siswaSaya(), d = S.ix.dudi[ins().DUDIID] || {}, aA = +P('AMBANG_ALFA') || 3;
      let tH = 0, tHari = 0; sis.forEach(s => { const rk = rekap(s.NIS); tH += rk.t.H; tHari += rk.hari; });
      const rata = tHari ? Math.round(tH / tHari * 1000) / 10 : 0, kritis = sis.filter(s => rekap(s.NIS).t.A >= aA);
      const minggu = senin(hariIni()), sudah = sis.filter(s => (S.ix.abs[s.NIS] || []).some(a => a.TglMulai === minggu)).length;
      const nObs = sis.filter(s => { const r = rekap(s.NIS); return r.nilai.OBS1 !== undefined && r.nilai.OBS2 !== undefined && r.nilai.AKHIR !== undefined; }).length;
      return (kritis.length ? '<div class="alert bad mb">' + ic('notifications_active', 'fill') + '<div class="grow"><h4>Peringatan Ambang Batas Disiplin ' + pill('Kritis · ' + aA + ' Alfa', 'solid-bad') + '</h4><p>' + kritis.map(s => '<b>' + esc(s.Nama) + '</b>').join(', ') + ' telah mencapai batas Alfa. Peringatan otomatis telah dikirim ke Guru Pembimbing.</p></div><a class="btn danger-o sm" href="#/pesan">' + ic('emergency') + 'Hubungi Guru</a></div>' : '') +
        head('<span class="pill ok dot">Portal Instruktur DU/DI</span>', 'Selamat datang, ' + esc(ins().Nama || Sesi.me.nama), esc(d.Nama || '') + (d.Alamat ? ' · ' + esc(d.Alamat) : ''), '<a class="btn" href="#/absensi">' + ic('fact_check') + 'Isi Presensi Minggu Ini</a>') +
        '<div class="grid g4 keep2"><div class="card stat"><div class="stat-top"><span class="stat-lbl">Siswa dibimbing</span><span class="ic teal">' + ic('group') + '</span></div><div class="stat-val">' + sis.length + '<small> praktikan</small></div><div class="stat-note">' + esc(d.Bidang || '') + '</div></div>' +
        '<div class="card stat"><div class="stat-top"><span class="stat-lbl">Rata-rata disiplin</span><span class="ic teal">' + ic('verified') + '</span></div><div class="stat-val">' + num(rata, 0) + '<small>%</small></div><div class="bar"><i style="width:' + rata + '%"></i></div></div>' +
        '<div class="card stat rose"><div class="stat-top"><span class="stat-lbl">Ambang kritis Alfa</span><span class="ic rose">' + ic('warning') + '</span></div><div class="stat-val">' + kritis.length + '<small> siswa</small></div><div class="stat-note">' + (kritis.map(s => esc(s.Nama.split(' ')[0])).join(', ') || 'Tidak ada') + '</div></div>' +
        '<div class="card stat"><div class="stat-top"><span class="stat-lbl">Presensi minggu ini</span><span class="ic amber">' + ic('event_available') + '</span></div><div class="stat-val">' + sudah + '<small> / ' + sis.length + '</small></div><div class="stat-note">Minggu ' + esc(fmtTgl(minggu)) + '</div></div></div>' +
        '<div class="card flush mt"><div class="row between wrap" style="padding:18px 20px"><h3>Siswa Praktikan di ' + esc(d.Nama || 'DU/DI Anda') + '</h3>' + pill(nObs + '/' + sis.length + ' penilaian lengkap', nObs === sis.length && sis.length ? 'ok' : 'warn') + '</div>' +
        (sis.length ? '<div class="tbl-wrap" style="border:0"><table class="tbl"><thead><tr><th>Siswa</th><th>Pekerjaan Spesifik</th><th>Kehadiran</th><th>Obs 1</th><th>Obs 2</th><th>Akhir</th><th></th></tr></thead><tbody>' + sis.map(s => {
          const rk = rekap(s.NIS), pen = rk.pen || {}, cel = j => rk.nilai[j] !== undefined ? pill(num(rk.nilai[j]), rk.nilai[j + '_draf'] ? 'warn' : 'ok') : pill('—', 'mute');
          return '<tr class="' + (rk.t.A >= aA ? 'bad-row' : '') + '"><td><div class="who">' + av(s.Nama, s.FotoURL) + '<div><div class="n">' + esc(s.Nama) + '</div><div class="s">NIS ' + esc(s.NIS) + ' · Guru: ' + esc(nmGuru(pen.GuruID)) + '</div></div></div></td><td class="small">' + esc(pen.PekerjaanSpesifik || '-') + '</td>' +
            '<td><b>' + num(rk.persen, 0) + '%</b> <span class="cnt"><span class="a">' + rk.t.A + 'A</span><span class="i">' + rk.t.I + 'I</span></span></td><td>' + cel('OBS1') + '</td><td>' + cel('OBS2') + '</td><td>' + cel('AKHIR') + '</td>' +
            '<td class="right"><a class="btn sec xs" href="#/penilaian/' + s.NIS + '">Nilai</a> <button class="btn ghost xs" data-act="detailSiswa" data-nis="' + esc(s.NIS) + '">Detail</button></td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="empty">' + ic('group_off') + 'Belum ada siswa yang ditempatkan di DU/DI Anda.</div>') + '</div>';
    }
  };

  /* ---------- Presensi mingguan ---------- */
  Pages['INSTRUKTUR:absensi'] = Pages['ADMIN:absensiInput'] = {
    render(param) {
      const periode = periodeAktif(), sis = siswaSaya(periode), aA = +P('AMBANG_ALFA') || 3, aI = +P('AMBANG_IZIN') || 5;
      let terakhir = ''; sis.forEach(s => (S.ix.abs[s.NIS] || []).forEach(a => { if (String(a.Periode) === periode && a.TglMulai > terakhir) terakhir = a.TglMulai; }));
      const mulai = param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? senin(param) : (terakhir ? tambahHari(terakhir, 7) : senin(hariIni()));
      const selesai = tambahHari(mulai, 4), hariList = [0, 1, 2, 3, 4].map(i => tambahHari(mulai, i));
      const mingguKe = (() => { const p = sis.length ? penOf(sis[0].NIS, periode) : null; return p ? Math.max(1, Math.floor((tglObj(mulai) - tglObj(p.TglMulai)) / (7 * 864e5)) + 1) : 1; })();
      const adaMinggu = sis.some(s => (S.ix.abs[s.NIS] || []).some(a => a.TglMulai === mulai && String(a.Periode) === periode));
      const kartu = s => {
        const ex = (S.ix.abs[s.NIS] || []).find(a => a.TglMulai === mulai && String(a.Periode) === periode), harian = ex ? ex.Harian.padEnd(5, 'H') : 'HHHHH', rk = rekap(s.NIS, periode), pen = rk.pen || {}, kunci = rk.kunci;
        const st = { H: 0, I: 0, S: 0, A: 0 }; harian.split('').forEach(c => { if (st[c] !== undefined) st[c]++; });
        return '<div class="abs-card" data-nis="' + esc(s.NIS) + '" data-harian="' + esc(harian) + '"' + (kunci ? ' data-kunci="1"' : '') + '><div class="row wrap">' + av(s.Nama, s.FotoURL) + '<div class="grow"><div class="row wrap"><b>' + esc(s.Nama) + '</b><span class="xs muted">NIS ' + esc(s.NIS) + '</span>' +
          (rk.t.A >= aA ? pill('Total ' + rk.t.A + ' Alfa (Kritis)', 'bad') : rk.t.I >= aI ? pill('Total ' + rk.t.I + ' Izin', 'warn') : rk.hari ? pill(num(rk.persen, 0) + '% hadir', 'ok') : '') + (kunci ? pill('Dikunci Admin', 'mute') : '') + (ex ? pill('Tersimpan', 'info') : '') + '</div><div class="xs muted">Tugas: ' + esc(pen.PekerjaanSpesifik || '-') + '</div></div>' +
          '<span class="cnt" data-cnt><span class="h">' + st.H + 'H</span>·<span class="i">' + st.I + 'I</span>·<span class="s">' + st.S + 'S</span>·<span class="a">' + st.A + 'A</span></span></div>' +
          '<div class="days">' + hariList.map((h, i) => { const d = tglObj(h); return '<div class="day"><div class="dl">' + HARI[d.getDay()] + ', ' + d.getDate() + '</div><div class="opts">' + ['H', 'I', 'S', 'A'].map(o => '<button type="button" class="opt ' + o + (harian[i] === o ? ' on' : '') + '" data-act="opsiAbs" data-i="' + i + '" data-v="' + o + '"' + (kunci ? ' disabled' : '') + ' aria-label="' + o + '">' + o + '</button>').join('') + '</div></div>'; }).join('') + '</div>' +
          '<input class="input mt-s" data-cat placeholder="Catatan & log petugas DU/DI (opsional)" value="' + esc(ex ? ex.Catatan : '') + '"' + (kunci ? ' disabled' : '') + '></div>';
      };
      const minggu = {}; sis.forEach(s => (S.ix.abs[s.NIS] || []).filter(a => String(a.Periode) === periode).forEach(a => { const m = minggu[a.TglMulai] = minggu[a.TglMulai] || { a, H: 0, I: 0, S: 0, A: 0, alfa: [] }; m.H += +a.Hadir; m.I += +a.Izin; m.S += +a.Sakit; m.A += +a.Alfa; if (+a.Alfa) m.alfa.push(nmSiswa(a.NIS).split(' ')[0]); }));
      const riw = Object.keys(minggu).sort().reverse();
      return head(ic('fact_check') + ' Modul Instruktur DU/DI · Presensi', 'Input & Verifikasi Absensi Mingguan', 'Pencatatan presensi 5 hari kerja per siklus jeda tanggal. Rentang minggu tidak boleh tumpang tindih; data dapat dikoreksi selama belum dikunci Admin.',
          '<button class="btn ghost" data-act="eksporAbsensi">' + ic('download') + 'Unduh Rekap (Excel)</button>') +
        '<div class="card tight mb"><div class="row wrap between"><div class="row">' + ic('calendar_month') + '<div><b>Periode ' + esc(periode) + ' · Siklus Minggu ke-' + mingguKe + '</b><div class="small muted">Jeda tanggal: ' + esc(fmtTglL(mulai)) + ' – ' + esc(fmtTglL(selesai)) + '</div></div></div>' +
        '<div class="actions"><button class="btn ghost sm" data-act="go" data-href="#/absensi/' + tambahHari(mulai, -7) + '">' + ic('chevron_left') + '</button><input type="date" class="input" style="width:auto;padding:7px 10px" value="' + mulai + '" data-chg="pilihMinggu" aria-label="Pilih minggu"><button class="btn ghost sm" data-act="go" data-href="#/absensi/' + tambahHari(mulai, 7) + '">' + ic('chevron_right') + '</button>' +
        pill(adaMinggu ? 'Mode koreksi (sudah tersimpan)' : 'Form terbuka', adaMinggu ? 'warn' : 'ok', true) + '</div></div></div>' +
        '<div class="with-panel"><div class="card"><div class="row wrap between mb"><div><h3>Formulir Input Presensi Cepat</h3><div class="small muted">' + esc(fmtTgl(mulai)) + ' s.d. ' + esc(fmtTgl(selesai)) + '</div></div><div class="seg"><button data-act="semuaHadir">' + ic('done_all') + 'Semua Hadir</button><button data-act="resetAbs">Reset</button></div></div>' +
        '<div class="legend mb"><span><i style="background:var(--teal)"></i>H Hadir</span><span><i style="background:var(--indigo-700)"></i>I Izin</span><span><i style="background:var(--amber)"></i>S Sakit</span><span><i style="background:var(--rose)"></i>A Alfa (kritis)</span></div>' +
        (sis.length ? '<div id="abs-form">' + sis.map(kartu).join('') + '</div><div class="row wrap between mt"><span class="small muted">' + ic('info') + ' Status awal minggu baru = Hadir. Ubah hari yang tidak hadir.</span><button class="btn lg" data-act="simpanAbsensi" data-mulai="' + mulai + '" data-selesai="' + selesai + '" data-periode="' + periode + '" data-minggu="' + mingguKe + '">' + ic('verified') + 'Simpan Minggu ke-' + mingguKe + '</button></div>'
          : '<div class="empty">' + ic('group_off') + 'Belum ada siswa yang ditempatkan pada Periode ' + esc(periode) + '.</div>') + '</div>' +
        '<div class="grid"><div class="card"><div class="card-h">' + ic('shield') + '<h3>Ambang Kedisiplinan</h3></div><div class="list"><div class="alert bad">' + ic('error') + '<div><h4>Ambang Alfa (' + aA + ' hari)</h4><p class="small">Peringatan otomatis dikirim ke Guru Pembimbing.</p></div></div><div class="alert warn">' + ic('info') + '<div><h4>Ambang Izin (' + aI + ' hari)</h4><p class="small">Batas izin non-sakit per periode.</p></div></div></div></div>' +
        '<div class="card"><div class="card-h">' + ic('emergency') + '<h3 class="grow">Pesan Cepat ke Guru</h3>' + pill('Darurat', 'bad') + '</div><p class="small muted" style="margin-top:0">Laporkan siswa bolos tanpa keterangan atau kendala K3 di lapangan.</p><a class="btn danger block" href="#/pesan">' + ic('send') + 'Kirim Notifikasi Lapangan</a></div></div></div>' +
        '<div class="card flush mt"><div style="padding:18px 20px" class="row between"><h3>Riwayat Log Absensi Mingguan</h3>' + pill(riw.length + ' minggu', 'info') + '</div>' +
        (riw.length ? '<div class="tbl-wrap" style="border:0"><table class="tbl"><thead><tr><th>Siklus</th><th>Rentang Jeda Tanggal</th><th>Rekap (H/I/S/A)</th><th>Diinput</th><th></th></tr></thead><tbody>' +
          riw.map(k => { const m = minggu[k]; return '<tr class="' + (m.A ? 'bad-row' : '') + '"><td><b>Minggu ke-' + esc(m.a.MingguKe) + '</b> ' + (m.A ? pill('Insiden Alfa', 'bad') : '') + '</td><td>' + esc(fmtTgl(m.a.TglMulai)) + ' – ' + esc(fmtTgl(m.a.TglSelesai)) + '</td>' +
            '<td><span class="cnt"><span class="h">' + m.H + ' H</span>·<span class="i">' + m.I + ' I</span>·<span class="s">' + m.S + ' S</span>·<span class="a">' + m.A + ' A</span></span>' + (m.alfa.length ? '<div class="xs" style="color:var(--rose-700)">' + esc(m.alfa.join(', ')) + '</div>' : '') + '</td>' +
            '<td class="small">' + esc(fmtWaktu(m.a.DiperbaruiPada)) + '</td><td class="right"><a class="btn ' + (k === mulai ? 'sec' : 'ghost') + ' xs" href="#/absensi/' + k + '">' + (k === mulai ? 'Sedang dibuka' : 'Koreksi / Edit') + '</a></td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="empty">Belum ada riwayat.</div>') + '</div>';
    },
    after() { App.dirty = false; }
  };
  Act.pilihMinggu = el => App.go('#/absensi/' + el.value);
  function hitungKartu(card) {
    const h = card.dataset.harian, st = { H: 0, I: 0, S: 0, A: 0 }; h.split('').forEach(c => { if (st[c] !== undefined) st[c]++; });
    card.querySelector('[data-cnt]').innerHTML = '<span class="h">' + st.H + 'H</span>·<span class="i">' + st.I + 'I</span>·<span class="s">' + st.S + 'S</span>·<span class="a">' + st.A + 'A</span>';
  }
  Act.opsiAbs = el => {
    const card = el.closest('.abs-card'), i = +el.dataset.i, h = card.dataset.harian.split('');
    h[i] = el.dataset.v; card.dataset.harian = h.join(''); App.dirty = true;
    el.parentNode.querySelectorAll('.opt').forEach(b => b.classList.toggle('on', b === el));
    hitungKartu(card);
  };
  Act.semuaHadir = () => { document.querySelectorAll('.abs-card:not([data-kunci])').forEach(c => { c.dataset.harian = 'HHHHH'; c.querySelectorAll('.opt').forEach(b => b.classList.toggle('on', b.dataset.v === 'H')); hitungKartu(c); }); App.dirty = true; };
  Act.resetAbs = () => { App.dirty = false; App.render(true); };
  Act.simpanAbsensi = btn => {
    const rows = [...document.querySelectorAll('.abs-card:not([data-kunci])')].map(c => ({ NIS: c.dataset.nis, Harian: c.dataset.harian, Catatan: c.querySelector('[data-cat]').value }));
    if (!rows.length) { toast('Tidak ada siswa yang dapat diisi.', 'warn'); return; }
    simpan(btn, 'absensi.simpan', { Periode: btn.dataset.periode, TglMulai: btn.dataset.mulai, TglSelesai: btn.dataset.selesai, MingguKe: btn.dataset.minggu, rows }).then(r => { if (r && r.success && r.data.ditolak.length) toast('Ditolak: ' + r.data.ditolak.join('; '), 'warn', 9000); });
  };
  Act.eksporAbsensi = () => {
    const rows = []; S.data.absensi.slice().sort((a, b) => a.TglMulai.localeCompare(b.TglMulai)).forEach(a => rows.push({ NIS: a.NIS, Nama: nmSiswa(a.NIS), Periode: a.Periode, Minggu: a.MingguKe, Mulai: a.TglMulai, Selesai: a.TglSelesai, Harian: a.Harian, Hadir: +a.Hadir, Izin: +a.Izin, Sakit: +a.Sakit, Alfa: +a.Alfa, Catatan: a.Catatan, DiinputOleh: a.DiinputOleh }));
    eksporXlsx({ Absensi: rows }, 'Rekap Absensi PKL');
  };

  /* ---------- Observasi & penilaian akhir ---------- */
  /* ---------- Pekerjaan spesifik siswa (dipilih instruktur dari daftar Admin) ---------- */
  Pages['INSTRUKTUR:pekerjaan'] = {
    render() {
      const sis = siswaSaya(), kat = katalogPekerjaan(), belum = sis.filter(x => !(penOf(x.NIS) || {}).PekerjaanSpesifik).length;
      return head(ic('engineering') + ' Aktivitas Lapangan', 'Pekerjaan Spesifik Siswa', 'Pilih pekerjaan dan sub pekerjaan yang benar-benar dikerjakan tiap siswa. Sub yang dipilih menjadi aspek penilaian di Lembar Observasi 1 & 2.',
          '<button class="btn ghost" data-act="usulPekerjaan">' + ic('add_comment') + 'Usulkan pekerjaan baru</button>') +
        (belum ? '<div class="alert warn mb">' + ic('assignment_late') + '<div><h4>' + belum + ' siswa belum dipilihkan pekerjaannya</h4><p class="small">Selama belum dipilih, Lembar Observasi memakai indikator Umum.</p></div></div>' : '') +
        (!kat.length ? '<div class="card empty">' + ic('engineering') + 'Admin belum mengisi daftar pekerjaan spesifik. Hubungi Koordinator PKL.</div>' :
        sis.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Siswa</th><th>Pekerjaan & sub pekerjaan</th><th>Diatur oleh</th><th></th></tr></thead><tbody>' + sis.map(x => {
          const pen = penOf(x.NIS) || {}, kunci = rekap(x.NIS).kunci;
          return '<tr><td><div class="who">' + av(x.Nama, x.FotoURL, 'av-xs') + '<div><div class="n">' + esc(x.Nama) + '</div><div class="s">NIS ' + esc(x.NIS) + '</div></div></div></td><td>' + K.ringkasPekerjaan(pen) + '</td>' +
            '<td class="xs muted">' + esc(pen.PekerjaanDiaturOleh || '-') + '</td><td class="right">' + (kunci ? pill('Nilai ditutup', 'mute') : '<button class="btn ' + (pen.PekerjaanSpesifik ? 'sec' : '') + ' sm" data-act="aturPekerjaan" data-nis="' + esc(x.NIS) + '" data-periode="' + esc(pen.Periode) + '">' + ic(pen.PekerjaanSpesifik ? 'edit' : 'add') + (pen.PekerjaanSpesifik ? 'Ubah' : 'Pilih pekerjaan') + '</button>') + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="card empty">' + ic('group_off') + 'Belum ada siswa.</div>');
    }
  };

  Pages['INSTRUKTUR:penilaian'] = {
    render(param) {
      const [nisP, jenisP] = String(param || '').split('/'), sis = siswaSaya();
      if (!sis.length) return head(ic('grading') + ' Instrumen Baku PKL', 'Observasi & Penilaian') + '<div class="card empty">' + ic('group_off') + 'Belum ada siswa.</div>';
      const s = sis.find(x => x.NIS === nisP) || sis[0], jenis = ['OBS1', 'OBS2', 'AKHIR'].indexOf(jenisP) > -1 ? jenisP : 'OBS1', pen = penOf(s.NIS) || {}, rk = rekap(s.NIS);
      const judul = { OBS1: 'Lembar Observasi 1', OBS2: 'Lembar Observasi 2', AKHIR: 'Penilaian Akhir Praktik Kerja Lapangan' }[jenis];
      return head(ic('workspace_premium') + ' Instrumen Baku PKL ' + esc(P('TAHUN_AJARAN')) + ' · ' + (jenis === 'AKHIR' ? 'Evaluasi Kelulusan' : 'Kompetensi Spesifik'), judul + (jenis !== 'AKHIR' ? ': ' + esc(teksPekerjaan(pen.PekerjaanSpesifik) || 'Umum') : ''),
          jenis === 'AKHIR' ? 'Penilaian komprehensif performa siswa selama masa magang: kompetensi teknis, etos kerja, kedisiplinan K3, dan laporan kerja.' : 'Indikator teknis menyesuaikan Pekerjaan Spesifik siswa. Geser penggeser skor atau ketik angka 0–100.',
          '<div class="seg">' + ['OBS1', 'OBS2', 'AKHIR'].map(j => '<button class="' + (j === jenis ? 'on' : '') + '" data-act="go" data-href="#/penilaian/' + s.NIS + '/' + j + '">' + esc({ OBS1: 'Obs 1', OBS2: 'Obs 2', AKHIR: 'Penilaian Akhir' }[j]) + (rk.nilai[j] !== undefined ? ' ' + pill(num(rk.nilai[j]), 'ok') : '') + '</button>').join('') + '</div>') +
        '<div class="card tight mb"><div class="xs b muted mb">PILIH SISWA PRAKTIKAN (' + sis.length + ')</div><div class="row wrap">' + sis.map(x => { const r2 = rekap(x.NIS); return '<a class="li" style="min-width:200px;flex:1;max-width:260px;' + (x.NIS === s.NIS ? 'border-color:var(--teal);background:var(--teal-50)' : '') + '" href="#/penilaian/' + x.NIS + '/' + jenis + '">' + av(x.Nama, x.FotoURL, 'av-xs') + '<div class="grow"><div class="b small ellipsis">' + esc(x.Nama) + '</div><div class="xs muted">' + (r2.nilai[jenis] !== undefined ? 'Skor ' + num(r2.nilai[jenis]) : 'Menunggu') + '</div></div>' + (x.NIS === s.NIS ? pill('Aktif', 'ok') : '') + '</a>'; }).join('') + '</div>' +
        (jenis !== 'AKHIR' ? '<div class="card tight mb"><div class="row wrap" style="gap:10px"><span class="xs b muted">PEKERJAAN SPESIFIK</span><div class="grow">' + K.ringkasPekerjaan(pen) + '</div>' + (rk.kunci ? '' : '<button class="btn ghost sm" data-act="aturPekerjaan" data-nis="' + esc(s.NIS) + '" data-periode="' + esc(pen.Periode) + '">' + ic('engineering') + (pen.PekerjaanSpesifik ? 'Ubah pekerjaan' : 'Pilih pekerjaan') + '</button>') + '</div></div>' : '') +
        '<div class="row wrap small muted mt-s">' + ic('apartment') + esc(nmDudi(pen.DUDIID)) + ' · ' + ic('date_range') + esc(fmtTgl(pen.TglMulai)) + ' – ' + esc(fmtTgl(pen.TglSelesai)) + ' · Kehadiran ' + num(rk.persen, 0) + '% (' + rk.t.A + ' Alfa)</div></div>' +
        K.formNilai(s.NIS, pen.Periode, jenis, true);
    }
  };

  /* ---------- Data Izin/Alfa (baca) ---------- */
  Pages['INSTRUKTUR:peringatan'] = {
    render() {
      const list = S.data.peringatan.filter(p => cari({ n: nmSiswa(p.NIS) }, S.q)).sort((a, b) => b.DiperbaruiPada.localeCompare(a.DiperbaruiPada));
      return head(ic('notification_important') + ' Kedisiplinan Lapangan', 'Data Siswa Izin / Alfa', 'Peringatan ambang kehadiran siswa di DU/DI Anda. Penanganan dilakukan oleh Guru Pembimbing.') + tabelPeringatan(list, false);
    }
  };

  /* ---------- Pesan darurat (kirim) ---------- */
  Pages['INSTRUKTUR:pesan'] = {
    render(param) {
      const sis = siswaSaya(), list = S.data.pesan.slice().sort((a, b) => b.DibuatPada.localeCompare(a.DibuatPada)), keAdmin = param === 'admin';
      const tujuan = '<div class="seg mb" role="tablist"><button type="button" class="' + (keAdmin ? '' : 'on') + '" data-act="go" data-href="#/pesan">' + ic('school') + 'Ke Guru Pembimbing</button><button type="button" class="' + (keAdmin ? 'on' : '') + '" data-act="go" data-href="#/pesan/admin">' + ic('admin_panel_settings') + 'Ke Admin / Koordinator</button></div>';
      const formGuru = fld({ name: 'NIS', label: 'Siswa', type: 'select', req: true, options: sis.map(s => ({ v: s.NIS, l: s.Nama + ' — Guru: ' + nmGuru((penOf(s.NIS) || {}).GuruID) })) }) +
        fld({ name: 'Subjek', label: 'Subjek', req: true, ph: 'Contoh: Siswa tidak hadir tanpa keterangan' }) + fld({ name: 'Isi', label: 'Isi pesan', type: 'textarea', req: true, rows: 5, ph: 'Jelaskan kronologi singkat…' }) +
        '<button class="btn danger block" data-act="kirimPesan">' + ic('send') + 'Kirim ke Guru Pembimbing</button>';
      const formAdmin = '<input type="hidden" name="Tujuan" value="ADMIN">' +
        fld({ name: 'Kategori', label: 'Kategori', type: 'select', kosong: false, options: ['Usulan pekerjaan spesifik', 'Kendala aplikasi / akun', 'Data siswa / penempatan', 'Lainnya'] }) +
        fld({ name: 'NIS', label: 'Siswa terkait (opsional)', type: 'select', ph: '— Tidak terkait siswa tertentu —', options: sis.map(s => ({ v: s.NIS, l: s.Nama })) }) +
        fld({ name: 'Subjek', label: 'Subjek', req: true, ph: 'Contoh: Usulan pekerjaan Instalasi CCTV' }) + fld({ name: 'Isi', label: 'Isi pesan', type: 'textarea', req: true, rows: 5, ph: 'Untuk usulan pekerjaan, tuliskan juga sub pekerjaannya.' }) +
        '<div class="row wrap gap-s"><button class="btn block" data-act="kirimPesan">' + ic('send') + 'Kirim ke Admin</button><button type="button" class="btn ghost block" data-act="usulPekerjaan">' + ic('engineering') + 'Isi formulir usulan pekerjaan</button></div>';
      return head(ic('emergency') + ' Komunikasi & Bantuan', 'Pesan Darurat', keAdmin ? 'Kirim usulan pekerjaan spesifik baru, kendala aplikasi, atau koreksi data ke Admin / Koordinator PKL.' : 'Gunakan untuk kendala mendesak: siswa tidak hadir tanpa kabar, insiden K3, atau masalah perilaku.') + tujuan +
        '<div class="grid g2"><div class="card"><div class="card-h"><span class="ic ' + (keAdmin ? 'teal' : 'rose') + '">' + ic('send') + '</span><h3>' + (keAdmin ? 'Pesan ke Admin / Koordinator' : 'Kirim Pesan Darurat') + '</h3></div><form id="f-pesan" data-dirty>' + (keAdmin ? formAdmin : formGuru) + '</form></div>' +
        '<div class="card"><div class="card-h"><h3 class="grow">Pesan Terkirim</h3>' + pill(list.length, 'info') + '</div>' + (list.length ? '<div class="list">' + list.map(m => { const adm = m.Tujuan === 'ADMIN';
          return '<div class="li"><span class="ic ' + (m.Balasan ? 'teal' : 'amber') + '">' + ic(m.Balasan ? 'mark_chat_read' : 'schedule_send') + '</span><div class="grow"><div class="row between"><b class="small">' + esc(m.Subjek) + '</b>' + pillStatus(m.Status) + '</div><div class="xs muted">' + (m.NIS ? esc(nmSiswa(m.NIS)) + ' · ' : '') + 'ke ' + (adm ? 'Admin / Koordinator' + (m.Kategori ? ' · ' + esc(m.Kategori) : '') : esc(nmGuru(m.GuruID))) + ' · ' + esc(fmtWaktu(m.DibuatPada)) + '</div><p class="small" style="margin:6px 0 0;white-space:pre-wrap">' + esc(m.Isi) + '</p>' +
          (m.Balasan ? '<div class="alert mt-s">' + ic('reply') + '<div><h4 class="small">Balasan ' + (adm ? 'Admin' + (m.DibalasOleh ? ' (' + esc(m.DibalasOleh) + ')' : '') : 'guru') + ' · ' + esc(fmtWaktu(m.DibalasPada)) + '</h4><p class="small">' + esc(m.Balasan) + '</p></div></div>' : '') + '</div></div>'; }).join('') + '</div>' : '<div class="empty">Belum ada pesan.</div>') + '</div></div>';
    }
  };
  Act.kirimPesan = btn => {
    const f = document.getElementById('f-pesan'), d = bacaForm(f);
    if (d.Tujuan === 'ADMIN') { if (!d.Subjek || !d.Isi) { toast('Lengkapi subjek dan isi pesan.', 'warn'); return; } }
    else if (!d.NIS || !d.Subjek || !d.Isi) { toast('Lengkapi siswa, subjek, dan isi pesan.', 'warn'); return; }
    simpan(btn, 'pesan.kirim', d);
  };
  /** Usulan pekerjaan spesifik baru → pesan ke Admin (Admin bisa langsung menambahkannya ke daftar) */
  Act.usulPekerjaan = () => formModal({ title: 'Usulkan Pekerjaan Spesifik Baru', icon: 'engineering', action: 'pesan.kirim', size: 'lg',
    intro: '<p class="small muted" style="margin-top:0">Usulan dikirim ke Admin / Koordinator PKL. Setelah Admin menambahkannya, pekerjaan ini bisa Anda pilih di menu Pekerjaan Siswa.</p>',
    fields: [{ name: 'nama', label: 'Nama pekerjaan', req: true, full: true, ph: 'Contoh: Instalasi CCTV IP' },
      { name: 'sub', label: 'Sub pekerjaan (satu per baris)', type: 'textarea', rows: 5, req: true, full: true, ph: 'Pemasangan kamera & kabel\nKonfigurasi NVR\nAkses jarak jauh' },
      { name: 'NIS', label: 'Siswa yang mengerjakan (opsional)', type: 'select', full: true, ph: '— Tidak diisi —', options: siswaSaya().map(s => ({ v: s.NIS, l: s.Nama })) },
      { name: 'ket', label: 'Keterangan tambahan (opsional)', type: 'textarea', rows: 2, full: true }],
    olah: d => {
      const subs = String(d.sub || '').split('\n').map(x => x.replace(/^[-•*\d.\s]+/, '').trim()).filter(Boolean);
      if (!subs.length) { toast('Isi minimal satu sub pekerjaan.', 'warn'); return null; }
      return { Tujuan: 'ADMIN', Kategori: 'Usulan pekerjaan spesifik', NIS: d.NIS || '', Subjek: 'Usulan pekerjaan: ' + d.nama.trim(),
        Isi: 'Sub pekerjaan:\n' + subs.map(x => '- ' + x).join('\n') + (d.ket ? '\n\nKeterangan:\n' + d.ket : '') };
    } });
})();
