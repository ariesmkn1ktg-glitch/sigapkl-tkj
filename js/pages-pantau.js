/* SIGAPKL · v2.1 — Laporan PKL (pelacak progres), Pantau Guru Pembimbing, Rekap Penilaian DU/DI, Jadwal Penilaian */
(function () {
  'use strict';
  const ref = () => Sesi.me.ref, peran = () => Sesi.peran;
  const waLink = window.waLink || (hp => { const h = String(hp || '').replace(/\D/g, '').replace(/^0/, '62'); return h ? 'https://wa.me/' + h : ''; });

  /* ============================== Laporan PKL ============================== */
  const TAHAP = { BELUM: ['Belum mengirim', 'mute'], DIPERIKSA: ['Menunggu diperiksa', 'warn'], REVISI: ['Perlu revisi', 'bad'], DISETUJUI: ['Disetujui', 'ok'] };
  const tahapOf = nis => { const l = S.ix.lap && S.ix.lap[nis]; return l && l.Tahap ? l.Tahap : 'BELUM'; };
  const pillTahap = nis => { const t = TAHAP[tahapOf(nis)] || TAHAP.BELUM; return pill(t[0], t[1]); };
  const riwayatLap = l => { try { const a = JSON.parse((l && l.Riwayat) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  const timeline = l => { const a = riwayatLap(l).slice().reverse(); return a.length ? '<div class="lap-tl">' + a.map(x => '<div class="lap-ti"><span class="lap-dot ' + ((TAHAP[x.tahap] || TAHAP.BELUM)[1]) + '"></span><div><div class="small"><b>' + esc((TAHAP[x.tahap] || [x.tahap])[0]) + '</b> · ' + esc(x.oleh || '') + '</div><div class="xs muted">' + esc(fmtWaktu(x.w)) + '</div>' + (x.catatan ? '<div class="small mt-s" style="white-space:pre-wrap">' + esc(x.catatan) + '</div>' : '') + '</div></div>').join('') + '</div>' : '<div class="muted small">Belum ada riwayat.</div>'; };

  Pages['SISWA:laporan'] = {
    render() {
      const nis = ref(), l = S.ix.lap[nis] || {}, t = tahapOf(nis), pen = penOf(nis) || {}, g = S.ix.guru[pen.GuruID] || {};
      const info = {
        BELUM: ['info', 'upload_file', 'Kirim laporan PKL kamu', 'Tulis laporan di Google Docs, atur berbagi menjadi "Siapa saja yang memiliki link dapat melihat/berkomentar", lalu tempel link-nya di bawah.'],
        DIPERIKSA: ['info', 'hourglass_top', 'Laporan sedang menunggu diperiksa', 'Guru Pembimbing akan memeriksa laporanmu. Kamu masih dapat memperbarui link bila ada perubahan.'],
        REVISI: ['warn', 'edit_note', 'Laporan perlu direvisi', 'Perbaiki laporan sesuai catatan Guru Pembimbing, lalu tekan Kirim ulang.'],
        DISETUJUI: ['ok', 'task_alt', 'Laporan disetujui', 'Laporanmu sudah disetujui Guru Pembimbing. Nilai laporan diisi terpisah oleh guru.'] }[t];
      return head(ic('article') + ' Laporan PKL', 'Laporan PKL', 'Pantau progres laporan dan catatan dari Guru Pembimbing' + (g.Nama ? ' (' + esc(g.Nama) + ')' : '') + '.') +
        '<div class="alert ' + info[0] + ' big mb"><span class="ic">' + ic(info[1], 'fill') + '</span><div class="grow"><h4>' + info[2] + '</h4><p>' + info[3] + '</p>' +
        (t === 'REVISI' && l.CatatanGuru ? '<div class="lap-cat mt-s"><b>Catatan guru:</b><br>' + esc(l.CatatanGuru) + '</div>' : '') + '</div></div>' +
        '<div class="grid g2"><div class="card"><div class="card-h"><span class="ic teal">' + ic('link') + '</span><div class="grow"><h3>Link laporan</h3><div class="sub">Google Docs / Google Drive</div></div>' + pillTahap(nis) + '</div>' +
        '<form id="fm-lap" novalidate><div class="form-grid">' + fld({ name: 'Judul', label: 'Judul laporan', full: true, value: l.Judul || '', ph: 'Contoh: Laporan PKL di PT Jaringan Nusantara' }) +
        fld({ name: 'Link', label: 'Link laporan', req: true, full: true, value: l.Link || '', ph: 'https://docs.google.com/document/d/...' }) + '</div>' +
        '<div class="row wrap mt" style="gap:8px"><button class="btn" data-act="laporanKirim">' + ic('send') + (t === 'BELUM' ? 'Kirim laporan' : t === 'REVISI' ? 'Kirim ulang' : 'Perbarui link') + '</button>' + (l.Link ? '<a class="btn sec" href="' + esc(l.Link) + '" target="_blank" rel="noopener">' + ic('open_in_new') + 'Buka laporan</a>' : '') + '</div></form></div>' +
        '<div class="card"><div class="card-h"><span class="ic indigo">' + ic('history') + '</span><div class="grow"><h3>Riwayat</h3></div></div>' + timeline(l) + '</div></div>';
    }
  };
  Act.laporanKirim = el => { const d = bacaForm(document.getElementById('fm-lap')); if (!d.Link) { toast('Tempel link laporan dulu.', 'warn'); return; } simpan(el, 'laporan.simpan', { Judul: d.Judul || '', Link: d.Link }); };
  Act.laporanTinjau = el => {
    const nis = el.dataset.nis, s = S.ix.siswa[nis] || { Nama: nis }, l = S.ix.lap[nis] || {};
    const m = modal({ title: 'Periksa Laporan · ' + s.Nama, icon: 'rate_review', size: 'lg',
      body: '<div class="row wrap mb" style="gap:8px">' + pillTahap(nis) + (l.Link ? '<a class="btn sec sm" href="' + esc(l.Link) + '" target="_blank" rel="noopener">' + ic('open_in_new') + 'Buka laporan</a>' : '<span class="small muted">Siswa belum mengirim link laporan.</span>') + '</div>' +
        (l.Judul ? '<div class="small mb"><b>Judul:</b> ' + esc(l.Judul) + '</div>' : '') +
        '<form id="fm-tinjau" novalidate><div class="form-grid">' + fld({ name: 'Tahap', label: 'Status laporan', type: 'select', kosong: false, full: true, value: l.Tahap === 'BELUM' || !l.Tahap ? 'DIPERIKSA' : l.Tahap,
          options: [{ v: 'DIPERIKSA', l: 'Menunggu diperiksa' }, { v: 'REVISI', l: 'Perlu revisi' }, { v: 'DISETUJUI', l: 'Disetujui' }] }) +
        fld({ name: 'Catatan', label: 'Catatan untuk siswa', type: 'textarea', rows: 4, full: true, value: l.CatatanGuru || '', ph: 'Wajib diisi bila perlu revisi. Contoh: Bab 3 tambahkan dokumentasi konfigurasi.' }) + '</div></form>' +
        '<h4 class="mt">Riwayat</h4>' + timeline(l),
      foot: '<button class="btn ghost" data-x>Batal</button><button class="btn" data-ok>' + ic('save') + 'Simpan</button>' });
    const b = m.el.querySelector('[data-ok]');
    b.onclick = () => { const d = bacaForm(m.el.querySelector('#fm-tinjau')); if (d.Tahap === 'REVISI' && !d.Catatan) { toast('Tuliskan catatan revisi.', 'warn'); return; } simpan(b, 'laporan.tinjau', { NIS: nis, Tahap: d.Tahap, Catatan: d.Catatan || '' }, { tutup: m.close }); };
  };
  let fLap = 'SEMUA';
  Act.filterLap = el => { fLap = el.dataset.v; App.render(); };
  Pages['GURU:laporan'] = {
    render() {
      const nisSaya = {}; S.data.penempatan.forEach(p => { if (p.GuruID === ref()) nisSaya[p.NIS] = 1; });
      const sis = S.data.siswa.filter(s => nisSaya[s.NIS]).sort((a, b) => a.Nama.localeCompare(b.Nama));
      const hit = {}; sis.forEach(s => { const t = tahapOf(s.NIS); hit[t] = (hit[t] || 0) + 1; });
      const tampil = sis.filter(s => fLap === 'SEMUA' || tahapOf(s.NIS) === fLap);
      const tab = (v, l) => '<button class="' + (fLap === v ? 'on' : '') + '" data-act="filterLap" data-v="' + v + '">' + l + ' <b>' + (v === 'SEMUA' ? sis.length : hit[v] || 0) + '</b></button>';
      return head(ic('article') + ' Laporan PKL', 'Laporan Siswa Bimbingan', 'Buka link laporan, beri catatan revisi, atau setujui. Nilai Laporan tetap diisi di menu Penilaian.') +
        '<div class="seg mb">' + tab('SEMUA', 'Semua') + tab('DIPERIKSA', 'Menunggu diperiksa') + tab('REVISI', 'Perlu revisi') + tab('DISETUJUI', 'Disetujui') + tab('BELUM', 'Belum mengirim') + '</div>' +
        (tampil.length ? '<div class="grid g2">' + tampil.map(s => { const l = S.ix.lap[s.NIS] || {}, pen = penOf(s.NIS) || {};
          return '<div class="card"><div class="row" style="gap:12px">' + av(s.Nama, s.FotoURL) + '<div class="grow"><b>' + esc(s.Nama) + '</b><div class="small muted">' + esc(s.Kelas || '') + ' · ' + esc(nmDudi(pen.DUDIID)) + '</div></div>' + pillTahap(s.NIS) + '</div>' +
            (l.Judul ? '<div class="small mt-s">' + esc(l.Judul) + '</div>' : '') + (l.DiperbaruiSiswa ? '<div class="xs muted mt-s">Dikirim/diperbarui siswa: ' + esc(fmtWaktu(l.DiperbaruiSiswa)) + '</div>' : '') +
            '<div class="row wrap mt" style="gap:8px">' + (l.Link ? '<a class="btn sec sm" href="' + esc(l.Link) + '" target="_blank" rel="noopener">' + ic('open_in_new') + 'Buka</a>' : '') +
            '<button class="btn sm" data-act="laporanTinjau" data-nis="' + esc(s.NIS) + '">' + ic('rate_review') + 'Periksa</button></div></div>'; }).join('') + '</div>' : '<div class="card empty">' + ic('article') + 'Tidak ada siswa pada filter ini.</div>');
    }
  };

  /* ============================== Status penilaian ============================== */
  const JENIS_INS = ['OBS1', 'OBS2', 'AKHIR'];
  /** '' (belum) | 'draf' | 'final' */
  function statusNilai(nis, periode, jenis) {
    const n = S.ix.nilai[nis + '|' + periode + '|' + jenis]; if (!n) return '';
    try { return JSON.parse(n.Skor || '{}').draf ? 'draf' : 'final'; } catch (e) { return 'final'; }
  }
  const chipNilai = (st, lbl) => '<span class="nchip ' + (st || 'belum') + '" title="' + esc(lbl + ': ' + (st === 'final' ? 'sudah dinilai' : st === 'draf' ? 'draf' : 'belum')) + '">' + ic(st === 'final' ? 'check_circle' : st === 'draf' ? 'pending' : 'radio_button_unchecked') + esc(lbl) + '</span>';
  const SINGKAT = { OBS1: 'Monev 1', OBS2: 'Monev 2', AKHIR: 'Akhir', PEMBIMBING: 'Pembimbing', LAPORAN: 'Laporan', PRESENTASI: 'Presentasi' };

  /* ============================== Jadwal penilaian ============================== */
  const URUT_JADWAL = ['OBS1', 'OBS2', 'AKHIR', 'PEMBIMBING', 'LAPORAN', 'PRESENTASI'];
  const PENGISI = { OBS1: 'Instruktur', OBS2: 'Instruktur', AKHIR: 'Instruktur', PEMBIMBING: 'Guru Pembimbing', LAPORAN: 'Guru Pembimbing', PRESENTASI: 'Guru Penguji' };
  function stripJadwal() {
    return '<div class="jd-strip">' + URUT_JADWAL.map(j => { const s = jadwalNilai(j); return '<div class="jd-chip ' + (s.buka ? 'buka' : 'tutup') + '">' + ic(s.buka ? 'lock_open' : 'lock') + '<div><b>' + esc(JENIS[j]) + '</b><small>' + esc(s.label) + '</small></div></div>'; }).join('') + '</div>';
  }
  Act.jadwalNilai = () => {
    let o = {}; try { o = JSON.parse(P('JADWAL_NILAI') || '{}') || {}; } catch (e) { o = {}; }
    const baris = j => { const x = o[j] || { mode: 'BUKA' };
      return '<tr data-j="' + j + '"><td><b>' + esc(JENIS[j]) + '</b><div class="xs muted">Diisi ' + esc(PENGISI[j]) + '</div></td><td><select class="input" data-m>' + [['BUKA', 'Dibuka'], ['JADWAL', 'Sesuai tanggal'], ['TUTUP', 'Ditutup']].map(m => '<option value="' + m[0] + '"' + (x.mode === m[0] ? ' selected' : '') + '>' + m[1] + '</option>').join('') + '</select></td>' +
        '<td><input type="date" class="input" data-a value="' + esc(x.mulai || '') + '"></td><td><input type="date" class="input" data-b value="' + esc(x.selesai || '') + '"></td></tr>'; };
    const m = modal({ title: 'Jadwal Penilaian', icon: 'event_available', size: 'lg',
      body: '<p class="small muted" style="margin-top:0"><b>Dibuka</b>: dapat diisi kapan saja. <b>Sesuai tanggal</b>: hanya dapat diisi di antara tanggal mulai dan selesai (termasuk kedua tanggal). <b>Ditutup</b>: tidak dapat diisi. Nilai yang sudah ada tetap tersimpan dan dapat dilihat.</p>' +
        '<div class="tbl-wrap"><table class="tbl jd-tbl"><thead><tr><th>Penilaian</th><th>Status</th><th>Mulai</th><th>Selesai</th></tr></thead><tbody>' + URUT_JADWAL.map(baris).join('') + '</tbody></table></div>',
      foot: '<button class="btn ghost" data-x>Batal</button><button class="btn" data-ok>' + ic('save') + 'Simpan Jadwal</button>' });
    const sinkron = () => m.el.querySelectorAll('tr[data-j]').forEach(tr => { const on = tr.querySelector('[data-m]').value === 'JADWAL'; tr.querySelectorAll('[data-a],[data-b]').forEach(i => { i.disabled = !on; }); });
    m.el.querySelectorAll('[data-m]').forEach(s => { s.onchange = sinkron; }); sinkron();
    const b = m.el.querySelector('[data-ok]');
    b.onclick = () => {
      const out = {};
      for (const tr of m.el.querySelectorAll('tr[data-j]')) {
        const j = tr.dataset.j, mode = tr.querySelector('[data-m]').value, a = tr.querySelector('[data-a]').value, z = tr.querySelector('[data-b]').value;
        if (mode === 'JADWAL') {
          if (!a && !z) { toast('Isi tanggal untuk ' + JENIS[j] + '.', 'warn'); return; }
          if (a && z && a > z) { toast('Tanggal mulai ' + JENIS[j] + ' melewati tanggal selesai.', 'warn'); return; }
          out[j] = { mode, mulai: a, selesai: z };
        } else if (mode !== 'BUKA') out[j] = { mode };
      }
      simpan(b, 'pengaturan.simpan', { pengaturan: { JADWAL_NILAI: JSON.stringify(out) } }, { tutup: m.close });
    };
  };
  /** Jumlah instruktur yang belum lengkap pada penilaian yang SEDANG dalam masa pengisian terjadwal (untuk lencana menu) */
  K.belumDinilai = () => {
    if (!S.data || peran() !== 'ADMIN') return 0;
    const aktif = JENIS_INS.filter(j => { const s = jadwalNilai(j); return s.mode === 'JADWAL' && s.buka; }); if (!aktif.length) return 0;
    return kelompokIns(periodeAktif()).filter(g => g.siswa.some(s => aktif.some(j => statusNilai(s.NIS, g.periode, j) !== 'final'))).length;
  };

  /* ============================== Rekap Penilaian DU/DI ============================== */
  function kelompokIns(periode) {
    const grup = {};
    S.data.penempatan.filter(p => String(p.Periode) === String(periode)).forEach(p => {
      const k = p.InstrukturID || ('D:' + p.DUDIID), ins = S.ix.ins[p.InstrukturID] || null, s = S.ix.siswa[p.NIS];
      if (!s) return;
      const g = grup[k] = grup[k] || { k, periode: String(periode), ins, dudi: S.ix.dudi[p.DUDIID] || (ins ? S.ix.dudi[ins.DUDIID] : null) || {}, siswa: [] };
      g.siswa.push(s);
    });
    return Object.values(grup).map(g => {
      g.hit = {}; JENIS_INS.forEach(j => { g.hit[j] = { final: 0, draf: 0 }; g.siswa.forEach(s => { const st = statusNilai(s.NIS, g.periode, j); if (st) g.hit[j][st]++; }); });
      g.lengkap = JENIS_INS.every(j => g.hit[j].final === g.siswa.length);
      return g;
    }).sort((a, b) => String(a.dudi.Nama || '').localeCompare(String(b.dudi.Nama || '')));
  }
  const F = { periode: '', status: 'SEMUA', jenis: 'SEMUA', q: '' };
  Act.rnFilter = el => { F[el.dataset.k] = el.value !== undefined && el.tagName === 'SELECT' ? el.value : el.dataset.v; App.render(); };
  Inp.rnCari = el => { F.q = el.value.toLowerCase(); document.querySelectorAll('[data-rn]').forEach(r => { r.style.display = !F.q || r.dataset.rn.indexOf(F.q) > -1 ? '' : 'none'; }); };
  function pesanPengingat(g, jenisList) {
    const nama = g.ins ? g.ins.Nama : 'Bapak/Ibu Instruktur', belum = [];
    jenisList.forEach(j => g.siswa.forEach(s => { if (statusNilai(s.NIS, g.periode, j) !== 'final') belum.push(JENIS[j] + ': ' + s.Nama); }));
    return 'Yth. ' + nama + (g.dudi.Nama ? ' (' + g.dudi.Nama + ')' : '') + ',\nmohon bantuan mengisi penilaian siswa PKL berikut di SIGAPKL:\n' + belum.map((b, i) => (i + 1) + '. ' + b).join('\n') +
      '\n\nBuka: ' + (P('APP_URL') || location.href.replace(/#.*$/, '')) + '\nTerima kasih.\n— ' + (P('NAMA_SEKOLAH') || 'Koordinator PKL');
  }
  Pages['ADMIN:rekapnilai'] = {
    render() {
      const periode = F.periode || periodeAktif(), jl = F.jenis === 'SEMUA' ? JENIS_INS : [F.jenis];
      const semua = kelompokIns(periode), lengkapG = g => jl.every(j => g.hit[j].final === g.siswa.length);
      const tampil = semua.filter(g => F.status === 'SEMUA' || (F.status === 'BELUM' ? !lengkapG(g) : lengkapG(g)));
      const totS = semua.reduce((a, g) => a + g.siswa.length, 0), tot = j => semua.reduce((a, g) => a + g.hit[j].final, 0);
      const persen = j => totS ? Math.round(tot(j) / totS * 100) : 0;
      const stat = (j) => '<div class="card stat"><span class="stat-lbl">' + esc(JENIS[j]) + '</span><div class="stat-val">' + tot(j) + '<small> / ' + totS + ' siswa</small></div><div class="bar mt-s"><i style="width:' + persen(j) + '%"></i></div><div class="stat-note">' + persen(j) + '% sudah dinilai · ' + esc(jadwalNilai(j).label) + '</div></div>';
      const seg = (k, v, l, n) => '<button class="' + (F[k] === v ? 'on' : '') + '" data-act="rnFilter" data-k="' + k + '" data-v="' + v + '">' + l + (n !== undefined ? ' <b>' + n + '</b>' : '') + '</button>';
      const baris = g => {
        const nm = g.ins ? g.ins.Nama : 'Belum ada instruktur', hp = g.ins ? g.ins.NoHP : '', wa = waLink(hp), jlBuka = jl.filter(j => jadwalNilai(j).buka), belumAda = jlBuka.some(j => g.hit[j].final < g.siswa.length);
        const sel = j => { const h = g.hit[j], n = g.siswa.length; return '<td class="center"><span class="rn-n ' + (h.final === n ? 'ok' : h.final || h.draf ? 'part' : 'no') + '">' + h.final + '/' + n + '</span>' + (h.draf ? '<div class="xs muted">' + h.draf + ' draf</div>' : '') + '</td>'; };
        const detail = '<tr class="rn-det" data-rn="' + esc((nm + ' ' + (g.dudi.Nama || '') + ' ' + g.siswa.map(s => s.Nama).join(' ')).toLowerCase()) + '-d"><td colspan="7"><details><summary class="small">Lihat ' + g.siswa.length + ' siswa</summary><div class="rn-sis">' +
          g.siswa.map(s => '<div class="rn-s"><span class="grow small"><b>' + esc(s.Nama) + '</b> <span class="muted">' + esc(s.Kelas || '') + '</span></span>' + JENIS_INS.map(j => chipNilai(statusNilai(s.NIS, g.periode, j), SINGKAT[j])).join('') + '</div>').join('') + '</div></details></td></tr>';
        return '<tr data-rn="' + esc((nm + ' ' + (g.dudi.Nama || '') + ' ' + g.siswa.map(s => s.Nama).join(' ')).toLowerCase()) + '"><td><b>' + esc(g.dudi.Nama || '-') + '</b><div class="xs muted">' + esc(g.dudi.Bidang || g.dudi.Alamat || '') + '</div></td><td>' + esc(nm) + (hp ? '<div class="xs muted">' + esc(hp) + '</div>' : '') + '</td><td class="center">' + g.siswa.length + '</td>' + JENIS_INS.map(sel).join('') +
          '<td class="right">' + (belumAda && wa ? '<a class="btn sec xs" target="_blank" rel="noopener" href="' + esc(wa + '?text=' + encodeURIComponent(pesanPengingat(g, jlBuka))) + '">' + ic('chat') + 'Ingatkan</a>' : lengkapG(g) ? pill('Lengkap', 'ok') : !jlBuka.length ? '<span class="xs muted">Belum dibuka</span>' : '') + '</td></tr>' + detail;
      };
      const nBelum = semua.filter(g => !lengkapG(g)).length;
      return head(ic('fact_check') + ' Monitoring PKL', 'Rekap Penilaian DU/DI & Instruktur', 'Siapa yang sudah mengisi Monev 1, Monev 2, dan Penilaian Akhir DUDI. Tekan "Ingatkan" untuk mengirim pesan WhatsApp berisi daftar siswa yang belum dinilai.',
        '<button class="btn sec" data-act="rnEkspor">' + ic('download') + 'Ekspor Excel</button><button class="btn" data-act="jadwalNilai">' + ic('event_available') + 'Atur Jadwal Penilaian</button>') +
        '<div class="card tight mb"><div class="row between wrap"><div class="xs b muted">JADWAL PENILAIAN SAAT INI</div><button class="btn ghost xs" data-act="jadwalNilai">' + ic('edit') + 'Ubah</button></div>' + stripJadwal() + '</div>' +
        '<div class="grid g3 keep2 mb">' + JENIS_INS.map(stat).join('') + '</div>' +
        '<div class="row wrap mb" style="gap:10px"><select class="input" style="max-width:150px" data-chg="rnFilter" data-k="periode" aria-label="Periode">' + ['1', '2'].map(p => '<option value="' + p + '"' + (p === String(periode) ? ' selected' : '') + '>Periode ' + p + '</option>').join('') + '</select>' +
        '<div class="seg">' + seg('jenis', 'SEMUA', 'Semua') + JENIS_INS.map(j => seg('jenis', j, SINGKAT[j])).join('') + '</div>' +
        '<div class="seg">' + seg('status', 'SEMUA', 'Semua', semua.length) + seg('status', 'BELUM', 'Belum lengkap', nBelum) + seg('status', 'LENGKAP', 'Lengkap', semua.length - nBelum) + '</div>' +
        '<input class="input" style="max-width:240px" placeholder="Cari DU/DI, instruktur, siswa…" data-inp="rnCari" value="' + esc(F.q) + '"></div>' +
        '<div class="card flush">' + (tampil.length ? '<div class="tbl-wrap" style="border:0"><table class="tbl rn-tbl"><thead><tr><th>DU/DI</th><th>Instruktur</th><th class="center">Siswa</th><th class="center">Monev 1</th><th class="center">Monev 2</th><th class="center">Penilaian Akhir</th><th></th></tr></thead><tbody>' + tampil.map(baris).join('') + '</tbody></table></div>' :
          '<div class="empty">' + ic('task_alt') + 'Tidak ada data pada filter ini.</div>') + '</div>';
    },
    after() { if (F.q) { const i = document.querySelector('[data-inp=rnCari]'); if (i) Inp.rnCari(i); } }
  };
  Act.rnEkspor = () => {
    const periode = F.periode || periodeAktif(), rows = [];
    kelompokIns(periode).forEach(g => g.siswa.forEach(s => rows.push({ Periode: periode, 'DU/DI': g.dudi.Nama || '', Instruktur: g.ins ? g.ins.Nama : '', 'No HP Instruktur': g.ins ? g.ins.NoHP : '', NIS: s.NIS, Siswa: s.Nama, Kelas: s.Kelas || '',
      'Monev 1': statusNilai(s.NIS, periode, 'OBS1') || 'belum', 'Monev 2': statusNilai(s.NIS, periode, 'OBS2') || 'belum', 'Penilaian Akhir': statusNilai(s.NIS, periode, 'AKHIR') || 'belum' })));
    eksporXlsx({ 'Rekap Penilaian': rows }, 'Rekap Penilaian DUDI P' + periode + ' ' + hariIni());
  };

  /* ============================== Pantau Guru Pembimbing ============================== */
  const G = { guru: '', saring: 'SEMUA' };
  Act.pgFilter = el => { G[el.dataset.k] = el.tagName === 'SELECT' ? el.value : el.dataset.v; App.render(); };
  function bimbinganSiswa(nis, guruId) {
    const a = S.data.bimbingan.filter(b => (!guruId || b.GuruID === guruId) && String(b.NIS).split(',').map(x => x.trim()).indexOf(nis) > -1);
    const datang = a.filter(b => b.Status === 'Terjadwal' && b.Tanggal >= hariIni()).sort((x, y) => (x.Tanggal + x.Jam).localeCompare(y.Tanggal + y.Jam));
    return { semua: a, datang, selesai: a.filter(b => b.Status === 'Selesai').length };
  }
  function dataGuru(gid) {
    const periode = periodeAktif(), pens = S.data.penempatan.filter(p => p.GuruID === gid), nisSet = {};
    pens.forEach(p => { if (!nisSet[p.NIS] || String(p.Periode) === periode) nisSet[p.NIS] = p; });
    const siswa = Object.keys(nisSet).map(n => ({ s: S.ix.siswa[n], p: nisSet[n] })).filter(x => x.s).sort((a, b) => a.s.Nama.localeCompare(b.s.Nama));
    const bimb = S.data.bimbingan.filter(b => b.GuruID === gid);
    return { siswa, dudi: new Set(siswa.map(x => x.p.DUDIID)).size, datang: bimb.filter(b => b.Status === 'Terjadwal' && b.Tanggal >= hariIni()).sort((x, y) => x.Tanggal.localeCompare(y.Tanggal)), selesai: bimb.filter(b => b.Status === 'Selesai').length,
      lap: siswa.reduce((o, x) => { const t = tahapOf(x.s.NIS); o[t] = (o[t] || 0) + 1; return o; }, {}),
      tanpaBimb: siswa.filter(x => !bimbinganSiswa(x.s.NIS, gid).semua.length).length };
  }
  Pages['ADMIN:pantauguru'] = {
    render() {
      const daftar = S.data.guru.map(g => Object.assign({ g }, dataGuru(g.GuruID))).filter(x => x.siswa.length).sort((a, b) => a.g.Nama.localeCompare(b.g.Nama));
      const pilih = G.guru && daftar.find(x => x.g.GuruID === G.guru);
      const sel = '<select class="input" style="max-width:340px" data-chg="pgFilter" data-k="guru" aria-label="Pilih guru pembimbing"><option value="">Semua Guru Pembimbing (' + daftar.length + ')</option>' + daftar.map(x => '<option value="' + esc(x.g.GuruID) + '"' + (x.g.GuruID === G.guru ? ' selected' : '') + '>' + esc(x.g.Nama) + ' · ' + x.siswa.length + ' siswa</option>').join('') + '</select>';
      const lapRingkas = x => (x.lap.DISETUJUI || 0) + '/' + x.siswa.length + (x.lap.DIPERIKSA ? ' · <span class="warn-t">' + x.lap.DIPERIKSA + ' menunggu</span>' : '') + (x.lap.REVISI ? ' · <span class="bad-t">' + x.lap.REVISI + ' revisi</span>' : '');
      if (!pilih) {
        const totS = daftar.reduce((a, x) => a + x.siswa.length, 0), tanpaJ = daftar.filter(x => !x.datang.length).length, lapOk = daftar.reduce((a, x) => a + (x.lap.DISETUJUI || 0), 0);
        return head(ic('supervisor_account') + ' Monitoring PKL', 'Pantau Guru Pembimbing', 'Pilih guru untuk melihat siswa, tempat PKL, progres laporan, dan jadwal bimbingannya.') +
          '<div class="grid g3 keep2 mb"><div class="card stat"><span class="stat-lbl">Guru pembimbing aktif</span><div class="stat-val">' + daftar.length + '</div><div class="stat-note">' + totS + ' siswa dibimbing</div></div>' +
          '<div class="card stat"><span class="stat-lbl">Tanpa jadwal bimbingan mendatang</span><div class="stat-val">' + tanpaJ + '<small> guru</small></div><div class="stat-note">Perlu diingatkan</div></div>' +
          '<div class="card stat"><span class="stat-lbl">Laporan disetujui</span><div class="stat-val">' + lapOk + '<small> / ' + totS + '</small></div><div class="stat-note">' + (totS ? Math.round(lapOk / totS * 100) : 0) + '% siswa</div></div></div>' +
          '<div class="row wrap mb" style="gap:10px">' + sel + '</div>' +
          '<div class="card flush">' + (daftar.length ? '<div class="tbl-wrap" style="border:0"><table class="tbl"><thead><tr><th>Guru Pembimbing</th><th class="center">Siswa</th><th class="center">DU/DI</th><th>Jadwal bimbingan berikut</th><th class="center">Sesi selesai</th><th>Laporan disetujui</th><th></th></tr></thead><tbody>' +
            daftar.map(x => { const n = x.datang[0];
              return '<tr><td><div class="who">' + av(x.g.Nama) + '<div><div class="n">' + esc(x.g.Nama) + '</div><div class="s">' + esc(x.g.NIP || '') + '</div></div></div></td><td class="center">' + x.siswa.length + '</td><td class="center">' + x.dudi + '</td><td>' + (n ? '<b>' + esc(fmtTgl(n.Tanggal)) + '</b> ' + esc(n.Jam || '') + '<div class="xs muted">' + esc(n.Topik || n.Metode || '') + '</div>' : pill('Belum ada jadwal', 'warn')) + '</td><td class="center">' + x.selesai + '</td><td class="small">' + lapRingkas(x) + '</td>' +
                '<td class="right"><button class="btn ghost xs" data-act="pgFilter" data-k="guru" data-v="' + esc(x.g.GuruID) + '">Detail ' + ic('chevron_right') + '</button></td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="empty">' + ic('group_off') + 'Belum ada penempatan dengan guru pembimbing.</div>') + '</div>';
      }
      const g = pilih.g, wa = waLink(g.NoHP);
      const saring = x => G.saring === 'SEMUA' || (G.saring === 'TANPA_BIMB' ? !bimbinganSiswa(x.s.NIS, g.GuruID).datang.length : G.saring === 'LAP' ? tahapOf(x.s.NIS) !== 'DISETUJUI' : true);
      const seg = (v, l) => '<button class="' + (G.saring === v ? 'on' : '') + '" data-act="pgFilter" data-k="saring" data-v="' + v + '">' + l + '</button>';
      const kartu = x => { const s = x.s, p = x.p, d = S.ix.dudi[p.DUDIID] || {}, ins = S.ix.ins[p.InstrukturID] || {}, b = bimbinganSiswa(s.NIS, g.GuruID), l = S.ix.lap[s.NIS] || {}, n = b.datang[0];
        return '<div class="card pg-card"><div class="row" style="gap:12px">' + av(s.Nama, s.FotoURL) + '<div class="grow"><b>' + esc(s.Nama) + '</b><div class="small muted">' + esc(s.NIS) + ' · ' + esc(s.Kelas || '') + ' · Periode ' + esc(p.Periode) + '</div></div>' + pillTahap(s.NIS) + '</div>' +
          '<dl class="kv mt-s"><dt>Tempat PKL</dt><dd><b>' + esc(d.Nama || '-') + '</b>' + (d.Alamat ? '<div class="xs muted">' + esc(d.Alamat) + '</div>' : '') + '</dd><dt>Instruktur</dt><dd>' + esc(ins.Nama || '-') + '</dd>' +
          '<dt>Bimbingan</dt><dd>' + (n ? ic('event') + ' <b>' + esc(fmtTgl(n.Tanggal)) + '</b> ' + esc(n.Jam || '') + ' · ' + esc(n.Metode || '') : '<span class="warn-t">Belum ada jadwal mendatang</span>') + '<div class="xs muted">' + b.selesai + ' sesi selesai · ' + b.semua.length + ' total</div></dd>' +
          '<dt>Laporan</dt><dd>' + (l.Link ? '<a href="' + esc(l.Link) + '" target="_blank" rel="noopener">' + esc(l.Judul || 'Buka laporan') + '</a>' : '<span class="muted">Belum mengirim link</span>') + (l.CatatanGuru && l.Tahap === 'REVISI' ? '<div class="xs muted">Catatan: ' + esc(l.CatatanGuru) + '</div>' : '') + '</dd>' +
          '<dt>Penilaian</dt><dd>' + URUT_JADWAL.map(j => chipNilai(statusNilai(s.NIS, p.Periode, j), SINGKAT[j])).join('') + '</dd></dl>' +
          '<div class="row wrap mt-s" style="gap:8px"><button class="btn ghost xs" data-act="laporanTinjau" data-nis="' + esc(s.NIS) + '">' + ic('rate_review') + 'Ubah status laporan</button><button class="btn ghost xs" data-act="detailSiswa" data-nis="' + esc(s.NIS) + '">' + ic('person') + 'Detail siswa</button></div></div>'; };
      const list = pilih.siswa.filter(saring);
      return head(ic('supervisor_account') + ' Pantau Guru Pembimbing', esc(g.Nama), pilih.siswa.length + ' siswa · ' + pilih.dudi + ' DU/DI · ' + pilih.selesai + ' sesi bimbingan selesai',
        '<button class="btn ghost" data-act="pgFilter" data-k="guru" data-v="">' + ic('arrow_back') + 'Semua guru</button>' + (wa ? '<a class="btn sec" href="' + esc(wa) + '" target="_blank" rel="noopener">' + ic('chat') + 'WhatsApp guru</a>' : '')) +
        '<div class="row wrap mb" style="gap:10px">' + sel + '<div class="seg">' + seg('SEMUA', 'Semua siswa') + seg('TANPA_BIMB', 'Tanpa jadwal bimbingan') + seg('LAP', 'Laporan belum disetujui') + '</div></div>' +
        (pilih.datang.length ? '<div class="card tight mb"><div class="xs b muted mb-s">JADWAL BIMBINGAN MENDATANG</div>' + pilih.datang.slice(0, 5).map(b => '<div class="row small" style="gap:8px;padding:4px 0">' + ic('event') + '<b>' + esc(fmtTgl(b.Tanggal)) + ' ' + esc(b.Jam || '') + '</b><span class="muted">' + esc(b.Metode || '') + (b.Lokasi ? ' · ' + esc(b.Lokasi) : '') + '</span><span class="grow">' + esc(b.Topik || '') + '</span><span class="xs muted">' + String(b.NIS).split(',').length + ' siswa</span></div>').join('') + '</div>' :
          '<div class="alert warn mb">' + ic('event_busy') + '<div><p class="small">Guru ini belum memiliki jadwal bimbingan mendatang.</p></div></div>') +
        (list.length ? '<div class="grid g2">' + list.map(kartu).join('') + '</div>' : '<div class="card empty">' + ic('task_alt') + 'Tidak ada siswa pada filter ini.</div>');
    }
  };
})();
