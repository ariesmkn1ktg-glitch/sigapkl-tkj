# Panduan Instalasi SIGAPKL-TKJ

Sistem Informasi Giat Aktivitas Praktik Kerja Lapangan — Kelas XII TKJ
Versi 1.4.0 · Backend: Google Apps Script (REST API) · Frontend: GitHub Pages

Panduan ini ditulis untuk Anda yang belum pernah memakai Apps Script maupun GitHub. Ikuti urutannya dari atas ke bawah. Total waktu sekitar 45–60 menit.

---

## Gambaran singkat

Aplikasi terdiri dari dua bagian yang dipasang di dua tempat berbeda:

| Bagian | Isi | Dipasang di |
|---|---|---|
| **Backend** (otak + database) | 7 berkas `.gs` + `appsscript.json` | Google Apps Script (akun Google sekolah) |
| **Frontend** (tampilan) | `index.html`, folder `css/`, folder `js/` | GitHub Pages (gratis) |

Urutannya: **pasang backend dulu → salin URL backend ke frontend → unggah frontend ke GitHub**.

Berkas yang Anda terima:

- `sigapkl-tkj-frontend.zip` → untuk GitHub Pages
- `Kode.gs`, `Auth.gs`, `PKL.gs`, `NotifCRM.gs`, `Migrasi.gs`, `DocEngine.gs`, `DE_QrLib.gs`, `appsscript.json` → untuk Apps Script
- `PANDUAN-INSTALASI.md` → panduan ini

---

## BAGIAN A — Memasang Backend (Google Apps Script)

### A1. Buat proyek

1. Masuk ke akun Google yang akan menjadi **pemilik data** (disarankan akun sekolah/koordinator, bukan akun pribadi siswa).
2. Buka **https://script.google.com** → klik **Proyek baru**.
3. Klik judul "Proyek tanpa judul" di kiri atas → ganti menjadi `SIGAPKL-TKJ Backend`.

### A2. Tampilkan berkas `appsscript.json`

1. Klik ikon **roda gigi (Setelan proyek)** di menu kiri.
2. Centang **"Tampilkan file manifes 'appsscript.json' di editor"**.
3. Kembali ke **Editor** (ikon `< >`). Berkas `appsscript.json` sekarang terlihat.
4. Buka `appsscript.json`, hapus semua isinya, lalu tempel isi berkas `appsscript.json` yang Anda terima. Simpan (Ctrl+S).

### A3. Buat berkas kode — urutan penting

Untuk setiap berkas di bawah: klik **＋** di samping "Berkas" → **Skrip** → ketik nama **tanpa** `.gs` → hapus isi bawaan → tempel isi berkas → Simpan.

| Urutan | Nama berkas di editor | Catatan |
|---|---|---|
| 1 | `Kode` | Berkas `Kode.gs` bawaan sudah ada — cukup ganti isinya |
| 2 | `Auth` | |
| 3 | `PKL` | |
| 4 | `NotifCRM` | |
| 5 | `Migrasi` | |
| 6 | `DocEngine` | |
| 7 | `DE_QrLib` | Lihat langkah A4 |

### A4. (Disarankan) Isi pustaka QR

Pustaka ini membuat QR tanda tangan elektronik di server, terutama untuk **generate dokumen massal**.

1. Buka di browser: `https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js`
2. Ctrl+A → Ctrl+C.
3. Di editor, buka `DE_QrLib` → hapus semua isi → Ctrl+V → Simpan.
4. Buka berkas **`DocEngine`**, lalu di dropdown fungsi (di sebelah tombol Jalankan) pilih **`ujiQr`** → klik **Jalankan**. Log harus menampilkan `✅ QR OK`.

> Fungsi `ujiQr` ada di berkas `DocEngine`, bukan di `DE_QrLib`. Dropdown fungsi hanya menampilkan fungsi dari berkas yang sedang dibuka.
> Bila langkah ini dilewati, QR tetap dibuat di browser ketika Admin/pejabat menekan **Terbitkan**; hanya generate massal yang tidak menyisipkan QR.

### A5. Jalankan setup otomatis

