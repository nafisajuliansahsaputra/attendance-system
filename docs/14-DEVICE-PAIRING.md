# Device Pairing & Operational Lifecycle

## Tujuan

Terminal absensi produksi tidak lagi menerima secret melalui proses manual dari komputer administrator. Administrator mendaftarkan identitas terminal, membuat kode pairing sekali pakai, lalu perangkat mengklaim kode tersebut melalui API.

## Lifecycle

1. Administrator mendaftarkan terminal di `/dashboard/devices`.
2. Administrator membuat kode pairing. Kode berlaku 10 menit dan kode plaintext tidak disimpan di database.
3. Perangkat/bridge mengirim `POST /api/device/v1/pair` dengan kode dan versi protokol.
4. Server membuat secret perangkat baru, menyimpan hanya SHA-256 hash, dan mengembalikan plaintext secret sekali saja kepada perangkat.
5. Perangkat menyimpan `DEVICE_ID`, `DEVICE_SECRET`, dan `DEVICE_PROTOCOL_VERSION` secara lokal.
6. Perangkat mengirim heartbeat berkala ke `POST /api/device/v1/heartbeat`.
7. Card scan dan face verify memakai bearer secret yang sama.
8. Rotasi credential dilakukan dengan pairing ulang. Kode lama dibatalkan ketika kode baru dibuat.
9. `DISABLED` menghentikan akses sementara. `REVOKED` mencabut akses permanen dan menghapus credential aktif.

## Pairing dari Node bridge

Buat file lokal `.env.device.pairing` yang tidak pernah di-commit:

```env
ATTENDANCE_API_URL=https://attendance.example.sch.id
PAIRING_CODE=A12-XXXXX-XXXXX
DEVICE_PROTOCOL_VERSION=v1
DEVICE_HARDWARE_MODEL=Mini PC + Arduino Bridge
DEVICE_FIRMWARE_VERSION=1.0.0
```

Lalu:

```bash
npm run device:pair:env
```

Script menyimpan credential hasil pairing ke `.env.device` dan tidak mencetak plaintext secret ke terminal.

## Header autentikasi setelah pairing

```http
Authorization: Bearer <DEVICE_SECRET>
X-Device-Id: <DEVICE_ID>
X-Protocol-Version: v1
```

## Heartbeat

Perangkat dianjurkan mengirim heartbeat setiap 30-60 detik:

```json
{
  "firmwareVersion": "1.0.0",
  "hardwareModel": "Mini PC + Arduino Bridge",
  "bridgeVersion": "bridge-v1",
  "queueDepth": 0,
  "uptimeSeconds": 3600,
  "localTime": "2026-09-21T12:30:00+07:00"
}
```

Dashboard menganggap terminal online bila ada request terautentikasi dalam 90 detik terakhir.

## Offline queue

Client terminal wajib memberi setiap transaksi `requestId` yang stabil dan unik. Jika koneksi terputus, request disimpan lokal dan dikirim ulang dengan `requestId` yang sama saat koneksi pulih. Backend sudah menggunakan request identity/idempotency pada event dan transaksi absensi agar retry tidak mencatat kehadiran dua kali.

## Security rules

- Pairing code bersifat sekali pakai dan kedaluwarsa.
- Pairing code disimpan sebagai SHA-256 hash.
- Device secret hanya dikembalikan sekali kepada perangkat.
- Database hanya menyimpan hash device secret.
- Rotasi credential mengganti secret secara atomik.
- Disabled/revoked device tidak dapat mengakses device API.
- Pairing, rotasi, status change, dan revoke masuk ke audit log.
- Portal admin tetap dilindungi autentikasi dan `STAFF_PORTAL_ENABLED`.
