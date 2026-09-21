# Device Pairing & Operational Lifecycle

## Tujuan

Terminal laptop sekolah dipasangkan langsung ke server production. Tidak ada bridge localhost, file `.env.device`, atau proses Node lokal yang wajib dijalankan.

Administrator tetap membuat kode pairing sekali pakai dari `/dashboard/devices`. Laptop terminal membuka `/terminal/device`, memasukkan kode tersebut, lalu server membuat sesi terminal HttpOnly yang aman.

## Lifecycle terminal laptop

1. Administrator mendaftarkan terminal di `/dashboard/devices`.
2. Administrator membuat kode pairing. Kode berlaku 10 menit dan plaintext kode tidak disimpan di database.
3. Laptop terminal membuka `/terminal/device` dari domain production.
4. Pengguna memasukkan pairing code langsung di browser.
5. Server mengonsumsi kode pairing dan membuat terminal session acak.
6. Browser menerima session cookie `HttpOnly`, `Secure`, `SameSite=Strict`.
7. JavaScript browser tidak dapat membaca credential sesi.
8. Heartbeat, card scan, dan face verify memakai session cookie yang sama ke API production.
9. Pairing ulang otomatis mencabut sesi terminal sebelumnya.
10. `DISABLED` dan `REVOKED` mencabut sesi terminal aktif.

## Runtime production

Terminal browser memakai endpoint production yang sama:

```text
POST /api/device/v1/browser-pair
POST /api/device/v1/heartbeat
POST /api/device/v1/card-scan
POST /api/device/v1/face-verify
```

Semua database, jadwal, identitas siswa, face profile, verifikasi wajah, audit log, dan keputusan absensi tetap server-authoritative.

## RFID

Reader USB keyboard-wedge bekerja langsung tanpa driver aplikasi tambahan. Reader bertindak seperti keyboard dan mengirim UID diikuti Enter.

Untuk Arduino atau reader serial, terminal menggunakan Web Serial bawaan Chrome/Edge melalui HTTPS. User memilih COM port dari browser dan data UID dibaca langsung oleh halaman `/terminal/device`.

Tidak ada HTTP server di localhost dan tidak ada credential device yang disimpan di JavaScript.

## Kamera

Browser memakai `getUserMedia()` melalui HTTPS. Preview kamera dapat tampil real-time, tetapi frame hanya dikirim ke face-service setelah RFID valid dan backend membuat verification transaction.

## Heartbeat

Terminal mengirim heartbeat setiap 30 detik selama halaman production aktif. Dashboard menganggap perangkat online bila request terautentikasi diterima dalam 90 detik terakhir.

## Headless hardware

Endpoint legacy `POST /api/device/v1/pair` dan header bearer device masih dipertahankan untuk controller headless seperti ESP32/gateway khusus yang tidak menjalankan browser.

Mode headless dan browser terminal saling merotasi credential: jika salah satu dipair ulang, credential runtime sebelumnya dicabut agar hanya runtime terbaru yang aktif.

## Security rules

- Pairing code sekali pakai dan kedaluwarsa 10 menit.
- Pairing code hanya disimpan sebagai SHA-256 hash.
- Browser terminal menggunakan session token acak yang hanya disimpan sebagai hash di database.
- Session token browser dikirim sebagai cookie HttpOnly + Secure + SameSite Strict.
- Session browser berlaku 30 hari dan dapat dirotasi kapan saja.
- Pair ulang mencabut sesi browser lama.
- Disabled/revoked device tidak dapat mengakses device API.
- Pairing, rotasi, status change, dan revoke masuk audit log.
- Portal admin tetap dilindungi autentikasi dan `STAFF_PORTAL_ENABLED`.