1. Di dropdown fungsi, pilih **`setupAppEnvironment`** → klik **Jalankan**.
2. Muncul jendela izin: **Tinjau izin** → pilih akun Anda → **Lanjutan** → **Buka SIGAPKL-TKJ Backend (tidak aman)** → **Izinkan**.
   (Peringatan "tidak aman" muncul karena skrip ini buatan sendiri, bukan dari Google. Ini normal.)
3. Tunggu hingga log menampilkan `✅ Setup selesai`.

**PENTING — catat dua akun ini sekarang.** Keduanya hanya tampil **sekali** di log:

```
👤 AKUN ADMIN AWAL
   Username : admin
   Sandi    : xxxxxxxxxxxx   (wajib diganti saat login pertama)

🔐 AKSES DARURAT
   Username : darurat
   Sandi    : xxxxxxxxxxxxxxxx
```

- **Akun admin** dipakai sehari-hari. Sandi wajib diganti saat masuk pertama.
- **Akses darurat** dipakai hanya bila semua admin terkunci. Simpan di tempat aman (misalnya dicetak dan disimpan di map kantor). Masuk lewat alamat `…/#/darurat`.

Apa yang dibuat otomatis oleh setup:

| Dibuat otomatis | Lokasi |
|---|---|
| Folder `📁 SIGAPKL-TKJ` + subfolder Dokumen Terbit, Template Dokumen, Ekspor | Google Drive Anda |
| Spreadsheet `🗃️ Database — SIGAPKL-TKJ` dengan semua sheet | Di dalam folder di atas |
| Pengaturan awal (ambang Alfa 3, Izin 5, KKM, bobot nilai, dsb.) | Sheet `Pengaturan` |
| Instrumen penilaian awal | Sheet `Instrumen` |
| Kunci rahasia sesi, ID spreadsheet & folder | **Script Properties** (tidak terlihat di Sheet) |
| Pemicu otomatis: `keepWarm` (1 mnt), `prosesAntrianNotif` (1 mnt), `deProsesAntrean` (5 mnt) | Menu Pemicu |

Setup **aman dijalankan ulang**: ia hanya menambah yang kurang, tidak menghapus data.

### A6. Deploy sebagai Web App

1. Klik **Terapkan (Deploy)** → **Deployment baru**.
2. Klik ikon roda gigi di samping "Pilih jenis" → **Aplikasi web**.
3. Isi:
   - Deskripsi: `v1.0.0`
   - Jalankan sebagai: **Saya (email Anda)**
   - Yang memiliki akses: **Siapa saja (Anyone)**
4. Klik **Terapkan** → salin **URL aplikasi web** yang berakhiran `/exec`.

> "Siapa saja" diperlukan agar halaman di GitHub Pages bisa memanggil backend. Keamanan tetap terjaga karena setiap permintaan wajib membawa token login yang ditandatangani server; tanpa token, data tidak bisa dibaca.

Uji cepat: buka URL tersebut di browser dengan tambahan `?w=1` di belakang. Bila muncul teks JSON berisi `"ok":true`, backend sudah hidup.

---

## BAGIAN B — Menyiapkan Frontend

### B1. Ekstrak ZIP

Ekstrak `sigapkl-tkj-frontend.zip` ke sebuah folder, misalnya `Documents/sigapkl-tkj`. Isinya harus tampak seperti ini:

```
sigapkl-tkj/
├── index.html      ← harus langsung di sini, bukan di dalam subfolder
├── css/
│   └── style.css
├── js/
│   ├── config.js
│   ├── core.js
│   └── pages-*.js
├── PANDUAN-INSTALASI.md
└── README.md
```

> Bila setelah ekstrak `index.html` berada di dalam folder lagi (misalnya `sigapkl-tkj/sigapkl-tkj-frontend/index.html`), gunakan folder **bagian dalam** sebagai folder kerja. Situs akan 404 jika `index.html` tidak berada di akar repository.

### B2. Tempel URL backend

Buka `js/config.js` dengan Notepad (Windows) atau TextEdit (Mac), lalu ganti:

```js
GAS_URL: 'https://script.google.com/macros/s/GANTI_DENGAN_ID_DEPLOYMENT/exec',
```

dengan URL `/exec` dari langkah A6. Simpan.

---

## BAGIAN C — Mengunggah ke GitHub Pages (lewat terminal)

### C1. Pasang Git (sekali saja)

