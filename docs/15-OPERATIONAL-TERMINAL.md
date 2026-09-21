# Operational Terminal Kiosk

Route production terminal:

```text
/terminal/device
```

Halaman ini berbeda dari `/terminal` recruiter demo dan `/terminal/lab` simulator. Kiosk ini ditujukan untuk laptop/mini PC yang benar-benar terhubung dengan kamera dan reader RFID.

## Arsitektur

```text
RFID reader / Arduino
        |
        v
local device bridge (127.0.0.1:8765)
        |   keeps DEVICE_SECRET local
        v
Next.js device API
        |
        +--> Supabase attendance
        +--> face service
        ^
        |
browser kiosk camera
```

Browser tidak menerima `DEVICE_SECRET`. Secret hanya dibaca oleh proses bridge lokal dari `.env.device`.

## Persiapan

1. Daftarkan terminal dari Dashboard → Perangkat & Terminal.
2. Buat pairing code.
3. Pada laptop terminal buat `.env.device.pairing` lalu jalankan:

```bash
npm run device:pair:env
```

Hasil pairing disimpan di `.env.device`.

4. Jalankan bridge:

```bash
npm run device:bridge:env
```

5. Buka:

```text
https://<domain-attendance>/terminal/device
```

6. Klik **Aktifkan kamera & mulai terminal** dan izinkan akses kamera.

## Reader RFID

### Keyboard-wedge USB reader

Reader yang bekerja seperti keyboard dapat langsung digunakan. UID diketik oleh reader dan diakhiri Enter; kiosk menangkap input tersebut tanpa form manual.

### Arduino / serial reader

Bridge menerima UID melalui:

```http
POST http://127.0.0.1:8765/scan
Content-Type: application/json

{
  "rfidUid": "04:A1:B2:C3:D4",
  "source": "arduino-serial"
}
```

atau melalui stdin:

```text
RFID:04:A1:B2:C3:D4
```

Adapter serial yang membaca Arduino cukup meneruskan UID ke salah satu interface tersebut. Bridge sengaja tidak mengikat repo ke driver serial tertentu agar reader RC522, PN532, USB HID, atau microcontroller lain tetap dapat diganti tanpa mengubah backend absensi.

## Flow layar

```text
IDLE
Tempelkan kartu RFID
  |
  v
RFID TERBACA
Memeriksa identitas + jadwal
  |
  +--> invalid -> warning/rejected -> reset
  |
  v
CAPTURE_FACE
kamera live + identitas siswa
  |
  v
face verify
  |
  +--> low quality/no face -> retry otomatis maksimal 4 kali
  +--> mismatch -> ditolak
  +--> match -> absensi tercatat
  |
  v
reset otomatis ke IDLE
```

Kamera dapat tetap menampilkan preview real-time, tetapi frame hanya dikirim untuk verifikasi setelah kartu RFID valid dan backend membuat verification transaction.

## Heartbeat & status

Bridge mengirim heartbeat setiap 30 detik. Kiosk menampilkan:

- bridge lokal
- koneksi server
- status otorisasi RFID/device
- kamera
- kesiapan face service
- heartbeat terakhir
- kartu RFID terakhir

Dashboard admin tetap menjadi tempat monitoring online/offline, pairing, rotasi credential, revoke, error 24 jam, dan absensi terakhir.

## CORS / custom domain

Secara default bridge menerima browser origin dari `ATTENDANCE_API_URL` serta localhost development. Jika kiosk memakai custom domain berbeda dari API URL, tambahkan ke `.env.device`:

```env
TERMINAL_ALLOWED_ORIGINS=https://attendance.sekolah.sch.id
```

Beberapa origin dapat dipisahkan dengan koma.

## Offline

Versi ini **tidak mengklaim absensi wajah dapat divalidasi penuh tanpa server**. Jika server/internet putus, kiosk menunjukkan status offline dan transaksi baru tidak dianggap sah sampai backend dapat memvalidasi jadwal, identitas, dan wajah.

Untuk true offline attendance diperlukan sinkronisasi lokal data siswa/jadwal/template wajah, local inference, encrypted local store, conflict resolution, dan re-sync. Itu harus dibangun sebagai mode failover tersendiri agar tidak menciptakan absensi palsu atau duplikat.
