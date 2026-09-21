export type OperationalTerminalTone =
  | "success"
  | "danger"
  | "warning"
  | "neutral";

export function operationalTerminalMessage(code?: string): {
  title: string;
  detail: string;
  tone: OperationalTerminalTone;
} {
  switch (code) {
    case "ACCEPTED_ON_TIME":
      return {
        title: "Absensi berhasil",
        detail: "Kehadiran tercatat tepat waktu.",
        tone: "success",
      };
    case "ACCEPTED_LATE":
      return {
        title: "Absensi berhasil",
        detail: "Kehadiran tercatat sebagai terlambat.",
        tone: "success",
      };
    case "FACE_MISMATCH":
      return {
        title: "Wajah tidak sesuai",
        detail: "Wajah di kamera tidak cocok dengan pemilik kartu RFID.",
        tone: "danger",
      };
    case "FACE_NOT_DETECTED":
      return {
        title: "Wajah belum terdeteksi",
        detail: "Hadap lurus ke kamera dan tetap berada di dalam panduan.",
        tone: "warning",
      };
    case "FACE_LOW_QUALITY":
      return {
        title: "Gambar wajah belum cukup jelas",
        detail: "Perbaiki posisi atau pencahayaan. Sistem akan mencoba kembali.",
        tone: "warning",
      };
    case "FACE_SERVICE_UNAVAILABLE":
    case "FACE_SERVICE_ERROR":
      return {
        title: "Layanan wajah belum siap",
        detail: "Verifikasi wajah tidak dapat diproses saat ini.",
        tone: "danger",
      };
    case "UNKNOWN_CARD":
      return {
        title: "Kartu tidak terdaftar",
        detail: "Gunakan kartu siswa yang sudah terdaftar pada sistem.",
        tone: "warning",
      };
    case "DUPLICATE_ATTENDANCE":
    case "DUPLICATE":
      return {
        title: "Absensi sudah tercatat",
        detail: "Kehadiran untuk sesi ini sudah tersimpan sebelumnya.",
        tone: "neutral",
      };
    case "NO_ACTIVE_SESSION":
      return {
        title: "Tidak ada sesi absensi aktif",
        detail: "Pemindaian dilakukan di luar jadwal absensi yang tersedia.",
        tone: "neutral",
      };
    case "NOT_ELIGIBLE":
      return {
        title: "Siswa tidak termasuk peserta",
        detail: "Siswa tidak menjadi peserta pada sesi absensi ini.",
        tone: "warning",
      };
    case "FACE_PROFILE_MISSING":
    case "FACE_PROFILE_NOT_READY":
      return {
        title: "Profil wajah belum tersedia",
        detail: "Minta petugas mendaftarkan wajah siswa terlebih dahulu.",
        tone: "warning",
      };
    case "INVALID_DEVICE_TIME":
      return {
        title: "Waktu terminal tidak sinkron",
        detail: "Periksa tanggal dan waktu pada komputer terminal.",
        tone: "danger",
      };
    case "DEVICE_NOT_AUTHORIZED":
      return {
        title: "Terminal belum diotorisasi",
        detail: "Pairing ulang terminal dari dashboard administrator.",
        tone: "danger",
      };
    default:
      return {
        title: "Pemindaian belum dapat diproses",
        detail: "Silakan coba lagi atau hubungi petugas jika masalah berulang.",
        tone: "danger",
      };
  }
}

export function isRetryableFaceCode(code?: string) {
  return code === "FACE_NOT_DETECTED" || code === "FACE_LOW_QUALITY";
}

export function isAcceptedAttendanceCode(code?: string) {
  return code === "ACCEPTED_ON_TIME" || code === "ACCEPTED_LATE";
}