- **Windows**: unduh dari https://git-scm.com/download/win → pasang dengan pilihan bawaan (Next terus). Setelah itu buka **Git Bash** dari menu Start.
- **Mac**: buka **Terminal**, ketik `git --version`. Bila diminta memasang *Command Line Tools*, klik **Install**.

Cek berhasil:

```bash
git --version
```

Atur identitas (sekali saja, ganti dengan nama & email Anda):

```bash
git config --global user.name "Nama Anda"
git config --global user.email "email@anda.com"
```

### C2. Buat akun & repository GitHub

1. Daftar di **https://github.com** (bila belum punya). Catat **username** Anda.
2. Klik **＋** kanan atas → **New repository**.
3. Repository name: `sigapkl-tkj` · pilih **Public** · **jangan** centang "Add a README" → **Create repository**.

### C3. Buat token akses (pengganti sandi)

GitHub tidak menerima sandi akun saat `git push`. Anda perlu **Personal Access Token**:

1. Klik foto profil → **Settings** → paling bawah **Developer settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new token (classic)**.
2. Note: `sigapkl` · Expiration: 90 days (atau sesuai kebutuhan) · centang **repo**.
3. **Generate token** → salin token (`ghp_…`). Token hanya tampil sekali; simpan di tempat aman.

### C4. Push pertama

> **Penting:** perintah `git init` harus dijalankan **di dalam folder hasil ekstrak**, yaitu folder yang berisi langsung `index.html`. Jangan di folder Documents atau Desktop.

Buka terminal / Git Bash, lalu (ganti `USERNAME` dengan username GitHub Anda):

```bash
cd ~/Documents/sigapkl-tkj
ls
```

Pastikan `ls` menampilkan `index.html  css  js …`. Lalu:

```bash
git init
git add .
git commit -m "Rilis pertama SIGAPKL-TKJ"
git branch -M main
git remote add origin https://github.com/USERNAME/sigapkl-tkj.git
git push -u origin main
```

Saat diminta:
- **Username**: username GitHub Anda
- **Password**: tempel **token** dari C3 (layar tidak menampilkan apa pun saat menempel; itu normal, langsung tekan Enter)

### C5. Aktifkan GitHub Pages

1. Di halaman repository: **Settings** → **Pages**.
2. Source: **Deploy from a branch** · Branch: **main** · Folder: **/ (root)** → **Save**.
3. Tunggu 1–3 menit, muat ulang halaman. Alamat situs muncul:
   `https://USERNAME.github.io/sigapkl-tkj/`

### C6. Masukkan alamat situs ke pengaturan aplikasi

1. Buka alamat situs → masuk sebagai `admin` dengan sandi dari A5 → ganti sandi.
2. Menu **Pengaturan** → isi **APP_URL** dengan alamat situs (`https://USERNAME.github.io/sigapkl-tkj`) → Simpan.
   Nilai ini dipakai untuk tautan di pesan WA dan QR verifikasi dokumen.
3. Lengkapi pengaturan sekolah lainnya: nama sekolah, tahun ajaran, periode aktif, koordinator.

---

## BAGIAN D — Mengisi Rahasia (Script Properties)

Semua rahasia disimpan di **Script Properties**, bukan di Sheet atau kode, sehingga tidak bocor walau spreadsheet dibagikan.

| Kunci | Diisi oleh | Cara mengisi |
|---|---|---|
| `SESSION_SECRET`, `SPREADSHEET_ID`, `DRIVE_ROOT_FOLDER_ID`, `FOLDER_*`, `EMERGENCY_*`, `SEQ_*` | **Otomatis** oleh setup | Jangan diubah manual |
| `FONNTE_TOKEN` | Anda | Menu **Pengaturan → Keamanan & Integrasi** atau **Notifikasi → Konfigurasi** |
| `EJURNAL_SPREADSHEET_ID` | Anda | Menu **Pengaturan → Keamanan & Integrasi** |
| `VP_URL`, `VP_KODE_APP`, `VP_KUNCI` | Anda (opsional) | Menu **Pengaturan → Keamanan & Integrasi**, hanya bila sekolah memakai Verifikasi Pusat |

Isian dari dashboard langsung masuk ke Script Properties. Nilai yang sudah tersimpan hanya tampil tersamar (misalnya `abcd••••wxyz`).

---

## BAGIAN E — Modul Tambahan

