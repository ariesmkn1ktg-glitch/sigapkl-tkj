/* SIGAPKL · Halaman publik: login, lupa sandi, ganti sandi wajib, akses darurat, verifikasi dokumen */
(function () {
  'use strict';
  let publik = LS.get('sigapkl_publik', null);
  async function muatPublik() {
    const r = await api('publik', {}, { silent: true });
    if (r.success) { publik = r.data.pengaturan; LS.set('sigapkl_publik', publik); }
    return publik || {};
  }
  const pp = k => (publik && publik[k]) || '';
  function logo() { const u = driveImg(pp('LOGO_URL'), 160); return '<div class="auth-logo">' + (u ? '<img src="' + esc(u) + '" alt="Logo" referrerpolicy="no-referrer">' : ic('hub', 'fill') ) + '</div>'; }

  /* ---------- LOGIN ---------- */
  Pages.login = {
    render() {
      const demo = window.__DEMO_AKUN || [];
      return '<div class="auth"><div class="auth-card">' + logo() + '<div class="center-chip"><span class="pill info dot">Portal Monitoring PKL ' + esc(pp('TAHUN_AJARAN') || '') + '</span></div>' +
        '<h1>SIGAPKL – TKJ</h1><p class="tagline">Sistem Informasi Giat Aktivitas Praktik Kerja Lapangan · ' + esc(pp('NAMA_SEKOLAH') || 'Kelas XII TKJ') + '</p>' +
        (Tema.cur && Tema.cur.u && Tema.cfg().ucapanTampil !== false ? '<div class="auth-ucapan"><span>' + ic(Tema.cur.id === 'kemerdekaan' ? 'flag' : 'celebration', 'fill') + esc(Tema.cur.u) + '</span></div>' : '') +
        '<form class="auth-inner" id="f-login" autocomplete="on"><h3 style="font-size:17px">Masuk ke Portal PKL</h3><p class="small muted" style="margin:4px 0 16px">Gunakan NIS (Siswa), NIP/Kode Guru, atau ID Instruktur DUDI Anda.</p>' +
        '<div class="field"><label for="u">Username / ID Pengguna</label><div class="input-ic">' + ic('badge') + '<input class="input" id="u" name="username" autocomplete="username" placeholder="Contoh: 2425001 / 19850101… / ins00001" required></div></div>' +
        '<div class="field"><label for="p">Kata Sandi</label><div class="input-ic">' + ic('lock') + '<input class="input" id="p" name="password" type="password" autocomplete="current-password" placeholder="Masukkan kata sandi" required>' +
        '<span class="ms r" data-act="lihatSandi" role="button" aria-label="Tampilkan sandi">visibility</span></div></div>' +
        '<div class="row between mb"><label class="check small"><input type="checkbox" name="ingat" checked> Ingat sesi ini</label><a href="#/lupa" class="small b" style="color:var(--rose-700)">Lupa sandi? Hubungi Admin</a></div>' +
        '<button class="btn block lg" type="submit">Masuk ke Aplikasi ' + ic('arrow_forward') + '</button></form>' +
        (demo.length ? '<div class="row between mt"><span class="xs b muted">SIMULASI PERAN (DEMO)</span><span class="xs" style="color:var(--amber-700)">Klik untuk mengisi otomatis</span></div><div class="grid g2 mt-s" style="gap:10px">' +
          demo.map(d => '<button class="li" style="text-align:left;cursor:pointer;border:1px solid var(--line)" data-act="isiDemo" data-u="' + esc(d.u) + '" data-p="' + esc(d.p) + '"><div class="grow"><div class="b small">' + esc(d.label) + '</div><div class="xs muted ellipsis">' + esc(d.sub) + '</div></div>' + ic(d.icon || 'person', 'fill') + '</button>').join('') + '</div>' : '') +
        '<div class="alert bad mt" style="background:var(--rose-50)">' + ic('info', 'fill') + '<p class="small">Akun baru memakai <b>sandi sementara</b> dan wajib diganti saat masuk pertama. Belum punya akun? <a href="#/lupa">Hubungi Admin/Koordinator PKL</a>.</p></div>' +
        '</div></div>';
    },
    after() {
      warmUp('pub');
      const adaCache = !!publik;
      muatPublik().then(() => {
        if (App.parse().page !== 'login' || Sesi.token) return;
        if (adaCache) { Tema.sinkron(''); return; }
        // render ulang tanpa menghapus isian yang sudah diketik pengguna
        const u = document.getElementById('u'), pw = document.getElementById('p'), sedang = f.dataset.kirim === '1';
        if (sedang) { Tema.sinkron(''); return; }
        const nilai = { u: u ? u.value : '', p: pw ? pw.value : '', fokus: document.activeElement && document.activeElement.id };
        App.render();
        const u2 = document.getElementById('u'), p2 = document.getElementById('p');
        if (u2) u2.value = nilai.u; if (p2) p2.value = nilai.p; if (nilai.fokus && document.getElementById(nilai.fokus)) document.getElementById(nilai.fokus).focus();
      });
      const f = document.getElementById('f-login');
      f.onsubmit = async e => {
        e.preventDefault(); f.dataset.kirim = '1';
        const d = bacaForm(f), btn = f.querySelector('button[type=submit]');
        await busy(btn, async () => {
          const r = await api('auth.login', { username: d.username, password: d.password });
          if (!r.success) { f.dataset.kirim = ''; toast(r.message, 'bad'); return; }
          Sesi.set(r.data.token, r.data.me);
          if (!d.ingat) { LS.set('sigapkl_sementara', 1); sessionStorage.setItem('sigapkl_tab', '1'); } else LS.del('sigapkl_sementara');
          toast(r.message, 'ok');
          if (r.data.me.wajibGanti) { App.go('#/ganti'); return; }
          const b = await S.load(); if (b.ok) App.go('#/dashboard');
        });
      };
    }
  };
  // sesi "tidak diingat" berakhir saat tab ditutup
  try { if (LS.get('sigapkl_sementara', 0) && !sessionStorage.getItem('sigapkl_tab')) { localStorage.removeItem('sigapkl_sesi'); LS.del('sigapkl_sementara'); } } catch (e) {}
  Act.lihatSandi = el => { const i = el.parentNode.querySelector('input'); i.type = i.type === 'password' ? 'text' : 'password'; el.textContent = i.type === 'password' ? 'visibility' : 'visibility_off'; };
  Act.isiDemo = el => { document.getElementById('u').value = el.dataset.u; document.getElementById('p').value = el.dataset.p; document.getElementById('f-login').requestSubmit(); };

  /* ---------- LUPA SANDI ---------- */
  Pages.lupa = {
    render() {
      return '<div class="auth"><div class="auth-card" style="max-width:640px"><div class="center-chip"><span class="pill info dot">Sistem Informasi PKL SMK</span></div><h1 style="font-size:24px">Pusat Keamanan Akun</h1><p class="tagline">' + esc(pp('NAMA_SEKOLAH') || '') + ' · ' + esc(pp('KOMPETENSI') || 'TKJ') + '</p>' +
        '<div class="row between mb"><span class="pill ok dot">Informasi Keamanan Akun</span><a href="#/login" class="small b">' + ic('arrow_back') + ' Kembali ke login</a></div>' +
        '<h2 style="font-size:26px">Lupa Kata Sandi?</h2><p class="muted" style="margin:6px 0 16px">Kebijakan perlindungan akses portal PKL.</p>' +
        '<div class="alert bad">' + ic('shield_lock', 'fill') + '<div><h4 style="color:var(--text)">Protokol Kebijakan Institusi</h4><p>Reset kata sandi mandiri lewat email ditiadakan demi keamanan data sekolah. Hubungi Koordinator PKL (Kajur TKJ) atau Admin PKL untuk mereset kata sandi menjadi <b>sandi sementara</b>, lalu ganti sendiri setelah masuk.</p></div></div>' +
        '<div class="info-box mt"><div class="t">Akses bantuan langsung</div><div class="row">' + '<span class="avatar" style="width:52px;height:52px">' + ic('support_agent') + '</span><div><div class="b" style="font-size:16px">' + esc(pp('KOORDINATOR_NAMA') || 'Koordinator PKL / Kajur TKJ') + '</div><div class="small muted">' + esc(pp('KOORDINATOR_KONTAK') || 'Ruang Jurusan TKJ') + '</div></div></div></div>' +
        '<div class="alert mt">' + ic('key') + '<div><h4>Sudah menerima sandi sementara?</h4><p>Masuk seperti biasa — sistem akan langsung meminta Anda membuat kata sandi baru (minimal 8 karakter, huruf dan angka).</p></div></div>' +
        '</div></div>';
    },
    after() { if (!publik) muatPublik().then(() => App.render()); }
  };

  /* ---------- GANTI SANDI (wajib & sukarela) ---------- */
  Pages.ganti = {
    render() {
      const wajib = Sesi.me && Sesi.me.wajibGanti;
      return '<div class="auth"><div class="auth-card"><div class="auth-logo">' + ic('password', 'fill') + '</div><h1 style="font-size:24px">' + (wajib ? 'Ganti Sandi Wajib' : 'Ganti Kata Sandi') + '</h1>' +
        '<p class="tagline">' + (wajib ? 'Anda masuk dengan sandi sementara. Buat sandi baru untuk melanjutkan.' : 'Halo, ' + esc(Sesi.me ? Sesi.me.nama : '') + '.') + '</p>' +
        '<form class="auth-inner" id="f-ganti">' + fld({ name: 'lama', label: wajib ? 'Sandi sementara' : 'Sandi lama', type: 'password', req: true, attr: ' autocomplete="current-password"' }) +
        fld({ name: 'baru', label: 'Sandi baru', type: 'password', req: true, attr: ' autocomplete="new-password"', help: 'Minimal 8 karakter, memuat huruf dan angka.' }) +
        '<div class="bar mb" id="kuat"><i style="width:0"></i></div>' + fld({ name: 'ulang', label: 'Ulangi sandi baru', type: 'password', req: true, attr: ' autocomplete="new-password"' }) +
        '<button class="btn block lg" type="submit">' + ic('lock_reset') + 'Simpan Sandi Baru</button>' +
        '<div class="row between mt">' + (wajib ? '<span></span>' : '<a href="#/dashboard" class="small b">Batal</a>') + '<button type="button" class="link-btn small" data-act="logoutLangsung">Keluar</button></div></form></div></div>';
    },
    after() {
      const f = document.getElementById('f-ganti'), kuat = document.querySelector('#kuat i');
      f.baru.addEventListener('input', () => { const v = f.baru.value; let s = 0; if (v.length >= 8) s++; if (/[A-Za-z]/.test(v) && /\d/.test(v)) s++; if (v.length >= 12) s++; if (/[^A-Za-z0-9]/.test(v)) s++; kuat.style.width = s * 25 + '%'; kuat.parentNode.className = 'bar mb ' + (s < 2 ? 'rose' : s < 3 ? 'amber' : ''); });
      f.onsubmit = async e => {
        e.preventDefault(); const d = bacaForm(f);
        if (d.baru !== d.ulang) { toast('Ulangi sandi baru tidak sama.', 'warn'); return; }
        await busy(f.querySelector('button[type=submit]'), async () => {
          const r = await api('auth.changePassword', { lama: d.lama, baru: d.baru });
          if (!r.success) { toast(r.message, 'bad'); return; }
          const peran = Sesi.peran; Sesi.set(r.data.token, Object.assign(r.data.me, { peran })); Sesi.peran = peran; Sesi.save();
          toast(r.message, 'ok'); const b = await S.load(); if (b.ok) App.go('#/dashboard');
        });
      };
    }
  };
  Act.logoutLangsung = () => { Sesi.clear(); App.go('#/login'); };

  /* ---------- AKSES DARURAT (tidak ditautkan dari mana pun) ---------- */
  Pages.darurat = {
    render() {
      return '<div class="auth"><div class="auth-card"><div class="auth-logo" style="background:linear-gradient(135deg,#F43F5E,#FB7185)">' + ic('emergency_home', 'fill') + '</div><h1 style="font-size:24px">Akses Darurat</h1>' +
        '<p class="tagline">Hanya untuk pemulihan saat akun Admin tidak bisa dipakai. Setiap percobaan dicatat.</p><form class="auth-inner" id="f-dar">' +
        fld({ name: 'username', label: 'Username darurat', req: true }) + fld({ name: 'password', label: 'Sandi darurat', type: 'password', req: true }) + '<button class="btn danger block lg">Masuk Darurat</button><div class="center mt"><a href="#/login" class="small">Kembali</a></div></form></div></div>';
    },
    after() {
      const f = document.getElementById('f-dar');
      f.onsubmit = async e => { e.preventDefault(); await busy(f.querySelector('button'), async () => { const r = await api('auth.darurat', bacaForm(f)); if (!r.success) { toast(r.message, 'bad'); return; } Sesi.set(r.data.token, r.data.me); const b = await S.load(); if (b.ok) App.go('#/dashboard'); }); };
    }
  };

  /* ---------- VERIFIKASI DOKUMEN (QR) ---------- */
  Pages.verifikasi = {
    render(kode) {
      return '<div class="auth"><div class="auth-card" style="max-width:620px">' + logo() + '<div class="center-chip"><span class="pill info dot">Verifikasi Dokumen Resmi</span></div><h1 style="font-size:24px">Cek Keaslian Dokumen</h1>' +
        '<p class="tagline">Kode: <b class="mono">' + esc(kode || '-') + '</b></p><div id="v-hasil"><div class="skel" style="height:180px"></div></div>' +
        '<div class="center mt"><a href="#/login" class="small">Masuk ke SIGAPKL</a></div></div></div>';
    },
    async after(kode) {
      const box = document.getElementById('v-hasil');
      if (!kode) { box.innerHTML = '<div class="alert warn">' + ic('help') + '<div><h4>Kode kosong</h4><p>Pindai QR pada dokumen untuk membuka halaman ini.</p></div></div>'; return; }
      const r = await api('de.verifikasi', { k: kode });
      if (!r.success) { box.innerHTML = '<div class="alert bad">' + ic('gpp_bad', 'fill') + '<div><h4>Dokumen tidak ditemukan</h4><p>' + esc(r.message) + ' Dokumen mungkin palsu atau kode salah ketik.</p></div></div>'; return; }
      const d = r.data, sah = d.status === 'SAH';
      box.innerHTML = '<div class="alert ' + (sah ? '' : 'bad') + ' big" style="background:' + (sah ? 'var(--teal-100)' : '') + '"><span class="ic ' + (sah ? 'solid' : 'rose') + '">' + ic(sah ? 'verified' : 'block', 'fill') + '</span><div><h4 style="font-size:18px;color:' + (sah ? 'var(--teal-800)' : '') + '">' + (sah ? 'DOKUMEN SAH' : 'DOKUMEN DITARIK') + '</h4><p>' + esc(d.instansi) + '</p></div></div>' +
        '<dl class="kv mt"><dt>Nomor</dt><dd>' + esc(d.nomor) + '</dd><dt>Perihal</dt><dd>' + esc(d.judul) + '</dd><dt>Tanggal terbit</dt><dd>' + esc(fmtWaktu(d.tanggal)) + '</dd></dl>' +
        '<h4 class="mt">Penanda tangan</h4><div class="list mt-s">' + d.penandatangan.map(p => '<div class="li"><span class="ic teal">' + ic('draw') + '</span><div><div class="b">' + esc(p.nama || '-') + '</div><div class="small muted">' + esc(p.jabatan || p.label) + ' · ' + esc(p.metode) + ' · ' + esc(fmtWaktu(p.waktu)) + '</div></div></div>').join('') + '</div>' +
        (d.hashPdf ? '<div class="info-box mt"><div class="t">' + ic('fingerprint') + 'Cek keutuhan berkas PDF</div><p class="small muted" style="margin:0 0 8px">Unggah PDF yang Anda terima; sidik jari dihitung di perangkat Anda (tidak dikirim).</p><input type="file" accept="application/pdf" id="v-pdf" class="input"><div id="v-cek" class="mt-s"></div></div>' : '');
      const inp = document.getElementById('v-pdf');
      if (inp) inp.onchange = async () => {
        const f = inp.files[0]; if (!f) return;
        const h = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await f.arrayBuffer()))).map(b => b.toString(16).padStart(2, '0')).join('');
        document.getElementById('v-cek').innerHTML = h === d.hashPdf ? pill('Berkas ASLI — cocok dengan arsip', 'ok') : pill('Berkas BERBEDA dari arsip (mungkin diubah)', 'bad');
      };
    }
  };
})();
