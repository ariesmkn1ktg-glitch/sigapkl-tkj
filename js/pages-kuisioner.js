/* SIGAPKL · Kuisioner akhir PKL
 * Admin menyusun, membuka/menutup, dan melihat hasil. Instruktur / Guru / Siswa mengisi saat dibuka.
 * Mode SISWA = satu isian per siswa yang dinilai; Mode UMUM = satu isian per responden. */
(function () {
  'use strict';
  const PERAN_LBL = { INSTRUKTUR: 'Instruktur DU/DI', GURU: 'Guru Pembimbing', SISWA: 'Siswa' };
  const SKALA = ['Sangat kurang', 'Kurang', 'Cukup', 'Baik', 'Sangat baik'];
  const tanya = k => { try { const a = JSON.parse(k.Pertanyaan || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  const jawabanDari = j => { try { return JSON.parse(j.Jawaban || '{}'); } catch (e) { return {}; } };
  const bagianDari = qs => [...new Set(qs.map(q => q.bagian || 'Umum'))];
  const fmt1 = v => (Math.round(v * 100) / 100).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /* ---------- Templat siap pakai ---------- */
  const TEMPLAT = {
    siswa: { Judul: 'Penilaian Kompetensi, Sikap & Disiplin Siswa PKL', Target: ['INSTRUKTUR'], Mode: 'SISWA',
      Deskripsi: 'Mohon Bapak/Ibu Instruktur menilai setiap siswa PKL berdasarkan pengamatan selama magang. Skala 1 = sangat kurang sampai 5 = sangat baik.',
      Pertanyaan: [
        ['Kompetensi', 'Penguasaan pengetahuan teknis bidang TKJ'], ['Kompetensi', 'Keterampilan menggunakan peralatan dan perangkat kerja'],
        ['Kompetensi', 'Kualitas dan ketelitian hasil pekerjaan'], ['Kompetensi', 'Kemampuan menganalisis dan memecahkan masalah (troubleshooting)'],
        ['Kompetensi', 'Kemampuan mempelajari hal baru di tempat kerja'],
        ['Sikap', 'Sopan santun dan etika di lingkungan kerja'], ['Sikap', 'Kemampuan bekerja sama dalam tim'], ['Sikap', 'Komunikasi dengan pembimbing dan rekan kerja'],
        ['Sikap', 'Inisiatif dan tanggung jawab terhadap tugas'], ['Sikap', 'Kejujuran dan dapat dipercaya'],
        ['Disiplin', 'Ketepatan waktu hadir dan pulang'], ['Disiplin', 'Kepatuhan pada K3 dan SOP perusahaan'], ['Disiplin', 'Kerapian penampilan dan area kerja'],
        ['Disiplin', 'Menyelesaikan tugas sesuai tenggat']].map(x => ({ bagian: x[0], teks: x[1], tipe: 'skala', wajib: true }))
        .concat([{ bagian: 'Kesimpulan', teks: 'Rekomendasi untuk siswa ini', tipe: 'pilihan', opsi: ['Siap bekerja di industri', 'Siap dengan sedikit pembinaan', 'Perlu pembinaan lebih lanjut'], wajib: true },
          { bagian: 'Kesimpulan', teks: 'Catatan atau saran untuk siswa / sekolah', tipe: 'teks', wajib: false }]) },
    aplikasi: { Judul: 'Kepuasan Pengguna Aplikasi SIGAPKL-TKJ', Target: ['SISWA', 'GURU', 'INSTRUKTUR'], Mode: 'UMUM',
      Deskripsi: 'Bantu kami memperbaiki aplikasi SIGAPKL-TKJ. Jawaban Anda tidak memengaruhi nilai siswa.',
      Pertanyaan: [
        ['Kemudahan', 'Proses masuk (login) dan ganti sandi mudah'], ['Kemudahan', 'Menu dan tampilan mudah dipahami'],
        ['Kemudahan', 'Mengisi data (absensi, jurnal, nilai, atau pesan) mudah dilakukan'], ['Kinerja', 'Aplikasi terbuka dan berpindah menu dengan cepat'],
        ['Kinerja', 'Aplikasi nyaman dipakai di HP'], ['Manfaat', 'Informasi kehadiran dan nilai jelas dan membantu'],
        ['Manfaat', 'Notifikasi / pesan membantu komunikasi'], ['Manfaat', 'Secara keseluruhan saya puas memakai SIGAPKL-TKJ']].map(x => ({ bagian: x[0], teks: x[1], tipe: 'skala', wajib: true }))
        .concat([{ bagian: 'Masukan', teks: 'Fitur yang paling membantu', tipe: 'pilihan', opsi: ['Absensi & peringatan', 'Penilaian & rekap nilai', 'Jurnal & foto', 'Kartu PKL', 'Pesan & notifikasi', 'Dokumen'], wajib: false },
          { bagian: 'Masukan', teks: 'Saran perbaikan aplikasi', tipe: 'teks', wajib: false }]) }
  };

  /* ---------- Bantu: siapa yang dinilai & status pengisian ---------- */
  function siswaUntuk(k) {
    if (k.Mode !== 'SISWA') return [];
    const p = k.Periode || periodeAktif();
    if (Sesi.peran === 'SISWA') return [Sesi.me.ref];
    return S.data.penempatan.filter(x => String(x.Periode) === String(p) && (Sesi.peran !== 'GURU' || x.GuruID === Sesi.me.ref)).map(x => x.NIS);
  }
  const jawabanKu = (k, nis) => (S.data.jawabanSaya || []).find(j => j.KuisionerID === k.KuisionerID && (k.Mode !== 'SISWA' || j.NIS === (nis || '')));
  function progres(k) {
    if (k.Mode === 'SISWA') { const d = siswaUntuk(k); return { total: d.length, isi: d.filter(n => jawabanKu(k, n)).length }; }
    return { total: 1, isi: jawabanKu(k) ? 1 : 0 };
  }
  K.kuisionerTertunda = () => (S.data.kuisioner || []).reduce((a, k) => { const p = progres(k); return a + (p.total - p.isi); }, 0);
  K.bannerKuisioner = () => {
    if (Sesi.peran === 'ADMIN' || !(S.data.kuisioner || []).length) return '';
    const n = K.kuisionerTertunda(); if (!n) return '';
    return '<div class="alert info mb ksn-banner">' + ic('quiz', 'fill') + '<div class="grow"><h4>Kuisioner akhir PKL sudah dibuka</h4><p class="small">' + n + ' isian menunggu jawaban Anda. Hanya butuh beberapa menit.</p></div><a class="btn sm" href="#/kuisioner">' + ic('edit_note') + 'Isi sekarang</a></div>';
  };

  /* ======================= RESPONDEN ======================= */
  Pages.kuisioner = {
    render(param) {
      const [id, nis] = String(param || '').split('/'), list = S.data.kuisioner || [];
      const k = list.find(x => x.KuisionerID === id);
      if (k && (k.Mode !== 'SISWA' || nis || Sesi.peran === 'SISWA')) return formIsi(k, Sesi.peran === 'SISWA' && k.Mode === 'SISWA' ? Sesi.me.ref : nis);
      if (k) return daftarSiswa(k);
      return head(ic('quiz') + ' Akhir PKL', 'Kuisioner', 'Kuisioner yang sedang dibuka oleh Koordinator PKL untuk Anda.') +
        (list.length ? '<div class="grid g2">' + list.map(x => {
          const p = progres(x), done = p.isi >= p.total;
          return '<div class="card"><div class="card-h"><span class="ic ' + (done ? 'teal' : 'amber') + '">' + ic(done ? 'task_alt' : 'quiz') + '</span><div class="grow"><h3>' + esc(x.Judul) + '</h3><div class="sub">' + tanya(x).length + ' pertanyaan' + (x.Selesai ? ' · ditutup ' + esc(fmtTgl(x.Selesai)) : '') + '</div></div></div>' +
            (x.Deskripsi ? '<p class="small muted" style="margin-top:0">' + esc(x.Deskripsi) + '</p>' : '') +
            '<div class="row between wrap"><span class="small b">' + (x.Mode === 'SISWA' && Sesi.peran !== 'SISWA' ? p.isi + ' dari ' + p.total + ' siswa sudah dinilai' : done ? 'Sudah diisi' : 'Belum diisi') + '</span>' +
            '<a class="btn ' + (done ? 'sec' : '') + ' sm" href="#/kuisioner/' + esc(x.KuisionerID) + '">' + ic(done ? 'edit' : 'edit_note') + (done ? 'Lihat / ubah' : 'Isi kuisioner') + '</a></div>' +
            (x.Mode === 'SISWA' && p.total > 1 ? '<div class="bar mt-s"><i style="width:' + Math.round(p.isi / Math.max(p.total, 1) * 100) + '%"></i></div>' : '') + '</div>';
        }).join('') + '</div>' : '<div class="card empty">' + ic('quiz') + 'Tidak ada kuisioner yang sedang dibuka.</div>');
    }
  };
  function daftarSiswa(k) {
    const daftar = siswaUntuk(k);
    return head(ic('quiz') + ' Kuisioner', esc(k.Judul), 'Pilih siswa yang akan dinilai. Jawaban bisa diubah selama kuisioner masih dibuka.', '<a class="btn ghost" href="#/kuisioner">' + ic('arrow_back') + 'Kembali</a>') +
      (daftar.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Siswa</th><th>DU/DI</th><th>Status</th><th></th></tr></thead><tbody>' + daftar.map(n => {
        const s = S.ix.siswa[n] || {}, pen = penOf(n, k.Periode) || {}, j = jawabanKu(k, n);
        return '<tr><td><div class="who">' + av(s.Nama, s.FotoURL, 'av-xs') + '<div><div class="n">' + esc(s.Nama || n) + '</div><div class="s">NIS ' + esc(n) + '</div></div></div></td><td class="small">' + esc(nmDudi(pen.DUDIID)) + '</td>' +
          '<td>' + (j ? pill('Sudah dinilai', 'ok', true) : pill('Belum', 'warn', true)) + '</td><td class="right"><a class="btn ' + (j ? 'sec' : '') + ' sm" href="#/kuisioner/' + esc(k.KuisionerID) + '/' + esc(n) + '">' + ic(j ? 'edit' : 'edit_note') + (j ? 'Ubah' : 'Nilai') + '</a></td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="card empty">' + ic('group_off') + 'Tidak ada siswa untuk dinilai pada periode ini.</div>');
  }
  function formIsi(k, nis) {
    const qs = tanya(k), j = jawabanKu(k, nis), v = j ? jawabanDari(j) : {}, s = nis ? S.ix.siswa[nis] || {} : null;
    const kembali = k.Mode === 'SISWA' && Sesi.peran !== 'SISWA' ? '#/kuisioner/' + k.KuisionerID : '#/kuisioner';
    const isiTanya = (q, i) => {
      const nm = 'q_' + q.id, val = v[q.id];
      let inp;
      if (q.tipe === 'skala') inp = '<div class="skala" role="radiogroup" aria-label="' + esc(q.teks) + '">' + SKALA.map((l, x) => '<label><input type="radio" name="' + nm + '" value="' + (x + 1) + '"' + (+val === x + 1 ? ' checked' : '') + '><span class="n">' + (x + 1) + '</span><span class="l">' + l + '</span></label>').join('') + '</div>';
      else if (q.tipe === 'pilihan') inp = '<div class="opsi">' + (q.opsi || []).map(o => '<label class="check"><input type="radio" name="' + nm + '" value="' + esc(o) + '"' + (val === o ? ' checked' : '') + '>' + esc(o) + '</label>').join('') + '</div>';
      else inp = '<textarea class="input" rows="3" name="' + nm + '" maxlength="1000" aria-label="' + esc(q.teks) + '">' + esc(val || '') + '</textarea>';
      return '<div class="ksn-q" data-q="' + esc(q.id) + '"><div class="ksn-t"><span class="aspek-no">' + (i + 1) + '</span><span>' + esc(q.teks) + (q.wajib ? ' <span class="req">*</span>' : ' <span class="xs muted">(opsional)</span>') + '</span></div>' + inp + '</div>';
    };
    let no = 0;
    const blok = bagianDari(qs).map(b => '<div class="card"><div class="card-h"><h3 class="grow">' + esc(b) + '</h3></div>' + qs.filter(q => (q.bagian || 'Umum') === b).map(q => isiTanya(q, no++)).join('') + '</div>').join('');
    return head(ic('quiz') + ' Kuisioner', esc(k.Judul), s ? 'Penilaian untuk ' + esc(s.Nama || nis) + ' · NIS ' + esc(nis) + ' · ' + esc(nmDudi((penOf(nis, k.Periode) || {}).DUDIID)) : esc(k.Deskripsi || ''), '<a class="btn ghost" href="' + kembali + '">' + ic('arrow_back') + 'Kembali</a>') +
      (s && k.Deskripsi ? '<p class="small muted">' + esc(k.Deskripsi) + '</p>' : '') +
      '<form id="f-ksn" data-dirty class="ksn-form">' + blok + '<div class="row wrap mt" style="justify-content:flex-end;gap:8px"><a class="btn ghost" href="' + kembali + '">Batal</a><button class="btn lg" data-act="kirimKuisioner" data-id="' + esc(k.KuisionerID) + '" data-nis="' + esc(nis || '') + '">' + ic('send') + (j ? 'Simpan perubahan' : 'Kirim jawaban') + '</button></div></form>';
  }
  Act.kirimKuisioner = async btn => {
    const k = (S.data.kuisioner || []).find(x => x.KuisionerID === btn.dataset.id); if (!k) return;
    const f = document.getElementById('f-ksn'), d = bacaForm(f), Jawaban = {};
    for (const q of tanya(k)) {
      const val = d['q_' + q.id];
      if (val === undefined || String(val).trim() === '') { if (q.wajib) { const el = f.querySelector('[data-q="' + q.id + '"]'); el.classList.add('kurang'); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); toast('Masih ada pertanyaan wajib yang belum dijawab.', 'warn'); return; } continue; }
      Jawaban[q.id] = q.tipe === 'skala' ? +val : val;
    }
    const r = await simpan(btn, 'kuisioner.jawab', { KuisionerID: k.KuisionerID, NIS: btn.dataset.nis, Jawaban }, { reload: false });
    if (r && r.success) { await S.load({ silent: true }); App.dirty = false; App.go(k.Mode === 'SISWA' && Sesi.peran !== 'SISWA' ? '#/kuisioner/' + k.KuisionerID : '#/kuisioner'); }
  };
  document.addEventListener('change', e => { const q = e.target.closest && e.target.closest('.ksn-q.kurang'); if (q) q.classList.remove('kurang'); });

  /* ======================= ADMIN ======================= */
  function harapan(k) {
    const tgt = String(k.Target || '').split(','), p = k.Periode || periodeAktif(), pen = S.data.penempatan.filter(x => String(x.Periode) === String(p));
    if (k.Mode === 'SISWA') return tgt.reduce((a, r) => a + (r === 'INSTRUKTUR' ? pen.filter(x => x.InstrukturID).length : r === 'GURU' ? pen.filter(x => x.GuruID).length : pen.length), 0);
    return (S.data.akun || []).filter(a => a.Status !== 'Nonaktif' && tgt.some(r => a.Peran === r || String(a.PeranTambahan || '').split(',').indexOf(r) > -1)).length;
  }
  Pages['ADMIN:kuisioner'] = {
    render(param) {
      if (/^hasil\//.test(param || '')) return '<div id="ksn-hasil"><div class="skel" style="height:320px"></div></div>';
      const list = (S.data.kuisioner || []).slice().sort((a, b) => String(b.DibuatPada).localeCompare(a.DibuatPada)), hit = S.data.jawabanJumlah || {};
      return head(ic('quiz') + ' Monitoring PKL', 'Kuisioner Akhir PKL', 'Susun kuisioner, buka di akhir periode PKL, lalu lihat hasilnya. Kuisioner hanya tampil untuk responden saat berstatus Dibuka.',
          '<button class="btn ghost" data-act="ksnTemplat" data-t="siswa">' + ic('person_check') + 'Templat penilaian siswa</button><button class="btn ghost" data-act="ksnTemplat" data-t="aplikasi">' + ic('thumb_up') + 'Templat kepuasan aplikasi</button><button class="btn" data-act="ksnForm">' + ic('add') + 'Buat Kuisioner</button>') +
        (list.length ? '<div class="grid g2">' + list.map(k => {
          const n = hit[k.KuisionerID] || 0, h = harapan(k), qs = tanya(k);
          const stPill = k.Status === 'Dibuka' ? pill('Dibuka', 'ok', true) : k.Status === 'Ditutup' ? pill('Ditutup', 'mute', true) : pill('Draf', 'warn', true);
          return '<div class="card"><div class="card-h"><span class="ic ' + (k.Status === 'Dibuka' ? 'teal' : 'indigo') + '">' + ic('quiz') + '</span><div class="grow"><h3>' + esc(k.Judul) + '</h3><div class="sub">' + qs.length + ' pertanyaan · ' + bagianDari(qs).map(esc).join(', ') + '</div></div>' + stPill + '</div>' +
            '<div class="row wrap gap-s small">' + String(k.Target || '').split(',').filter(Boolean).map(r => '<span class="tag">' + esc(PERAN_LBL[r] || r) + '</span>').join('') + '<span class="tag">' + (k.Mode === 'SISWA' ? 'Menilai tiap siswa' : 'Satu isian per orang') + '</span>' + (k.Periode ? '<span class="tag">Periode ' + esc(k.Periode) + '</span>' : '') +
            (k.Mulai || k.Selesai ? '<span class="tag">' + ic('event') + esc(k.Mulai ? fmtTgl(k.Mulai) : '…') + ' – ' + esc(k.Selesai ? fmtTgl(k.Selesai) : '…') + '</span>' : '') + '</div>' +
            '<div class="row between mt"><span class="small"><b>' + n + '</b> jawaban' + (h ? ' dari ±' + h + ' (' + Math.min(100, Math.round(n / h * 100)) + '%)' : '') + '</span></div><div class="bar mt-s"><i style="width:' + (h ? Math.min(100, Math.round(n / h * 100)) : 0) + '%"></i></div>' +
            '<div class="row wrap gap-s mt">' + (k.Status === 'Dibuka' ? '<button class="btn danger-o sm" data-act="ksnStatus" data-id="' + esc(k.KuisionerID) + '" data-s="Ditutup">' + ic('lock') + 'Tutup</button>' : '<button class="btn sm" data-act="ksnStatus" data-id="' + esc(k.KuisionerID) + '" data-s="Dibuka">' + ic('campaign') + (k.Status === 'Ditutup' ? 'Buka lagi' : 'Buka untuk responden') + '</button>') +
            '<a class="btn sec sm" href="#/kuisioner/hasil/' + esc(k.KuisionerID) + '">' + ic('insights') + 'Hasil</a><button class="btn ghost sm" data-act="ksnForm" data-id="' + esc(k.KuisionerID) + '">' + ic('edit') + 'Ubah</button>' +
            (n ? '' : '<button class="btn ghost sm" data-act="ksnHapus" data-id="' + esc(k.KuisionerID) + '" aria-label="Hapus">' + ic('delete') + '</button>') + '</div></div>';
        }).join('') + '</div>' : '<div class="card empty">' + ic('quiz') + 'Belum ada kuisioner. Mulai dari templat di atas, lalu sesuaikan pertanyaannya.</div>');
    },
    async after(param) {
      if (!/^hasil\//.test(param || '')) return;
      const id = param.split('/')[1], r = await api('kuisioner.hasil', { KuisionerID: id }), box = document.getElementById('ksn-hasil'); if (!box) return;
      if (!r.success) { box.innerHTML = '<div class="card empty">' + esc(r.message) + '</div>'; return; }
      box.innerHTML = hasilHtml(r.data); window._ksnHasil = r.data;
    }
  };
  Act.ksnStatus = async btn => {
    const s = btn.dataset.s, k = (S.data.kuisioner || []).find(x => x.KuisionerID === btn.dataset.id) || {};
    if (s === 'Dibuka' && !(await konfirmasi('Buka <b>' + esc(k.Judul) + '</b> untuk ' + String(k.Target || '').split(',').map(r => PERAN_LBL[r] || r).join(', ') + '? Kuisioner akan langsung tampil di menu dan dashboard mereka.', { ok: 'Buka sekarang' }))) return;
    if (s === 'Ditutup' && !(await konfirmasi('Tutup kuisioner ini? Responden tidak bisa mengisi atau mengubah jawaban lagi. Hasil tetap tersimpan.', { ok: 'Tutup', danger: true }))) return;
    simpan(btn, 'kuisioner.status', { KuisionerID: btn.dataset.id, Status: s });
  };
  Act.ksnHapus = async btn => { if (await konfirmasi('Hapus kuisioner ini?', { danger: true, ok: 'Hapus' })) simpan(btn, 'kuisioner.hapus', { KuisionerID: btn.dataset.id }); };
  Act.ksnTemplat = el => bukaEditor(JSON.parse(JSON.stringify(TEMPLAT[el.dataset.t])));
  Act.ksnForm = el => { const k = el.dataset.id ? (S.data.kuisioner || []).find(x => x.KuisionerID === el.dataset.id) : null; bukaEditor(k ? Object.assign({}, k, { Target: String(k.Target || '').split(','), Pertanyaan: tanya(k) }) : { Target: ['INSTRUKTUR'], Mode: 'UMUM', Pertanyaan: [{ bagian: 'Umum', tipe: 'skala', wajib: true }] }); };

  function bukaEditor(k) {
    const baris = q => '<div class="ksn-row" data-row data-qid="' + esc(q.id || '') + '">' +
      '<input class="input" data-f="bagian" list="dl-bagian" maxlength="60" placeholder="Bagian (mis. Sikap)" aria-label="Bagian" value="' + esc(q.bagian || '') + '">' +
      '<input class="input" data-f="teks" maxlength="300" placeholder="Pertanyaan" aria-label="Pertanyaan" value="' + esc(q.teks || '') + '">' +
      '<select class="input" data-f="tipe" aria-label="Jenis jawaban">' + [['skala', 'Skala 1–5'], ['pilihan', 'Pilihan ganda'], ['teks', 'Isian bebas']].map(o => '<option value="' + o[0] + '"' + ((q.tipe || 'skala') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>' +
      '<input class="input" data-f="opsi" maxlength="600" placeholder="Opsi pilihan, pisah ;" aria-label="Opsi pilihan" value="' + esc((q.opsi || []).join('; ')) + '">' +
      '<label class="check small"><input type="checkbox" data-f="wajib"' + (q.wajib !== false ? ' checked' : '') + '>Wajib</label>' +
      '<button type="button" class="btn ghost xs" data-act="ksnHapusBaris" aria-label="Hapus pertanyaan">' + ic('close') + '</button></div>';
    const bag = [...new Set(['Kompetensi', 'Sikap', 'Disiplin', 'Aplikasi', 'Umum'].concat((k.Pertanyaan || []).map(q => q.bagian).filter(Boolean)))];
    const m = modal({ title: k.KuisionerID ? 'Ubah Kuisioner' : 'Kuisioner Baru', icon: 'quiz', size: 'lg',
      body: (k.KuisionerID && (S.data.jawabanJumlah || {})[k.KuisionerID] ? '<div class="alert warn mb">' + ic('info') + '<div><p class="small">Kuisioner ini sudah memiliki jawaban. Mengubah teks pertanyaan aman; menghapus pertanyaan membuat jawabannya tidak ditampilkan di hasil.</p></div></div>' : '') +
        '<div class="form-grid">' + fld({ name: 'Judul', label: 'Judul', req: true, full: true, value: k.Judul || '', attr: ' maxlength="150"' }) +
        fld({ name: 'Deskripsi', label: 'Petunjuk untuk responden', type: 'textarea', rows: 2, full: true, value: k.Deskripsi || '' }) +
        fld({ name: 'Mode', label: 'Cara mengisi', type: 'select', kosong: false, value: k.Mode || 'UMUM', options: [{ v: 'SISWA', l: 'Menilai tiap siswa (satu isian per siswa)' }, { v: 'UMUM', l: 'Satu isian per orang (mis. kepuasan aplikasi)' }] }) +
        fld({ name: 'Periode', label: 'Periode PKL', type: 'select', value: k.Periode || '', ph: 'Periode aktif', options: [{ v: '1', l: 'Periode 1' }, { v: '2', l: 'Periode 2' }] }) +
        fld({ name: 'Mulai', label: 'Mulai tampil (opsional)', type: 'date', value: k.Mulai || '' }) + fld({ name: 'Selesai', label: 'Batas pengisian (opsional)', type: 'date', value: k.Selesai || '' }) +
        '<div class="field full"><label>Responden</label><div class="cek-chips" data-multi>' + Object.keys(PERAN_LBL).map(r => '<label><input type="checkbox" name="Target" value="' + r + '"' + ((k.Target || []).indexOf(r) > -1 ? ' checked' : '') + '>' + PERAN_LBL[r] + '</label>').join('') + '</div>' +
        '<div class="help">Mode "menilai tiap siswa": Instruktur menilai siswa di DU/DI-nya, Guru menilai siswa bimbingannya, Siswa menilai dirinya sendiri.</div></div></div>' +
        '<div class="row between wrap mt"><b class="small">Pertanyaan</b><span class="xs muted">Pertanyaan dikelompokkan per bagian. Skala 1 = sangat kurang … 5 = sangat baik.</span></div>' +
        '<div class="ksn-list mt-s" id="ksn-list">' + (k.Pertanyaan || []).map(baris).join('') + '</div>' +
        '<button type="button" class="btn ghost sm mt-s" data-act="ksnTambahBaris">' + ic('add') + 'Tambah pertanyaan</button>' +
        '<datalist id="dl-bagian">' + bag.map(b => '<option value="' + esc(b) + '">').join('') + '</datalist><template id="tpl-ksn">' + baris({ tipe: 'skala', wajib: true }) + '</template>',
      foot: '<button class="btn ghost" data-x>Batal</button><button class="btn" data-ok>' + ic('save') + 'Simpan</button>' });
    m.el.querySelector('[data-ok]').onclick = e => {
      const box = m.el.querySelector('.modal-b') || m.el, ambil = n => { const x = box.querySelector('[name=' + n + ']'); return x ? x.value.trim() : ''; };
      const Target = [...box.querySelectorAll('input[name=Target]:checked')].map(x => x.value);
      const Pertanyaan = [...box.querySelectorAll('[data-row]')].map(r => { const g = f => r.querySelector('[data-f=' + f + ']');
        return { id: r.dataset.qid || '', bagian: g('bagian').value.trim(), teks: g('teks').value.trim(), tipe: g('tipe').value, opsi: g('opsi').value.split(';').map(x => x.trim()).filter(Boolean), wajib: g('wajib').checked }; }).filter(q => q.teks);
      if (!ambil('Judul')) { toast('Isi judul kuisioner.', 'warn'); return; }
      if (!Target.length) { toast('Pilih minimal satu kelompok responden.', 'warn'); return; }
      if (!Pertanyaan.length) { toast('Tambahkan minimal satu pertanyaan.', 'warn'); return; }
      const salah = Pertanyaan.findIndex(q => q.tipe === 'pilihan' && q.opsi.length < 2); if (salah > -1) { toast('Pertanyaan ' + (salah + 1) + ': pilihan ganda butuh minimal 2 opsi (pisahkan dengan ;).', 'warn'); return; }
      simpan(e.currentTarget, 'kuisioner.simpan', { KuisionerID: k.KuisionerID || '', Judul: ambil('Judul'), Deskripsi: ambil('Deskripsi'), Mode: ambil('Mode'), Periode: ambil('Periode'), Mulai: ambil('Mulai'), Selesai: ambil('Selesai'), Target, Pertanyaan }, { tutup: m.close });
    };
  }
  Act.ksnTambahBaris = () => { const t = document.getElementById('tpl-ksn'); document.getElementById('ksn-list').appendChild(t.content.cloneNode(true)); };
  Act.ksnHapusBaris = el => { const r = el.closest('[data-row]'); if (document.querySelectorAll('#ksn-list [data-row]').length > 1) r.remove(); else toast('Kuisioner butuh minimal satu pertanyaan.', 'warn'); };

  /* ---------- Hasil ---------- */
  function hasilHtml(d) {
    const k = d.kuisioner, qs = tanya(k), jw = d.jawaban, h = harapan(k), skala = qs.filter(q => q.tipe === 'skala'), bag = bagianDari(skala);
    const rata = (list, q) => { const v = list.map(j => +j.Jawaban[q.id]).filter(x => x >= 1); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; };
    const rataBag = (list, b) => { const v = []; skala.filter(q => (q.bagian || 'Umum') === b).forEach(q => list.forEach(j => { const x = +j.Jawaban[q.id]; if (x >= 1) v.push(x); })); return v.length ? v.reduce((a, c) => a + c, 0) / v.length : 0; };
    const semuaSkala = (() => { const v = []; jw.forEach(j => skala.forEach(q => { const x = +j.Jawaban[q.id]; if (x >= 1) v.push(x); })); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; })();
    const batang = v => '<div class="nilai-bar" title="' + fmt1(v) + ' dari 5"><i style="width:' + Math.round(v / 5 * 100) + '%"></i></div>';
    const ket = v => !v ? '-' : v >= 4.5 ? 'Sangat baik' : v >= 3.5 ? 'Baik' : v >= 2.5 ? 'Cukup' : v >= 1.5 ? 'Kurang' : 'Sangat kurang';
    let html = head(ic('insights') + ' Hasil Kuisioner', esc(k.Judul), esc(String(k.Target || '').split(',').map(r => PERAN_LBL[r] || r).join(', ')) + ' · ' + (k.Mode === 'SISWA' ? 'menilai tiap siswa' : 'satu isian per orang'),
      '<a class="btn ghost" href="#/kuisioner">' + ic('arrow_back') + 'Kembali</a><button class="btn" data-act="ksnEkspor">' + ic('table_view') + 'Ekspor Excel</button>') +
      '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">' +
      [['Jawaban masuk', jw.length + (h ? ' / ' + h : ''), 'how_to_reg'], ['Tingkat respons', h ? Math.min(100, Math.round(jw.length / h * 100)) + '%' : '-', 'percent'], ['Rata-rata skala', semuaSkala ? fmt1(semuaSkala) + ' / 5' : '-', 'star'], ['Kategori', ket(semuaSkala), 'military_tech']]
        .map(x => '<div class="card tight"><div class="stat-lbl">' + ic(x[2]) + ' ' + x[0] + '</div><div class="big-score" style="font-size:26px">' + esc(x[1]) + '</div></div>').join('') + '</div>';
    if (!jw.length) return html + '<div class="card empty mt">' + ic('hourglass_empty') + 'Belum ada jawaban.</div>';
    if (bag.length) html += '<div class="card mt"><div class="card-h"><h3 class="grow">Rata-rata per bagian</h3><span class="xs muted">Skala 1–5</span></div>' + bag.map(b => { const v = rataBag(jw, b); return '<div class="ksn-bag"><span class="b small">' + esc(b) + '</span>' + batang(v) + '<span class="mono">' + fmt1(v) + '</span><span class="xs muted">' + ket(v) + '</span></div>'; }).join('') + '</div>';
    if (k.Mode === 'SISWA') {
      const per = {}; jw.forEach(j => (per[j.NIS] = per[j.NIS] || []).push(j));
      html += '<div class="card mt"><div class="card-h"><h3 class="grow">Per siswa</h3><span class="xs muted">' + Object.keys(per).length + ' siswa dinilai</span></div><div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Siswa</th><th>DU/DI</th><th>Penilai</th>' + bag.map(b => '<th class="num">' + esc(b) + '</th>').join('') + '<th class="num">Rata-rata</th>' +
        qs.filter(q => q.tipe === 'pilihan').map(q => '<th>' + esc(q.teks) + '</th>').join('') + '</tr></thead><tbody>' +
        Object.keys(per).sort((a, b) => nmSiswa(a).localeCompare(nmSiswa(b))).map(n => { const l = per[n], vs = bag.map(b => rataBag(l, b)), tot = (() => { const v = []; l.forEach(j => skala.forEach(q => { const x = +j.Jawaban[q.id]; if (x >= 1) v.push(x); })); return v.length ? v.reduce((a, c) => a + c, 0) / v.length : 0; })();
          return '<tr><td><b class="small">' + esc(nmSiswa(n)) + '</b><div class="xs muted">' + esc(n) + '</div></td><td class="small">' + esc(nmDudi((penOf(n, k.Periode) || {}).DUDIID)) + '</td><td class="xs">' + l.map(j => esc(j.Responden) + ' (' + esc(PERAN_LBL[j.Peran] || j.Peran) + ')').join('<br>') + '</td>' +
            vs.map(v => '<td class="num">' + (v ? fmt1(v) : '-') + '</td>').join('') + '<td class="num b">' + (tot ? fmt1(tot) : '-') + '</td>' + qs.filter(q => q.tipe === 'pilihan').map(q => '<td class="small">' + l.map(j => esc(j.Jawaban[q.id] || '-')).join('<br>') + '</td>').join('') + '</tr>'; }).join('') + '</tbody></table></div></div>';
    }
    html += '<div class="card mt"><div class="card-h"><h3 class="grow">Per pertanyaan</h3></div>' + qs.map((q, i) => {
      const isi = jw.filter(j => j.Jawaban[q.id] !== undefined && j.Jawaban[q.id] !== '');
      let body = '';
      if (q.tipe === 'skala') {
        const dist = [1, 2, 3, 4, 5].map(x => isi.filter(j => +j.Jawaban[q.id] === x).length), tot = Math.max(isi.length, 1), v = rata(jw, q);
        body = '<div class="row wrap" style="gap:12px"><span class="mono b">' + fmt1(v) + '</span><div class="dist" role="img" aria-label="Sebaran jawaban 1 sampai 5">' + dist.map((c, x) => c ? '<i class="s' + (x + 1) + '" style="flex:' + c + '" title="' + (x + 1) + ' · ' + SKALA[x] + ': ' + c + '">' + (c / tot >= 0.08 ? c : '') + '</i>' : '').join('') + '</div><span class="xs muted">' + isi.length + ' jawaban</span></div>';
      } else if (q.tipe === 'pilihan') {
        const tot = Math.max(isi.length, 1);
        body = (q.opsi || []).map(o => { const c = isi.filter(j => j.Jawaban[q.id] === o).length; return '<div class="ksn-bag"><span class="small">' + esc(o) + '</span><div class="nilai-bar"><i style="width:' + Math.round(c / tot * 100) + '%"></i></div><span class="mono">' + c + '</span><span class="xs muted">' + Math.round(c / tot * 100) + '%</span></div>'; }).join('');
      } else body = isi.length ? '<div class="ksn-teks">' + isi.slice(0, 80).map(j => '<blockquote><p>' + esc(j.Jawaban[q.id]) + '</p><cite>' + esc(j.Responden) + (j.NIS ? ' · tentang ' + esc(nmSiswa(j.NIS)) : '') + '</cite></blockquote>').join('') + '</div>' : '<span class="small muted">Belum ada isian.</span>';
      return '<div class="ksn-hq"><div class="b small"><span class="aspek-no">' + (i + 1) + '</span> ' + esc(q.teks) + ' <span class="xs muted">· ' + esc(q.bagian || 'Umum') + '</span></div>' + body + '</div>';
    }).join('') + '<div class="row wrap gap-s mt xs muted"><span>Sebaran skala:</span>' + SKALA.map((l, x) => '<span class="row gap-s"><i class="dist-key s' + (x + 1) + '"></i>' + (x + 1) + ' ' + l + '</span>').join('') + '</div></div>';
    return html;
  }
  Act.ksnEkspor = () => {
    const d = window._ksnHasil; if (!d) return;
    const qs = tanya(d.kuisioner);
    const baris = d.jawaban.map(j => { const o = { Responden: j.Responden, Peran: PERAN_LBL[j.Peran] || j.Peran }; if (d.kuisioner.Mode === 'SISWA') { o.NIS = j.NIS; o.Siswa = nmSiswa(j.NIS); o['DU/DI'] = nmDudi((penOf(j.NIS, d.kuisioner.Periode) || {}).DUDIID); }
      qs.forEach((q, i) => (o[(i + 1) + '. ' + q.teks] = j.Jawaban[q.id] === undefined ? '' : j.Jawaban[q.id])); o['Dikirim'] = j.DikirimPada; o['Diperbarui'] = j.DiperbaruiPada; return o; });
    const ringkas = qs.filter(q => q.tipe === 'skala').map(q => { const v = d.jawaban.map(j => +j.Jawaban[q.id]).filter(x => x >= 1); const o = { Bagian: q.bagian, Pertanyaan: q.teks, Jumlah: v.length, 'Rata-rata': v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 100) / 100 : '' }; [1, 2, 3, 4, 5].forEach(x => (o['Skor ' + x] = v.filter(y => y === x).length)); return o; });
    eksporXlsx({ Jawaban: baris, Ringkasan: ringkas }, 'Kuisioner - ' + d.kuisioner.Judul);
  };
})();