### E1. Notifikasi WhatsApp (Fonnte)

1. Daftar di **https://fonnte.com**, tambahkan perangkat (nomor WA sekolah), pindai QR dari HP.
2. Salin **token** perangkat.
3. Di aplikasi: **Notifikasi → Konfigurasi** → tempel token → nyalakan saklar **WhatsApp** → **Kirim Tes WA** ke nomor Anda.
4. Atur **matriks event**: pilih kejadian mana yang mengirim WA/email (misalnya peringatan kehadiran ke guru & wali, akun baru, nilai dikunci).
5. **Blast**: kirim pengumuman ke kelompok (siswa / wali / guru / instruktur) per batch 10/20/50. Antrean diproses otomatis tiap menit.

Kontak yang memilih berhenti (opt-out) tidak akan dikirimi blast. Data kontak CRM disinkronkan dari data siswa, wali, guru, instruktur dan DUDI lewat tombol **Sinkron Sekarang** di menu CRM.

### E2. Menarik data dari E-Jurnal

1. Buka spreadsheet E-Jurnal yang sudah ada → salin ID dari alamatnya (bagian antara `/d/` dan `/edit`).
2. Pastikan akun pemilik backend **bisa membuka** spreadsheet itu (minimal akses Lihat).
3. **Pengaturan → Keamanan & Integrasi** → isi `EJURNAL_SPREADSHEET_ID`.
4. Bila nama sheet/kolom E-Jurnal berbeda, ubah pengaturan **EJ_PETA** (format JSON). Contoh bawaan:
   ```json
   {"Siswa":{"sheet":"Siswa","NIS":"NIS","Nama":"Nama","Kelas":"Kelas", ...},
    "Guru":{"sheet":"Guru","NIP":"NIP","Nama":"Nama", ...}}
   ```
   Kiri = nama kolom di SIGAPKL, kanan = nama kolom di E-Jurnal.
5. **Migrasi → Sinkron E-Jurnal** → jalankan pratinjau (dry-run) dulu untuk melihat jumlah data baru/berubah → bila sesuai, **Jalankan**.

E-Jurnal hanya **dibaca**, tidak pernah diubah. Sinkron aman diulang: data yang sama tidak terduplikasi.

### E3. Impor dari Excel/CSV atau aplikasi lama

- **Migrasi → Import Excel/CSV**: unggah berkas `.xlsx`/`.csv` untuk Siswa, Guru, Instruktur, DUDI atau Penempatan. Tekan **Unduh Template** untuk contoh kolom, lalu **Pratinjau** sebelum **Import**.
- **Migrasi → Migrasi App Lama**: isi ID spreadsheet lama → **Pindai (Dry-run)** → **Jalankan Import**. Nama kolom yang mirip (misal "Nama Lengkap" ↔ "Nama") dikenali otomatis.

Saran pindah sistem (cutover):
1. Jalankan migrasi penuh beberapa hari sebelumnya untuk pengecekan.
2. Pada hari-H, umumkan jeda input sebentar → jalankan migrasi sekali lagi (hanya mengambil perubahan) → umumkan alamat baru.
3. Akun pengguna dibuat ulang di aplikasi baru (sandi sementara). Sesi/login dari aplikasi lama tidak ikut pindah.

### E4. Doc Engine (dokumen otomatis)

1. Buat template di **Google Docs/Sheets/Slides** dan simpan di folder `📂 Template Dokumen`.
2. Tulis placeholder dengan kurung kurawal ganda, misalnya:
   ```
   Yang bertanda tangan di bawah ini menerangkan bahwa {{NAMA}} (NIS {{NIS}})
   telah melaksanakan PKL di {{DUDI}} pada {{TGL_MULAI}} s.d. {{TGL_SELESAI}}
   dengan nilai akhir {{NILAI_AKHIR}} ({{PREDIKAT}}).
   ```
