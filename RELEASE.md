# 🚀 Release Notes — Check-in App

Dokumentasi proses build & rilis APK untuk **Misi 14: Ship It!**

## 📦 Ringkasan Rilis

| Item | Nilai |
|---|---|
| Nama App | Check-in App |
| Package (Android) | `com.mahasiswa.checkinapp` |
| Versi | `1.0.0` (versionCode `1`) |
| Build Profile | `preview` (APK, internal distribution) |
| Link Download APK | `<TEMPEL LINK EAS ARTIFACT DI SINI>` |

> Ganti `com.mahasiswa.checkinapp` di `app.json` dengan reverse-domain milikmu
> sendiri sebelum build, misalnya `com.nama-kamu.checkinapp`.

## 🎨 Aset Icon & Splash

Icon dan splash didesain custom (bukan default Expo), mengikuti brand warna
aplikasi (navy `#0F172A` + hijau `#22C55E`), berbentuk pin lokasi dengan
lensa kamera & checkmark di tengah — merepresentasikan fitur inti app
(selfie + lokasi + check-in berhasil).

| File | Ukuran | Keterangan |
|---|---|---|
| `assets/icon.png` | 1024×1024 | Icon utama (app drawer, iOS) |
| `assets/adaptive-icon.png` | 1024×1024 | Foreground adaptive icon Android (transparan, padding aman) |
| `assets/splash.png` | 1242×1242 | Splash screen saat app dibuka |

## 🛠️ Langkah EAS Build (jalankan sendiri di terminal kamu)

Bagian ini **wajib dijalankan langsung oleh kamu** karena butuh login akun
Expo pribadi — tidak bisa dijalankan dari sisi asisten manapun.

```bash
# 1. Install EAS CLI (sekali saja, global)
npm install -g eas-cli

# 2. Login ke akun Expo kamu
eas login

# 3. Pastikan app jalan normal dulu di Expo Go (WAJIB sebelum build)
npx expo start

# 4. Inisialisasi project EAS -> otomatis isi "extra.eas.projectId" di app.json
eas init

# 5. Jalankan build APK profile "preview"
eas build --platform android --profile preview

# 6. Tunggu sampai status build "FINISHED" di terminal / dashboard expo.dev
#    Lalu download APK dari link yang diberikan (atau dari expo.dev/accounts/.../builds)
```

Setelah `eas build` selesai, kamu akan dapat link seperti:
```
https://expo.dev/artifacts/eas/xxxxxxxxxxxxxxxxxxxxxx.apk
```
Tempel link ini ke bagian **Link Download APK** di atas dan juga di `README.md`.

## 📲 Cara Install APK di HP Android

1. Download file `.apk` dari link EAS di atas (buka link-nya langsung di HP).
2. Kalau muncul peringatan "Install dari sumber tidak dikenal", izinkan
   (Settings → izinkan install dari browser/file manager yang dipakai).
3. Tekan file APK yang sudah terdownload → **Install**.
4. Setelah selesai, buka app dari app drawer — icon & nama **"Check-in App"**
   akan muncul, splash screen custom akan tampil sesaat sebelum app dimuat.
5. Coba fitur check-in (kamera + lokasi) — harus berjalan tanpa Expo Go
   sama sekali.

## ✅ Checklist Bukti (Level 1D & Level 2 — screenshot wajib)

Simpan screenshot berikut ke folder `screenshots/` lalu sudah otomatis
ter-link dari `README.md`:

- [ ] Dashboard EAS menampilkan status build **FINISHED**
- [ ] Dialog instalasi APK di HP
- [ ] Icon app di home screen / app drawer HP (nama "Check-in App", icon custom)
- [ ] App berjalan tanpa frame Expo Go (splash screen + UI penuh)
- [ ] (Opsional) Tampilan versi app di footer UI — hasil Bonus A

## 🔴 Bonus C — Siklus Rilis Kedua (Opsional)

Kalau ingin mengejar bonus, lakukan minimal 1 perubahan UI kecil (misalnya
ubah warna tombol atau tambah teks), lalu:

```bash
# app.json: ubah "version": "1.0.1" dan "android.versionCode": 2
eas build --platform android --profile preview
```

Dokumentasikan perbedaan versi 1.0.0 vs 1.0.1 di README (screenshot before/after).
