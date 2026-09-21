# Operational Terminal Kiosk

Route production:

```text
/terminal/device
```

Halaman ini khusus laptop/mini PC yang menjadi terminal absensi fisik. `/terminal` tetap recruiter demo dan `/terminal/lab` tetap simulator.

## Arsitektur

```text
RFID USB / Arduino Serial ─┐
                          ├─> Browser HTTPS /terminal/device
Kamera laptop / USB ──────┘              |
                                         v
                              Next.js production API
                                |              |
                                v              v
                             Supabase      Face Service
```

Tidak ada localhost bridge. Semua service aplikasi berjalan di production. Laptop hanya menjadi endpoint fisik untuk kamera dan reader RFID.

## Pairing

1. Admin buka Dashboard → Perangkat & Terminal.
2. Admin daftarkan terminal dan buat pairing code.
3. Laptop terminal buka `https://<domain-production>/terminal/device`.
4. Masukkan pairing code.
5. Server membuat sesi HttpOnly production.
6. Klik **Aktifkan kamera & mulai terminal**.

Tidak perlu CLI, file env terminal, service background, atau localhost port.

## Reader RFID USB keyboard-wedge

Reader yang bekerja seperti keyboard langsung didukung. Saat kartu ditempel, reader mengetik UID dan Enter. Halaman kiosk menangkap UID tersebut lalu mengirim card scan ke API production.

## Arduino / serial

Gunakan Chrome atau Edge desktop. Pada halaman terminal:

1. Pilih baud rate.
2. Klik **Hubungkan Arduino / Serial**.
3. Pilih COM port dari dialog browser.
4. Arduino mengirim UID sebagai satu baris per kartu, misalnya:

```text
04:A1:B2:C3:D4
```

atau:

```text
RFID:04:A1:B2:C3:D4
```

Web Serial membaca port langsung dari browser. Tidak ada adapter PowerShell atau bridge Node.

## Flow layar

```text
IDLE
Tempelkan kartu RFID
  |
  v
RFID TERBACA
server memeriksa identitas + jadwal
  |
  +--> invalid -> warning/rejected -> reset
  |
  v
CAPTURE_FACE
kamera live + identitas siswa
  |
  v
face verify production
  |
  +--> no face / low quality -> retry otomatis maksimal 4 kali
  +--> mismatch -> ditolak
  +--> match -> absensi tercatat
  |
  v
reset otomatis ke IDLE
```

Frame wajah hanya dikirim setelah kartu valid.

## Status yang ditampilkan

Kiosk menampilkan koneksi server production, status terminal session, kesiapan RFID, kamera, face-service, heartbeat terakhir, identitas siswa, sesi absensi, skor verifikasi jika tersedia, dan UID kartu terakhir.

Dashboard admin tetap menjadi tempat monitoring online/offline, pairing, rotasi session, revoke, error 24 jam, dan absensi terakhir.

## Browser yang disarankan

Chrome atau Microsoft Edge desktop. Keduanya mendukung kamera HTTPS dan Web Serial untuk Arduino/COM port. Reader keyboard-wedge tetap dapat digunakan tanpa Web Serial.

## Offline

Absensi tidak dianggap sah saat server production tidak dapat dihubungi. Sistem sengaja tidak membuat keputusan wajah atau jadwal secara lokal.

Mode offline penuh membutuhkan local inference, encrypted local database, sinkronisasi template/jadwal, conflict resolution, dan re-sync. Itu merupakan failover architecture terpisah dan tidak dicampur dengan runtime production utama.