3. Placeholder yang **terisi otomatis dari data PKL**:
   `NAMA, NIS, NISN, KELAS, JK, DUDI, ALAMAT_DUDI, KOTA_DUDI, BIDANG_DUDI, PIMPINAN_DUDI, PEKERJAAN, GURU, NIP_GURU, INSTRUKTUR, JABATAN_INSTRUKTUR, PERIODE, TGL_MULAI, TGL_SELESAI, TAHUN_AJARAN, KOMPETENSI, KEHADIRAN, HADIR, IZIN, SAKIT, ALFA, NILAI_OBS1, NILAI_OBS2, NILAI_PEMBIMBING, NILAI_LAPORAN, NILAI_PRESENTASI, NILAI_AKHIR_DUDI, NILAI_AKHIR, PREDIKAT, KOORDINATOR, NIP_KOORDINATOR, FOTO_SISWA, NO`
   Placeholder lain (misalnya `{{PERIHAL}}`, `{{TUJUAN}}`) otomatis menjadi kolom isian di formulir.
4. **Dokumen → Template** → tambahkan ID/URL template → **Pindai** → atur pejabat penanda tangan.
5. **Dokumen → Pejabat**: hubungkan pejabat dengan akun aplikasinya. Setiap pejabat mengatur **PIN 6 digit** sendiri untuk menyetujui dokumen.
6. Hasil terbit memiliki **QR verifikasi**. Siapa pun dapat memindai QR untuk membuka halaman `…/#/v/<kode>` dan memastikan dokumen asli.

### E5. Tema warna & suasana hari peringatan

Menu **Pengaturan → Tema & Suasana Aplikasi** (khusus Admin):

1. **Tema dasar**: pilih salah satu tema siap pakai atau **Warna sendiri** (misalnya warna logo sekolah). Klik tema untuk melihat pratinjau sebelum disimpan.
2. **Hari peringatan**: bila dicentang, warna berganti sendiri pada Hari Kartini, Hardiknas, HUT RI (sebulan penuh di Agustus), Hari Batik, Hari Santri, Sumpah Pemuda, Hari Pahlawan, Hari Guru, Natal dan Tahun Baru, lalu kembali ke tema dasar.
3. **Jadwal khusus**: untuk tanggal yang berubah tiap tahun (Ramadan, Idulfitri) atau acara sekolah. Isi tanggal mulai dan selesai; jadwal ini mengalahkan pengaturan lain.
4. **Hiasan**: setiap tema peringatan punya motif dan siluet khas, misalnya kawung dan mega mendung saat Hari Batik, bendera saat HUT RI, bambu runcing saat Hari Pahlawan, obor saat Sumpah Pemuda, ketupat saat Idulfitri. Motif tampil samar di banner ucapan, kartu sambutan dashboard, menu samping, dan latar halaman login. Hiasan bisa dimatikan dengan satu centang.
5. **Ucapan**: banner ucapan tampil di dashboard semua pengguna dan di halaman login. Pengguna bisa menutupnya untuk hari itu.
6. Tekan **Simpan Tema**. Semua pengguna melihat warna baru saat membuka atau memuat ulang aplikasi.

Warna peringatan (Alfa, nilai terkunci, gagal) sengaja tidak ikut berubah agar maknanya tetap jelas. Untuk warna sendiri, aplikasi memeriksa apakah teks putih masih terbaca dan menyediakan tombol **Gelapkan agar mudah dibaca**.

Untuk aplikasi yang sudah terpasang sebelumnya: perbarui `Kode.gs` dan `PKL.gs`, buat **Versi baru** di Kelola deployment, lalu unggah ulang frontend. Pengaturan tema dibuat otomatis saat pertama kali disimpan; tidak perlu menjalankan setup ulang.

### E6. Pekerjaan spesifik & sub pekerjaan

Pembagian tugas:

| Siapa | Apa yang dilakukan | Di menu |
|---|---|---|
| **Admin** | Menyusun daftar pekerjaan spesifik beserta **sub pekerjaan**, bobot, dan lembar observasi tempat sub itu dinilai (Obs 1 / Obs 2) | **Pekerjaan & Sub** |
| **Instruktur** | Memilih pekerjaan (boleh lebih dari satu) dan sub pekerjaan yang benar-benar dikerjakan tiap siswa | **Pekerjaan Siswa**, atau tombol **Pilih pekerjaan** di halaman Observasi |
| **Admin** (pemantau) | Melihat dan mengoreksi pilihan instruktur bila perlu | **Penempatan Siswa** → tombol ikon pekerjaan |

