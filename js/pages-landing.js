/* SIGAPKL · Tampilan Landing (v2.0) — Beranda, Petunjuk, Data, Absensi, Monev 1/2 untuk Siswa, Guru & Instruktur; Kabar & Dokumentasi */
(function () {
  'use strict';
  const peran = () => Sesi.peran, ref = () => Sesi.me.ref;
  const depan = n => String(n || '').replace(/^(Bpk\.|Ibu|Ir\.|Dr\.|Drs\.)\s*/i, '').split(/\s+/)[0] || '';
  const siswaGuru = () => (window.siswaBimbinganGuru ? window.siswaBimbinganGuru() : []);
  const siswaIns = () => S.data.siswa.filter(s => penOf(s.NIS, periodeAktif()) || penOf(s.NIS));
  /** Siswa yang menjadi tanggung jawab pengguna saat ini */
  function daftarSiswa() {
    if (peran() === 'SISWA') return [S.ix.siswa[ref()] || { NIS: ref(), Nama: Sesi.me.nama }];
    return peran() === 'GURU' ? siswaGuru() : siswaIns();
  }
  const kunciPesan = () => (S.data.pesan || []).filter(p => peran() === 'GURU' ? p.Status === 'Baru' : false).length;

  /* ============================== KABAR (Beranda) ============================== */
  const fotoUrl = (f, w) => driveImg('https://drive.google.com/file/d/' + f.id + '/view', w || 800);
  const fotoDari = k => { try { const a = JSON.parse(k.Foto || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  const labelSasaran = k => k.Target === 'SEMUA' ? 'Semua pengguna' : k.Target === 'PILIHAN' ? 'Siswa terpilih' + (k.JumlahSasaran ? ' (' + k.JumlahSasaran + ')' : '') : 'Siswa bimbingan' + (k.JumlahSasaran ? ' (' + k.JumlahSasaran + ')' : '');
  const labelPeran = { ADMIN: 'Admin', GURU: 'Guru Pembimbing', INSTRUKTUR: 'Instruktur' };
  const waktuRel = s => {
    const d = tglObj(s); if (!d) return '';
    const m = Math.round((Date.now() - d.getTime()) / 60000);
    if (m < 1) return 'baru saja'; if (m < 60) return m + ' menit lalu'; if (m < 1440) return Math.round(m / 60) + ' jam lalu'; if (m < 10080) return Math.round(m / 1440) + ' hari lalu';
    return fmtTgl(s);
  };
  function kartuKabar(k, admin) {
    const fo = fotoDari(k), milik = k.Milik === 'YA', sembunyi = k.Status === 'Sembunyi';
    const aksi = (milik || admin) ? '<div class="kb-aksi">' +
      (admin ? '<button class="icon-btn sm" title="' + (k.Sematkan === 'YA' ? 'Lepas sematan' : 'Sematkan di atas') + '" data-act="kabarSemat" data-id="' + esc(k.KabarID) + '" data-v="' + (k.Sematkan === 'YA' ? '0' : '1') + '">' + ic('push_pin', k.Sematkan === 'YA' ? 'fill' : '') + '</button>' +
        '<button class="icon-btn sm" title="' + (sembunyi ? 'Tampilkan lagi' : 'Sembunyikan') + '" data-act="kabarSembunyi" data-id="' + esc(k.KabarID) + '" data-v="' + (sembunyi ? 'Tampil' : 'Sembunyi') + '">' + ic(sembunyi ? 'visibility' : 'visibility_off') + '</button>' : '') +
      (milik ? '<button class="icon-btn sm" title="Ubah" data-act="kabarForm" data-id="' + esc(k.KabarID) + '">' + ic('edit') + '</button>' : '') +
      '<button class="icon-btn sm" title="Hapus" data-act="kabarHapus" data-id="' + esc(k.KabarID) + '">' + ic('delete') + '</button></div>' : '';
    const panjang = String(k.Isi || '').length > 280;
    return '<article class="kb' + (sembunyi ? ' kb-sembunyi' : '') + (k.Sematkan === 'YA' ? ' kb-semat' : '') + '"><div class="kb-h">' + av(k.Pembuat, '', 'av-sm') +
      '<div class="grow"><div class="kb-j">' + (k.Sematkan === 'YA' ? ic('push_pin', 'fill') : '') + esc(k.Judul) + '</div><div class="kb-m">' + esc(k.Pembuat) + ' · ' + esc(labelPeran[k.PeranPembuat] || k.PeranPembuat) + ' · ' + esc(waktuRel(k.DibuatPada)) + '</div>' +
      '<div class="kb-tag">' + pill(labelSasaran(k), k.Target === 'SEMUA' ? 'info' : 'mute') + (sembunyi ? pill('Disembunyikan', 'warn') : '') + (fo.length ? pill(fo.length + ' foto', 'ok') : '') + '</div></div>' + aksi + '</div>' +
      (k.Isi ? '<p class="kb-t' + (panjang ? ' clamp' : '') + '">' + esc(k.Isi) + '</p>' + (panjang ? '<button class="kb-more" data-act="kabarBuka">Selengkapnya</button>' : '') : '') +
      (fo.length ? '<div class="kb-ph n' + fo.length + '">' + fo.map((f, i) => '<button class="kb-img" data-act="kabarFoto" data-id="' + esc(k.KabarID) + '" data-i="' + i + '" aria-label="Lihat foto ' + (i + 1) + '"><img loading="lazy" referrerpolicy="no-referrer" alt="" src="' + esc(fotoUrl(f, fo.length > 1 ? 500 : 900)) + '" onerror="this.parentNode.classList.add(\'rusak\')"></button>').join('') + '</div>' : '') + '</article>';
  }
  function feedKabar(opsi) {
    opsi = opsi || {};
    const list = (S.data.kabar || []).filter(k => opsi.admin || k.Status !== 'Sembunyi'), bisaBuat = peran() !== 'SISWA';
    return '<section class="lp-bag" id="kabar"><div class="lp-bag-h"><div><h2>' + ic('campaign') + ' Kabar & Dokumentasi</h2><p>Informasi dan foto kegiatan dari Guru Pembimbing, Instruktur, dan Admin.</p></div>' +
      (bisaBuat ? '<button class="btn" data-act="kabarForm">' + ic('add_a_photo') + 'Buat Kabar</button>' : '') + '</div>' +
      (list.length ? '<div class="kb-list">' + list.map(k => kartuKabar(k, opsi.admin)).join('') + '</div>' :
        '<div class="card empty">' + ic('photo_library') + '<div>Belum ada kabar.' + (bisaBuat ? ' Tekan <b>Buat Kabar</b> untuk membagikan info atau foto kegiatan.' : '') + '</div></div>') + '</section>';
  }
  Act.kabarBuka = el => { const p = el.previousElementSibling; if (p) { p.classList.remove('clamp'); el.remove(); } };
  Act.kabarFoto = el => {
    const k = (S.data.kabar || []).find(x => x.KabarID === el.dataset.id); if (!k) return;
    const fo = fotoDari(k); let i = +el.dataset.i || 0;
    const m = modal({ title: k.Judul, icon: 'photo_library', size: 'lg', foot: false, body: '<div class="kb-viewer"><button class="icon-btn" data-p aria-label="Sebelumnya">' + ic('chevron_left') + '</button><img alt="" referrerpolicy="no-referrer"><button class="icon-btn" data-n aria-label="Berikutnya">' + ic('chevron_right') + '</button></div><div class="center xs muted mt-s" data-no></div>' + (k.Isi ? '<p class="small mt-s" style="white-space:pre-wrap">' + esc(k.Isi) + '</p>' : '') });
    const img = m.el.querySelector('img'), no = m.el.querySelector('[data-no]');
    const tampil = () => { img.src = fotoUrl(fo[i], 1600); no.textContent = (i + 1) + ' / ' + fo.length; m.el.querySelector('[data-p]').style.visibility = m.el.querySelector('[data-n]').style.visibility = fo.length > 1 ? 'visible' : 'hidden'; };
    m.el.querySelector('[data-p]').onclick = () => { i = (i - 1 + fo.length) % fo.length; tampil(); };
    m.el.querySelector('[data-n]').onclick = () => { i = (i + 1) % fo.length; tampil(); };
    tampil();
  };
  Act.kabarHapus = async el => { if (await konfirmasi('Hapus kabar ini beserta fotonya?', { danger: true, ok: 'Hapus' })) simpan(el, 'kabar.hapus', { KabarID: el.dataset.id }); };
  Act.kabarSemat = el => simpan(el, 'kabar.status', { KabarID: el.dataset.id, Sematkan: el.dataset.v === '1' });
  Act.kabarSembunyi = el => simpan(el, 'kabar.status', { KabarID: el.dataset.id, Status: el.dataset.v });

  /** Kecilkan foto di peramban (maks. sisi 1280 px, JPEG) agar unggahan cepat di sinyal seluler */
  function kecilkan(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file), im = new Image();
      im.onload = () => {
        let sisi = 1280, q = 0.8, out = '';
        for (let t = 0; t < 4; t++) {
          const sk = Math.min(1, sisi / Math.max(im.width, im.height)), c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(im.width * sk)); c.height = Math.max(1, Math.round(im.height * sk));
          const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
          out = c.toDataURL('image/jpeg', q); if (out.length < 1400000) break; sisi = Math.round(sisi * 0.8); q = Math.max(0.5, q - 0.1);
        }
        URL.revokeObjectURL(url); res({ mime: 'image/jpeg', data: out.replace(/^data:[^,]*,/, ''), url: out });
      };
      im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Berkas bukan gambar yang valid.')); };
      im.src = url;
    });
  }
  Act.kabarForm = el => {
    const lama = el && el.dataset && el.dataset.id ? (S.data.kabar || []).find(x => x.KabarID === el.dataset.id) : null, adm = peran() === 'ADMIN';
    const sis = adm ? S.data.siswa : daftarSiswa();
    let fotoLama = lama ? fotoDari(lama) : [], hapus = [], baru = [];
    const pilih = lama && lama.NISList ? lama.NISList.split(',') : [];
    const target = lama ? lama.Target : (adm ? 'SEMUA' : 'BIMBINGAN');
    const m = modal({ title: lama ? 'Ubah Kabar' : 'Buat Kabar', icon: 'campaign', size: 'lg',
      body: '<form id="fm-kabar" novalidate><div class="form-grid">' +
        fld({ name: 'Judul', label: 'Judul', req: true, full: true, value: lama ? lama.Judul : '', ph: 'Contoh: Kunjungan monitoring di PT Maju Jaya' }) +
        fld({ name: 'Isi', label: 'Isi / keterangan', type: 'textarea', rows: 4, full: true, value: lama ? lama.Isi : '', ph: 'Tulis informasi atau keterangan foto…' }) +
        fld({ name: 'Target', label: 'Siapa yang dapat melihat', type: 'select', kosong: false, full: true, value: target,
          options: adm ? [{ v: 'SEMUA', l: 'Semua pengguna' }, { v: 'PILIHAN', l: 'Siswa tertentu saja (dan Guru/Instruktur mereka)' }] : [{ v: 'BIMBINGAN', l: (peran() === 'GURU' ? 'Semua siswa bimbingan saya' : 'Semua siswa di tempat saya') + ' (' + sis.length + ')' }, { v: 'PILIHAN', l: 'Siswa tertentu saja' }] }) +
        '</div><div class="field mt" id="kb-pilih" style="display:none"><label>Pilih siswa</label><div class="kb-siswa">' + (sis.length ? sis.map(s => '<label class="check small"><input type="checkbox" data-multi value="' + esc(s.NIS) + '"' + (pilih.indexOf(s.NIS) > -1 ? ' checked' : '') + '> ' + esc(s.Nama) + ' <span class="xs muted">' + esc(s.Kelas || '') + '</span></label>').join('') : '<span class="muted small">Belum ada siswa.</span>') + '</div></div>' +
        '<div class="field mt"><label>Foto dokumentasi <span class="xs muted">(maks. 4 foto)</span></label><div class="kb-up" id="kb-prev"></div>' +
        '<label class="btn sec" style="cursor:pointer">' + ic('add_photo_alternate') + 'Pilih / ambil foto<input type="file" id="kb-file" accept="image/*" multiple hidden></label><div class="help">Foto otomatis dikecilkan agar cepat terunggah. Pastikan wajah siswa boleh ditampilkan.</div></div>' +
        (adm ? '<label class="check mt"><input type="checkbox" name="Sematkan"' + (lama && lama.Sematkan === 'YA' ? ' checked' : '') + '> Sematkan di bagian atas Beranda</label>' : '') + '</form>',
      foot: '<button class="btn ghost" data-x>Batal</button><button class="btn" data-ok>' + ic('send') + (lama ? 'Simpan' : 'Publikasikan') + '</button>' });
    const sel = m.el.querySelector('[name=Target]'), box = m.el.querySelector('#kb-pilih'), prev = m.el.querySelector('#kb-prev'), file = m.el.querySelector('#kb-file');
    const gantiTarget = () => { box.style.display = sel.value === 'PILIHAN' ? '' : 'none'; };
    sel.onchange = gantiTarget; gantiTarget();
    const gambar = () => {
      prev.innerHTML = fotoLama.map(f => '<div class="kb-th"><img alt="" referrerpolicy="no-referrer" src="' + esc(fotoUrl(f, 200)) + '"><button type="button" class="icon-btn sm" data-lama="' + esc(f.id) + '" aria-label="Hapus foto">' + ic('close') + '</button></div>').join('') +
        baru.map((f, i) => '<div class="kb-th"><img alt="" src="' + f.url + '"><button type="button" class="icon-btn sm" data-baru="' + i + '" aria-label="Hapus foto">' + ic('close') + '</button></div>').join('');
    };
    prev.onclick = e => {
      const l = e.target.closest('[data-lama]'), b = e.target.closest('[data-baru]');
      if (l) { hapus.push(l.dataset.lama); fotoLama = fotoLama.filter(f => f.id !== l.dataset.lama); gambar(); }
      if (b) { baru.splice(+b.dataset.baru, 1); gambar(); }
    };
    file.onchange = async () => {
      for (const f of [...file.files]) {
        if (fotoLama.length + baru.length >= 4) { toast('Maksimal 4 foto per kabar.', 'warn'); break; }
        try { baru.push(await kecilkan(f)); } catch (e) { toast(e.message, 'bad'); }
      }
      file.value = ''; gambar();
    };
    gambar();
    const btn = m.el.querySelector('[data-ok]'), form = m.el.querySelector('#fm-kabar');
    btn.onclick = () => {
      const d = bacaForm(form); if (!d.Judul) { toast('Isi judul kabar.', 'warn'); return; }
      const nis = [...form.querySelectorAll('[data-multi]:checked')].map(c => c.value);
      if (d.Target === 'PILIHAN' && !nis.length) { toast('Pilih minimal satu siswa.', 'warn'); return; }
      simpan(btn, 'kabar.simpan', { KabarID: lama ? lama.KabarID : '', Judul: d.Judul, Isi: d.Isi || '', Target: d.Target, NISList: nis, fotoBaru: baru.map(f => ({ mime: f.mime, data: f.data })), fotoHapus: hapus, Sematkan: adm ? !!d.Sematkan : undefined }, { tutup: m.close });
    };
  };

  /* ============================== Komponen Beranda ============================== */
  const tile = (o) => {
    const isi = '<span class="lp-ti">' + ic(o.i) + '</span><span class="lp-tt"><b>' + esc(o.t) + '</b><small>' + esc(o.s || '') + '</small></span>' + (o.badge ? '<span class="badge ' + (o.warna || '') + '">' + o.badge + '</span>' : '');
    return o.url ? '<a class="lp-tile' + (o.warn ? ' warn' : '') + '" href="' + esc(o.url) + '" target="_blank" rel="noopener">' + isi + '</a>' : '<a class="lp-tile' + (o.warn ? ' warn' : '') + '" href="#/' + o.h + '">' + isi + '</a>';
  };
  const hero = (sapa, sub, chips) => '<section class="lp-hero"><div><div class="lp-eyebrow">' + esc(P('NAMA_SEKOLAH') || 'SIGAPKL – TKJ') + '</div><h1>' + sapa + '</h1><p>' + sub + '</p></div>' + (chips ? '<div class="lp-chips">' + chips + '</div>' : '') + '</section>';
  const chip = (i, v, l) => '<div class="lp-chip">' + ic(i) + '<div><b>' + esc(v) + '</b><small>' + esc(l) + '</small></div></div>';
  const bagTile = (judul, isi) => '<section class="lp-bag"><div class="lp-bag-h"><div><h2>' + judul + '</h2></div></div><div class="lp-tiles">' + isi + '</div></section>';
  const tampilBanner = () => Tema.banner() + (K.bannerKuisioner ? K.bannerKuisioner() : '');
  const tahapLap = nis => { const l = (S.data.laporan || []).find(x => x.NIS === nis); return l && l.Tahap ? l.Tahap : 'BELUM'; };
  const lapSaya = nis => ({ BELUM: 'Belum dikirim', DIPERIKSA: 'Menunggu diperiksa', REVISI: 'Perlu revisi', DISETUJUI: 'Disetujui' })[tahapLap(nis)];
  /** Tile penilaian instruktur dengan status jadwal & jumlah siswa yang belum dinilai */
  const tileJadwal = (h, i, j) => {
    const jd = jadwalNilai(j), per = periodeAktif(), sis = siswaIns(), belum = sis.filter(s => { const p = penOf(s.NIS, per) || penOf(s.NIS) || {}, n = S.ix.nilai[s.NIS + '|' + p.Periode + '|' + j]; if (!n) return true; try { return !!JSON.parse(n.Skor || '{}').draf; } catch (e) { return false; } }).length;
    return tile({ h, i: jd.buka ? i : 'lock', t: j === 'AKHIR' ? 'Penilaian Akhir' : JENIS[j], s: (jd.buka ? (belum ? belum + ' siswa belum dinilai' : 'Semua sudah dinilai') : jd.label) + (jd.mode === 'JADWAL' && jd.buka && jd.selesai ? ' · s.d. ' + fmtTgl(jd.selesai) : ''), badge: jd.buka ? belum : 0, warna: 'amber', warn: jd.buka && !!belum });
  };
  const nilaiMonev = (nis, j) => { if (K.nilaiDitahan(nis)) return 'Tampil setelah ditutup Admin'; const r = rekap(nis); return r.nilai[j] !== undefined ? 'Nilai ' + num(r.nilai[j]) : 'Belum dinilai'; };

  Pages['SISWA:beranda'] = {
    render() {
      const s = S.ix.siswa[ref()] || { Nama: Sesi.me.nama, NIS: ref() }, rk = rekap(s.NIS), pen = rk.pen || {}, jur = S.ix.jurnal[s.NIS + '|' + rk.periode], kn = (S.data.kuisioner || []).length > 0;
      return tampilBanner() + hero('Halo, ' + esc(depan(s.Nama)) + '! 👋', pen.DUDIID ? 'Kamu sedang PKL di <b>' + esc(nmDudi(pen.DUDIID)) + '</b> (Periode ' + esc(pen.Periode) + ': ' + esc(fmtTgl(pen.TglMulai)) + ' – ' + esc(fmtTgl(pen.TglSelesai)) + ').' : 'Penempatan PKL kamu belum diatur. Hubungi Guru Pembimbing atau Admin.',
        chip('how_to_reg', num(rk.persen, 0) + '%', 'Kehadiran') + chip('event_busy', rk.t.A + ' Alfa · ' + rk.t.I + ' Izin', 'Ketidakhadiran') + chip('workspace_premium', K.nilaiDitahan(s.NIS) ? 'Menunggu' : rk.lengkap + '/6', 'Nilai terisi')) +
        (rk.prg.length ? '<div class="alert bad big mb"><span class="ic">' + ic('warning', 'fill') + '</span><div class="grow"><h4>Perhatian kehadiran</h4><p>Batas ' + (rk.prg[0].Jenis === 'ALFA' ? 'Alfa' : 'Izin') + ' sudah tercapai. Segera hubungi Guru Pembimbing.</p></div></div>' : '') +
        bagTile(ic('bolt') + ' Menu Cepat',
          tile({ h: 'absensi', i: 'fact_check', t: 'Absensi', s: 'Kehadiran ' + num(rk.persen, 0) + '%' }) + tile({ h: 'jurnal', i: 'photo_camera', t: 'Jurnal & Foto', s: jur ? 'Folder jurnal tersambung' : 'Tempel link folder jurnal', warn: !jur }) +
          tile({ h: 'monev1', i: 'looks_one', t: 'Monev 1', s: nilaiMonev(s.NIS, 'OBS1') }) + tile({ h: 'monev2', i: 'looks_two', t: 'Monev 2', s: nilaiMonev(s.NIS, 'OBS2') }) +
          tile({ h: 'nilai', i: 'workspace_premium', t: 'Nilai PKL', s: K.nilaiDitahan(s.NIS) ? 'Tampil setelah ditutup Admin' : 'Nilai akhir ' + Math.round(rk.akhir || 0) + ' · ' + rk.predikat }) + tile({ h: 'laporan', i: 'article', t: 'Laporan PKL', s: lapSaya(s.NIS), warn: ['BELUM', 'REVISI'].indexOf(tahapLap(s.NIS)) > -1 }) + tile({ h: 'rapor', i: 'menu_book', t: 'Nilai Rapor', s: 'Rekap nilai rapor' }) + tile({ h: 'kartu', i: 'badge', t: 'Kartu PKL', s: 'Cetak kartu' }) +
          tile({ h: 'dokumen', i: 'description', t: 'Dokumen Saya', s: 'Surat & sertifikat' }) + (kn ? tile({ h: 'kuisioner', i: 'quiz', t: 'Kuisioner', s: 'Isi penilaian akhir', badge: K.kuisionerTertunda ? K.kuisionerTertunda() : 0, warna: 'amber' }) : '')) + feedKabar();
    }
  };
  Pages['GURU:beranda'] = {
    render() {
      const sis = siswaGuru(), nLap = (S.data.laporan || []).filter(l => l.Tahap === 'DIPERIKSA' && sis.some(x => x.NIS === l.NIS)).length, nPrg = S.data.peringatan.filter(p => p.Status === 'Belum ditangani').length, nPsn = S.data.pesan.filter(p => p.Status === 'Baru').length, kn = (S.data.kuisioner || []).length > 0, ej = P('EJURNAL_URL');
      return tampilBanner() + hero('Selamat datang, ' + esc(Sesi.me.nama) + '!', 'Pantau siswa bimbingan, nilai, dan kehadiran dari satu tempat.',
        chip('groups', sis.length, 'Siswa bimbingan') + chip('notification_important', nPrg, 'Peringatan') + chip('emergency', nPsn, 'Pesan baru')) +
        bagTile(ic('bolt') + ' Menu Cepat',
          tile({ h: 'data', i: 'groups', t: 'Data Siswa', s: sis.length + ' siswa bimbingan' }) + tile({ h: 'absensi', i: 'fact_check', t: 'Absensi', s: 'Rekap kehadiran' }) +
          tile({ h: 'monev1', i: 'looks_one', t: 'Monev 1', s: 'Lihat hasil dari instruktur' }) + tile({ h: 'monev2', i: 'looks_two', t: 'Monev 2', s: 'Lihat hasil dari instruktur' }) +
          tile({ h: 'penilaian', i: 'grading', t: 'Penilaian Saya', s: 'Pembimbing, laporan, presentasi' }) + tile({ h: 'bimbingan', i: 'event_note', t: 'Jadwal Bimbingan', s: 'Atur & catat' }) + tile({ h: 'laporan', i: 'article', t: 'Laporan Siswa', s: nLap ? nLap + ' menunggu diperiksa' : 'Progres laporan PKL', badge: nLap, warna: 'amber' }) +
          tile({ h: 'rapor', i: 'menu_book', t: 'Nilai Rapor Siswa', s: 'Lihat rekap' }) + tile({ h: 'peringatan', i: 'notification_important', t: 'Peringatan Kehadiran', s: nPrg ? nPrg + ' perlu ditangani' : 'Tidak ada', badge: nPrg, warna: 'amber' }) +
          tile({ h: 'pesan', i: 'emergency', t: 'Pesan Darurat', s: nPsn ? nPsn + ' belum dibalas' : 'Tidak ada', badge: nPsn }) + tile({ h: 'dokumen', i: 'draw', t: 'Persetujuan Dokumen', s: 'Tanda tangan' }) +
          (kn ? tile({ h: 'kuisioner', i: 'quiz', t: 'Kuisioner', s: 'Isi penilaian akhir', badge: K.kuisionerTertunda ? K.kuisionerTertunda() : 0, warna: 'amber' }) : '') + (ej ? tile({ url: ej, i: 'open_in_new', t: 'E-Jurnal Guru', s: 'Buka aplikasi' }) : '')) + feedKabar();
    }
  };
  Pages['INSTRUKTUR:beranda'] = {
    render() {
      const sis = siswaIns(), belum = S.data.penempatan.filter(p => String(p.Periode) === periodeAktif() && !p.PekerjaanSpesifik).length, nPrg = S.data.peringatan.filter(p => p.Status === 'Belum ditangani').length, kn = (S.data.kuisioner || []).length > 0;
      const ins = S.ix.ins[ref()] || {};
      return tampilBanner() + hero('Selamat datang, ' + esc(Sesi.me.nama) + '!', 'Instruktur di <b>' + esc(nmDudi(ins.DUDIID) || 'DU/DI') + '</b>. Isi absensi dan Monev siswa dengan mudah.',
        chip('groups', sis.length, 'Siswa di tempat Anda') + chip('engineering', belum, 'Pekerjaan belum dipilih') + chip('notification_important', nPrg, 'Izin / alfa')) +
        bagTile(ic('bolt') + ' Menu Cepat',
          tile({ h: 'absensi', i: 'fact_check', t: 'Isi Absensi', s: 'Kehadiran mingguan siswa' }) + tileJadwal('monev1', 'looks_one', 'OBS1') + tileJadwal('monev2', 'looks_two', 'OBS2') +
          tile({ h: 'pekerjaan', i: 'engineering', t: 'Pekerjaan Siswa', s: belum ? belum + ' belum dipilih' : 'Sudah lengkap', badge: belum, warna: 'amber', warn: !!belum }) + tileJadwal('penilaian/-/AKHIR', 'workspace_premium', 'AKHIR') +
          tile({ h: 'peringatan', i: 'notification_important', t: 'Data Izin / Alfa', s: nPrg ? nPrg + ' peringatan' : 'Tidak ada', badge: nPrg, warna: 'amber' }) + tile({ h: 'pesan', i: 'emergency', t: 'Pesan ke Guru / Admin', s: 'Darurat & usulan pekerjaan' }) +
          (kn ? tile({ h: 'kuisioner', i: 'quiz', t: 'Kuisioner', s: 'Isi penilaian akhir', badge: K.kuisionerTertunda ? K.kuisionerTertunda() : 0, warna: 'amber' }) : '')) + feedKabar();
    }
  };
  Pages['ADMIN:kabar'] = {
    render() {
      return head(ic('campaign') + ' Dokumen & Komunikasi', 'Kabar & Dokumentasi', 'Semua kabar dari Admin, Guru, dan Instruktur. Anda dapat menyematkan, menyembunyikan, atau menghapus kabar yang tidak pantas.') + feedKabar({ admin: true });
    }
  };

  /* ============================== Petunjuk ============================== */
  const PETUNJUK = {
    SISWA: {
      judul: 'Petunjuk untuk Siswa', ringkas: 'Ikuti 6 langkah ini selama PKL.',
      langkah: [
        ['home', 'Beranda', 'Lihat kabar dan foto kegiatan dari Guru Pembimbing dan Instruktur. Di sini juga ada tombol cepat ke menu yang sering dipakai.'],
        ['groups', 'Data Saya', 'Cek tempat PKL, instruktur, guru pembimbing, tanggal PKL, dan pekerjaan yang kamu kerjakan. Jika kamu pindah tempat, data periode berikutnya muncul di sini.'],
        ['fact_check', 'Absensi', 'Lihat kehadiran per minggu. Absensi diisi oleh Instruktur, jadi kamu cukup memantau. Jika ada peringatan merah, segera hubungi Guru Pembimbing.'],
        ['photo_camera', 'Jurnal & Foto', 'Tempel link folder jurnal PKL (Google Drive) dan link foto identitas. Cukup sekali, lalu perbarui bila perlu.'],
        ['looks_one', 'Monev 1 dan Monev 2', 'Lembar monitoring & evaluasi dari Instruktur. Nilai tampil setelah Admin menutup penilaian; kamu hanya dapat melihat.'],
        ['workspace_premium', 'Nilai PKL', 'Semua komponen nilai dan nilai akhir PKL. Tampil setelah penilaian selesai dan Admin menutup nilai kamu.'],
        ['menu_book', 'Nilai Rapor', 'Menampilkan rekap nilai rapor. Kamu hanya dapat mengubah bila Admin memberi izin; perubahan menunggu verifikasi Admin.'],
        ['article', 'Laporan PKL', 'Tulis laporan di Google Docs, tempel link-nya di menu Laporan PKL, lalu pantau statusnya: Menunggu diperiksa, Perlu revisi, atau Disetujui.']],
      tanya: [
        ['Lupa kata sandi?', 'Pilih "Lupa sandi" di halaman masuk, lalu hubungi Admin / Koordinator PKL.'],
        ['Absensiku salah, bagaimana?', 'Sampaikan kepada Instruktur atau Guru Pembimbing agar diperbaiki.'],
        ['Aku pindah tempat PKL.', 'Admin akan mengatur penempatan periode berikutnya. Setelah itu Data Saya dan Monev menyesuaikan.'],
        ['Butuh bantuan mendesak?', 'Hubungi Guru Pembimbing lewat WhatsApp dari kartu Data Saya.']] },
    GURU: {
      judul: 'Petunjuk untuk Guru Pembimbing', ringkas: 'Pantau siswa bimbingan dan lakukan penilaian.',
      langkah: [
        ['home', 'Beranda', 'Ringkasan jumlah siswa, peringatan, dan pesan. Bagikan info atau foto kunjungan lewat tombol Buat Kabar; hanya siswa bimbingan (atau yang Bapak/Ibu pilih) yang dapat melihat.'],
        ['groups', 'Data Siswa', 'Daftar siswa bimbingan beserta tempat PKL, kehadiran, jurnal, dan status penilaian. Tekan Detail untuk melihat lengkap.'],
        ['fact_check', 'Absensi', 'Rekap kehadiran seluruh siswa bimbingan. Yang berwarna merah melewati ambang peringatan.'],
        ['looks_one', 'Monev 1 dan Monev 2', 'Melihat hasil monitoring & evaluasi yang diisi Instruktur di tempat PKL. Guru hanya melihat.'],
        ['grading', 'Penilaian Saya', 'Isi nilai Pembimbing, Laporan, dan Presentasi (bila menjadi penguji). Dapat disimpan sebagai draf.'],
        ['event_note', 'Bimbingan & Pesan', 'Atur jadwal bimbingan, tangani peringatan kehadiran, dan balas pesan darurat dari Instruktur.'],
        ['article', 'Laporan Siswa', 'Buka link laporan siswa, tandai Perlu revisi (dengan catatan) atau Disetujui. Nilai Laporan tetap diisi di Penilaian Saya.']],
      tanya: [
        ['Bagaimana membagikan foto kunjungan?', 'Beranda → Buat Kabar → pilih foto → pilih sasaran (semua siswa bimbingan atau siswa tertentu) → Publikasikan.'],
        ['Nilai Monev kosong.', 'Monev diisi oleh Instruktur. Hubungi Instruktur atau kirim pesan lewat Admin.'],
        ['Siapa yang bisa melihat kabar saya?', 'Hanya siswa sasaran, Instruktur mereka, dan Admin.']] },
    INSTRUKTUR: {
      judul: 'Petunjuk untuk Instruktur Lapangan', ringkas: 'Tiga hal utama: absensi, pekerjaan siswa, dan Monev.',
      langkah: [
        ['home', 'Beranda', 'Tombol besar untuk tugas utama. Anda juga dapat membagikan foto kegiatan siswa lewat Buat Kabar.'],
        ['groups', 'Data Siswa', 'Lihat siswa yang magang di tempat Anda, lalu pilih pekerjaan yang mereka kerjakan.'],
        ['fact_check', 'Absensi', 'Isi kehadiran siswa setiap minggu: pilih minggu, tandai Hadir / Izin / Sakit / Alfa, lalu Simpan.'],
        ['looks_one', 'Monev 1', 'Pilih siswa, lalu geser skor atau ketik angka 0–100 untuk tiap aspek. Simpan sebagai draf bila belum selesai.'],
        ['looks_two', 'Monev 2', 'Sama seperti Monev 1, dilakukan pada tahap berikutnya. Jika siswa pindah tempat, Instruktur di tempat baru mengisi lembar untuk periode tersebut.'],
        ['emergency', 'Pesan', 'Ada masalah atau pekerjaan baru yang belum ada di daftar? Kirim pesan ke Guru atau Admin dari menu Pesan di Beranda.']],
      tanya: [
        ['Pekerjaan siswa belum ada di daftar.', 'Kirim usulan lewat Pesan ke Admin; Admin akan menambahkannya ke daftar pekerjaan.'],
        ['Pekerjaan yang dicentang tidak dilakukan siswa.', 'Aspek yang dicentang tetapi tidak dikerjakan akan dinilai. Pilih hanya pekerjaan yang benar-benar dikerjakan.'],
        ['Nilai sudah dikunci.', 'Setelah Admin menutup nilai, lembar tidak dapat diubah. Hubungi Admin bila perlu perbaikan.'],
        ['Monev tidak bisa diisi / ada gembok.', 'Admin/Kajur mengatur jadwal pengisian. Tanggal dibuka tertera di tombol Monev pada Beranda.'],
        ['Saya juga Guru Pembimbing.', 'Jika akun Anda punya dua peran, pilih peran di pojok kanan atas (Guru Pembimbing / Instruktur Lapangan).'],
        ['Lupa kata sandi.', 'Pilih "Lupa sandi" di halaman masuk, lalu hubungi Admin.']] }
  };
  function petunjuk() {
    const p = PETUNJUK[peran()], tambahan = P('PETUNJUK_' + peran());
    return head(ic('help') + ' Bantuan', p.judul, p.ringkas) +
      '<div class="pt-grid">' + p.langkah.map((l, i) => '<div class="pt-card"><div class="pt-no">' + (i + 1) + '</div><div class="pt-ic">' + ic(l[0]) + '</div><h3>' + esc(l[1]) + '</h3><p>' + esc(l[2]) + '</p></div>').join('') + '</div>' +
      (tambahan ? '<div class="alert info mt">' + ic('campaign') + '<div><h4>Catatan dari Admin</h4><p style="white-space:pre-wrap">' + esc(tambahan) + '</p></div></div>' : '') +
      '<section class="lp-bag mt"><div class="lp-bag-h"><div><h2>' + ic('quiz') + ' Pertanyaan yang sering muncul</h2></div></div><div class="pt-faq">' + p.tanya.map(t => '<details><summary>' + esc(t[0]) + '</summary><p>' + esc(t[1]) + '</p></details>').join('') + '</div></section>' +
      '<div class="card mt"><div class="row"><span class="ic teal">' + ic('install_mobile') + '</span><div class="grow"><b>Pasang di layar HP</b><div class="small muted">Buka situs ini di Chrome, tekan titik tiga (⋮), lalu pilih <b>Tambahkan ke layar utama</b>. Setelah itu SIGAPKL dapat dibuka seperti aplikasi.</div></div></div></div>';
  }
  ['SISWA', 'GURU', 'INSTRUKTUR'].forEach(r => { Pages[r + ':petunjuk'] = { render: petunjuk }; });

  /* ============================== Data ============================== */
  Pages['SISWA:data'] = {
    render() {
      const s = S.ix.siswa[ref()] || { Nama: Sesi.me.nama, NIS: ref() }, daftar = (S.ix.pen[s.NIS] || []).slice().sort((a, b) => String(a.Periode).localeCompare(String(b.Periode)));
      const foto = driveImg(s.FotoURL, 300);
      const kartuPen = p => { const g = S.ix.guru[p.GuruID] || {}, ins = S.ix.ins[p.InstrukturID] || {}, d = S.ix.dudi[p.DUDIID] || {}, wa = window.waLink ? window.waLink(g.NoHP) : '';
        return '<div class="card"><div class="card-h"><span class="ic teal">' + ic('apartment') + '</span><div class="grow"><h3>Periode ' + esc(p.Periode) + ' · ' + esc(d.Nama || '-') + '</h3><div class="sub">' + esc(fmtTgl(p.TglMulai)) + ' – ' + esc(fmtTgl(p.TglSelesai)) + '</div></div>' + pillStatus(p.Status || '') + '</div>' +
          '<dl class="kv"><dt>Bidang</dt><dd>' + esc(d.Bidang || '-') + '</dd><dt>Alamat</dt><dd>' + esc(d.Alamat || '-') + '</dd><dt>Instruktur</dt><dd>' + esc(ins.Nama || '-') + (ins.Jabatan ? ' <span class="muted">(' + esc(ins.Jabatan) + ')</span>' : '') + '</dd>' +
          '<dt>Guru Pembimbing</dt><dd>' + esc(g.Nama || '-') + (wa ? ' <a class="pill ok" href="' + esc(wa) + '" target="_blank" rel="noopener">' + ic('chat') + ' WhatsApp</a>' : '') + '</dd><dt>Pekerjaan</dt><dd>' + (p.PekerjaanSpesifik ? K.ringkasPekerjaan(p) : '<span class="muted">Belum dipilih Instruktur</span>') + '</dd></dl></div>'; };
      return head(ic('person') + ' Data Saya', 'Data Saya', 'Identitas, tempat PKL, dan pembimbing.') +
        '<div class="card mb"><div class="row wrap" style="gap:16px">' + (foto ? '<img class="lp-foto" src="' + esc(foto) + '" alt="" referrerpolicy="no-referrer" onerror="this.remove()">' : av(s.Nama, '', 'av-lg')) + '<div class="grow"><h2 style="margin:0">' + esc(s.Nama) + '</h2><div class="muted">NIS ' + esc(s.NIS) + ' · ' + esc(s.Kelas || '') + ' · ' + esc(P('NAMA_SEKOLAH')) + '</div></div><a class="btn sec" href="#/jurnal">' + ic('photo_camera') + 'Jurnal & Foto</a></div></div>' +
        (daftar.length ? '<div class="grid g2">' + daftar.map(kartuPen).join('') + '</div>' : '<div class="card empty">' + ic('apartment') + 'Belum ada penempatan.</div>') +
        bagTile(ic('apps') + ' Lainnya', tile({ h: 'penempatan', i: 'calendar_month', t: 'Penempatan & Jadwal', s: 'Bimbingan & presentasi' }) + tile({ h: 'laporan', i: 'article', t: 'Laporan PKL', s: lapSaya(s.NIS) }) + tile({ h: 'rapor', i: 'menu_book', t: 'Nilai Rapor', s: 'Rekap nilai rapor' }) + tile({ h: 'kartu', i: 'badge', t: 'Kartu PKL', s: 'Cetak kartu' }) + tile({ h: 'dokumen', i: 'description', t: 'Dokumen Saya', s: 'Surat & sertifikat' }) + tile({ h: 'nilai', i: 'workspace_premium', t: 'Nilai PKL', s: 'Rekap semua komponen' }));
    }
  };
  Pages['GURU:data'] = {
    render() { const h = Pages['GURU:siswa'].render(); return h; }
  };
  Pages['INSTRUKTUR:data'] = {
    render() {
      const sis = siswaIns();
      const kartu = s => { const pen = penOf(s.NIS) || {}, rk = rekap(s.NIS), wa = window.waLink ? window.waLink(s.NoHP) : '';
        return '<div class="card lp-sis"><div class="row" style="gap:12px">' + av(s.Nama, s.FotoURL, '') + '<div class="grow"><b style="font-size:16px">' + esc(s.Nama) + '</b><div class="small muted">NIS ' + esc(s.NIS) + ' · ' + esc(s.Kelas || '') + '</div></div>' + (wa ? '<a class="icon-btn" href="' + esc(wa) + '" target="_blank" rel="noopener" aria-label="WhatsApp">' + ic('chat') + '</a>' : '') + '</div>' +
          '<div class="mt-s">' + (pen.PekerjaanSpesifik ? K.ringkasPekerjaan(pen) : '<span class="pill warn">Pekerjaan belum dipilih</span>') + '</div>' +
          '<div class="row wrap mt-s small"><span>' + ic('how_to_reg') + ' Kehadiran <b>' + num(rk.persen, 0) + '%</b></span><span>' + (rk.t.A ? pill(rk.t.A + ' Alfa', 'bad') : '') + '</span><span class="muted">Monev 1: ' + (rk.nilai.OBS1 !== undefined ? '<b>' + num(rk.nilai.OBS1) + '</b>' : '—') + ' · Monev 2: ' + (rk.nilai.OBS2 !== undefined ? '<b>' + num(rk.nilai.OBS2) + '</b>' : '—') + '</span></div>' +
          '<div class="row wrap mt" style="gap:8px"><a class="btn sec sm" href="#/absensi">' + ic('fact_check') + 'Absensi</a><a class="btn sec sm" href="#/monev1/' + esc(s.NIS) + '">' + ic('looks_one') + 'Monev 1</a><a class="btn sec sm" href="#/monev2/' + esc(s.NIS) + '">' + ic('looks_two') + 'Monev 2</a>' +
          (rk.kunci ? '' : '<button class="btn sm" data-act="aturPekerjaan" data-nis="' + esc(s.NIS) + '" data-periode="' + esc(pen.Periode) + '">' + ic('engineering') + (pen.PekerjaanSpesifik ? 'Ubah pekerjaan' : 'Pilih pekerjaan') + '</button>') + '</div></div>'; };
      return head(ic('groups') + ' Data Siswa', 'Siswa di Tempat Anda', 'Pilih pekerjaan siswa, lalu isi absensi dan Monev.') + (sis.length ? '<div class="grid g2">' + sis.map(kartu).join('') + '</div>' : '<div class="card empty">' + ic('group_off') + 'Belum ada siswa.</div>');
    }
  };

  /* ============================== Absensi ============================== */
  Pages['SISWA:absensi'] = {
    render() { return Pages['SISWA:nilai'].render('absensi') + '<div class="mt"><a class="btn sec" href="#/jurnal">' + ic('photo_camera') + 'Buka Jurnal & Foto</a></div>'; }
  };
  Pages['GURU:absensi'] = {
    render() {
      const sis = siswaGuru(), aA = +P('AMBANG_ALFA') || 3;
      const baris = s => { const rk = rekap(s.NIS), pen = rk.pen || {};
        return '<tr class="' + (rk.prg.length ? 'bad-row' : '') + '"><td><div class="who">' + av(s.Nama, s.FotoURL) + '<div><div class="n">' + esc(s.Nama) + '</div><div class="s">' + esc(nmDudi(pen.DUDIID)) + '</div></div></div></td><td class="num">' + rk.t.H + '</td><td class="num">' + rk.t.I + '</td><td class="num">' + rk.t.S + '</td><td class="num">' + (rk.t.A >= aA ? '<b style="color:var(--rose-700)">' + rk.t.A + '</b>' : rk.t.A) + '</td><td class="num"><b>' + num(rk.persen, 0) + '%</b></td><td class="right"><button class="btn ghost xs" data-act="detailSiswa" data-nis="' + esc(s.NIS) + '">Detail</button></td></tr>'; };
      return head(ic('fact_check') + ' Absensi', 'Rekap Kehadiran Siswa Bimbingan', 'Absensi diisi oleh Instruktur. Baris merah melewati ambang peringatan.') +
        '<div class="card flush">' + (sis.length ? '<div class="tbl-wrap" style="border:0"><table class="tbl"><thead><tr><th>Siswa</th><th class="num">Hadir</th><th class="num">Izin</th><th class="num">Sakit</th><th class="num">Alfa</th><th class="num">%</th><th></th></tr></thead><tbody>' + sis.map(baris).join('') + '</tbody></table></div>' : '<div class="empty">' + ic('group_off') + 'Belum ada siswa bimbingan.</div>') + '</div>';
    }
  };

  /* ============================== Monev 1 & 2 ============================== */
  function monev(jenis) {
    const slug = jenis === 'OBS1' ? 'monev1' : 'monev2';
    return { render(param) {
      const sis = daftarSiswa(), judul = JENIS[jenis], sub = 'Lembar monitoring & evaluasi di tempat PKL. Jika siswa pindah tempat, lembar diisi Instruktur di tempat baru untuk periode tersebut.';
      if (!sis.length) return head(ic('rate_review') + ' ' + judul, judul, sub) + '<div class="card empty">' + ic('group_off') + 'Belum ada siswa.</div>';
      const [nisP, perP] = String(param || '').split('/'), s = sis.find(x => x.NIS === nisP) || sis[0], mine = peran() === 'SISWA';
      const pens = (S.ix.pen[s.NIS] || []).slice().sort((a, b) => String(a.Periode).localeCompare(String(b.Periode)));
      const pen = (perP && penOf(s.NIS, perP)) || penOf(s.NIS) || pens[0] || {}, rk = rekap(s.NIS, pen.Periode);
      const picker = !mine ? '<div class="card tight mb"><div class="xs b muted mb">PILIH SISWA (' + sis.length + ')</div><div class="row wrap">' + sis.map(x => { const r2 = rekap(x.NIS); return '<a class="li" style="min-width:200px;flex:1;max-width:260px;' + (x.NIS === s.NIS ? 'border-color:var(--teal);background:var(--teal-50)' : '') + '" href="#/' + slug + '/' + esc(x.NIS) + '">' + av(x.Nama, x.FotoURL, 'av-xs') + '<div class="grow"><div class="b small">' + esc(x.Nama) + '</div><div class="xs muted">' + (r2.nilai[jenis] !== undefined ? 'Nilai ' + num(r2.nilai[jenis]) : 'Belum dinilai') + '</div></div></a>'; }).join('') + '</div></div>' : '';
      const periode = pens.length > 1 ? '<div class="seg mb">' + pens.map(p => '<button class="' + (String(p.Periode) === String(pen.Periode) ? 'on' : '') + '" data-act="go" data-href="#/' + slug + '/' + esc(s.NIS) + '/' + esc(p.Periode) + '">Periode ' + esc(p.Periode) + ' · ' + esc(nmDudi(p.DUDIID)) + '</button>').join('') + '</div>' : '';
      const edit = peran() === 'INSTRUKTUR';
      return head(ic('rate_review') + ' ' + judul, judul + ': ' + esc(s.Nama), sub) + picker + periode +
        '<div class="card tight mb"><div class="row wrap" style="gap:10px"><span class="xs b muted">PEKERJAAN</span><div class="grow">' + K.ringkasPekerjaan(pen) + '</div>' + (edit && !rk.kunci ? '<button class="btn ghost sm" data-act="aturPekerjaan" data-nis="' + esc(s.NIS) + '" data-periode="' + esc(pen.Periode) + '">' + ic('engineering') + (pen.PekerjaanSpesifik ? 'Ubah' : 'Pilih pekerjaan') + '</button>' : '') + '</div>' +
        '<div class="row wrap small muted mt-s">' + ic('apartment') + esc(nmDudi(pen.DUDIID)) + ' · ' + ic('date_range') + esc(fmtTgl(pen.TglMulai)) + ' – ' + esc(fmtTgl(pen.TglSelesai)) + ' · Kehadiran ' + num(rk.persen, 0) + '%</div></div>' +
        (!edit ? '<div class="alert info mb">' + ic('visibility') + '<div><p class="small">Lembar ini diisi oleh Instruktur Lapangan. Anda hanya dapat melihat.</p></div></div>' : '') +
        (mine && K.nilaiDitahan(s.NIS, pen.Periode) ? K.infoDitahan() : K.formNilai(s.NIS, pen.Periode, jenis, edit));
    } };
  }
  ['SISWA', 'GURU', 'INSTRUKTUR'].forEach(r => { Pages[r + ':monev1'] = monev('OBS1'); Pages[r + ':monev2'] = monev('OBS2'); });
})();