- Sub pekerjaan yang dicentang instruktur langsung menjadi **aspek penilaian** Lembar Observasi 1 & 2.
- Siswa yang belum dipilihkan pekerjaan, atau pekerjaan yang belum punya sub, dinilai dengan **Indikator Umum** (bisa diubah di kartu paling bawah menu Pekerjaan & Sub).
- Mengganti nama pekerjaan atau sub ikut memperbarui pilihan siswa yang sudah ada. Menghapus pekerjaan tidak menghapus nilai yang sudah tersimpan.
- Setelah nilai siswa **ditutup** Admin, pekerjaannya tidak bisa diubah lagi.

Untuk aplikasi yang sudah terpasang: perbarui `Kode.gs` dan `PKL.gs`, buat **Versi baru**, lalu unggah ulang frontend. Kolom baru di sheet Penempatan dibuat otomatis saat pertama kali dipakai.

### E7. Pesan ke Admin (usulan pekerjaan baru)

- Instruktur membuka **Pesan Darurat → Ke Admin / Koordinator**, lalu memilih kategori: *Usulan pekerjaan spesifik*, *Kendala aplikasi / akun*, *Data siswa / penempatan*, atau *Lainnya*.
- Untuk pekerjaan yang belum ada di daftar, instruktur memakai tombol **Usulkan pekerjaan baru** (di menu Pekerjaan Siswa atau di jendela pilih pekerjaan), lalu mengisi nama pekerjaan dan sub pekerjaannya.
- Admin melihat pesan di **Pesan Darurat → Untuk Admin** (ada angka penanda pesan baru). Admin bisa membalas, menandai selesai, dan untuk usulan cukup menekan **Tambahkan ke Pekerjaan & Sub**: nama dan sub pekerjaan sudah terisi, tinggal atur bobot lalu simpan.
- Balasan Admin tampil di akun instruktur.

### E8. Kuisioner akhir PKL

1. Admin membuka menu **Kuisioner** (bagian Monitoring PKL).
2. Mulai dari templat siap pakai, lalu sesuaikan pertanyaannya:
   - **Templat penilaian siswa**: Instruktur menilai tiap siswa pada bagian *Kompetensi*, *Sikap*, *Disiplin*, ditambah rekomendasi dan catatan.
   - **Templat kepuasan aplikasi**: Siswa, Guru, dan Instruktur menilai aplikasi SIGAPKL-TKJ.
   Atau buat sendiri dengan **Buat Kuisioner**. Jenis jawaban: skala 1–5, pilihan ganda, atau isian bebas.
3. Kuisioner baru berstatus **Draf** dan belum terlihat siapa pun. Di akhir periode PKL, tekan **Buka untuk responden**. Menu **Kuisioner** dan pengingat di dashboard langsung muncul di akun responden. Tanggal mulai dan batas pengisian bisa diatur agar tampil otomatis.
4. Pantau jumlah jawaban di kartu kuisioner, lalu tekan **Hasil** untuk melihat rata-rata per bagian, per siswa, sebaran jawaban per pertanyaan, dan semua masukan tertulis. Tekan **Ekspor Excel** untuk mengunduh semua jawaban.
5. Tekan **Tutup** bila sudah selesai. Hasil tetap tersimpan.

Hasil kuisioner **tidak memengaruhi nilai PKL** siswa; fungsinya sebagai umpan balik dan bahan evaluasi.

Untuk aplikasi yang sudah terpasang: perbarui `Kode.gs` dan `PKL.gs`, buat **Versi baru**, lalu unggah ulang frontend (ada berkas baru `js/pages-kuisioner.js`). Sheet `Kuisioner` dan `JawabanKuisioner` dibuat otomatis saat kuisioner pertama disimpan.

---

## BAGIAN F — Pemeliharaan

### Memperbarui backend

Setelah mengubah kode `.gs`:
**Terapkan → Kelola deployment** → ikon pensil → Versi: **Versi baru** → **Terapkan**.
URL `/exec` **tetap sama**, jadi frontend tidak perlu diubah.

> Jangan memilih "Deployment baru" untuk pembaruan, karena akan menghasilkan URL berbeda.

### Memperbarui frontend

Setelah mengganti berkas di folder kerja:

```bash
cd ~/Documents/sigapkl-tkj
git add .
git commit -m "Perbarui tampilan"
git push
```

Tunggu 1–2 menit. Bila tampilan belum berubah, tekan **Ctrl+Shift+R** (paksa muat ulang). Untuk memastikan semua pengguna mendapat versi baru, naikkan angka versi di `index.html` (misalnya `style.css?v=1.0.0` → `?v=1.0.1`, juga untuk berkas `.js`).

### Fungsi bantu di editor Apps Script

| Fungsi | Gunanya |
|---|---|
| `setupAppEnvironment` | Setup / perbaiki struktur (aman diulang) |
| `cekPerforma` | Menampilkan status cache, jumlah data, waktu respons |
| `cadangkanDatabase` | Membuat salinan spreadsheet ke folder Ekspor |
| `matikanKeepWarm` / `nyalakanKeepWarm` | Mematikan / menyalakan pemanas server |
| `installTriggers` | Memasang ulang pemicu bila terhapus |
| `resetSandiAdmin` | Membuat sandi sementara baru untuk `admin` (lihat log) |
| `resetAksesDarurat` | Membuat sandi darurat baru (lihat log) |
| `rotasiSecretSesi` | Memaksa semua pengguna masuk ulang (misalnya bila ada kebocoran) |

### Catatan kuota

Pemicu `keepWarm` berjalan tiap menit agar aplikasi tetap cepat (respons pertama tidak lambat). Akun Google gratis memiliki kuota waktu pemicu sekitar 90 menit/hari; `keepWarm` memakai sebagian kecil saja. Bila muncul pesan kuota terlampaui, jalankan `matikanKeepWarm` di luar masa PKL aktif, lalu `nyalakanKeepWarm` lagi saat dibutuhkan.

---

## BAGIAN G — Mengatasi Masalah

| Gejala | Penyebab & solusi |
|---|---|
| Situs GitHub Pages **404** | `index.html` tidak di akar repository. Cek di halaman repo: `index.html` harus terlihat langsung, bukan di dalam folder. Pindahkan lalu push ulang. |
| `fatal: not a git repository` | Terminal belum berada di folder kerja. Jalankan `cd` ke folder yang berisi `index.html`. |
| `Authentication failed` saat push | Anda memasukkan sandi akun. Gunakan **token** dari C3 sebagai password. Bila token kedaluwarsa, buat token baru. |
| `remote origin already exists` | Jalankan `git remote set-url origin https://github.com/USERNAME/sigapkl-tkj.git` lalu push lagi. |
| `failed to push … rejected` | Repository GitHub dibuat dengan README. Jalankan `git pull origin main --allow-unrelated-histories` lalu `git push`. |
| Login: "Tidak dapat terhubung ke server" | URL di `js/config.js` salah atau belum diganti, atau akses deploy bukan "Siapa saja". Cek langkah A6 & B2. |
| Perubahan kode backend tidak berlaku | Belum membuat **Versi baru** di Kelola deployment. |
| "Akun terkunci" | Salah sandi 5 kali. Admin membuka di menu **Akun → Reset sandi**. Bila semua admin terkunci, gunakan akses darurat (`#/darurat`) atau `resetSandiAdmin`. |
| WA tidak terkirim | Cek saklar WA aktif, token Fonnte benar, perangkat Fonnte tersambung, dan lihat menu **Notifikasi → Antrean & Riwayat** untuk pesan gagal (bisa dikirim ulang). |
| Sinkron E-Jurnal gagal "tidak bisa dibuka" | Akun pemilik backend belum diberi akses ke spreadsheet E-Jurnal. |
| QR dokumen massal kosong | Pustaka QR belum ditempel (langkah A4). |

---

## Keterbatasan yang perlu diketahui

- Login memakai **username + sandi** yang dikelola Admin; tidak ada login Google. Karena itu pejabat penanda tangan memakai **akun aplikasi + PIN 6 digit**.
- Lupa sandi tidak dikirim lewat email; pengguna menghubungi Admin untuk direset (sesuai kebutuhan di PRD).
- Tanda tangan basah dan stempel DUDI tetap dikerjakan manual pada cetakan.
- Sesi login dari aplikasi lama tidak ikut dimigrasi; pengguna masuk ulang.
- Google Apps Script membatasi sekitar 30 permintaan bersamaan. Aplikasi sudah memakai cache dan penggabungan permintaan sehingga ±100 pengguna bersamaan tetap lancar, tetapi hindari menjalankan migrasi besar pada jam sibuk.
