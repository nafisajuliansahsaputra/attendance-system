export const SCHOOL = {
  name: "SMK Amaliah 1 & 2 Ciawi",
  shortName: "SMK Amaliah 1 & 2",
  location: "Ciawi, Bogor",
  systemName: "Sistem Absensi Siswa",
  systemDescription: "Sistem absensi RFID dengan verifikasi wajah dan rekap kehadiran sekolah.",
} as const;

export function roleLabel(role: string) {
  switch (role) {
    case "SYSTEM_ADMIN":
      return "Administrator Sistem";
    case "HOMEROOM_TEACHER":
      return "Wali Kelas";
    case "OPERATOR":
      return "Petugas Operator";
    default:
      return role;
  }
}

export function attendanceOutcomeLabel(code: string) {
  switch (code) {
    case "ACCEPTED_ON_TIME":
      return "Hadir · Tepat Waktu";
    case "ACCEPTED_LATE":
      return "Hadir · Terlambat";
    case "UNKNOWN_CARD":
      return "Kartu Tidak Dikenal";
    case "FACE_MISMATCH":
      return "Wajah Tidak Sesuai";
    case "FACE_NOT_DETECTED":
      return "Wajah Tidak Terdeteksi";
    case "FACE_LOW_QUALITY":
      return "Kualitas Wajah Kurang";
    case "FACE_SERVICE_ERROR":
      return "Verifikasi Wajah Bermasalah";
    case "NO_ACTIVE_SESSION":
      return "Tidak Ada Jadwal Aktif";
    case "NOT_ELIGIBLE":
      return "Bukan Peserta Jadwal";
    case "DUPLICATE":
      return "Absensi Sudah Tercatat";
    case "OUTSIDE_SESSION_WINDOW":
      return "Di Luar Waktu Absensi";
    default:
      return code;
  }
}

export function faceStatusLabel(status?: string | null) {
  switch (status) {
    case "match":
    case "MATCH":
      return "Wajah cocok";
    case "mismatch":
    case "MISMATCH":
      return "Wajah tidak cocok";
    case "no_face":
    case "NO_FACE":
      return "Wajah tidak terdeteksi";
    case "low_quality":
    case "LOW_QUALITY":
      return "Kualitas gambar kurang";
    case "error":
      return "Verifikasi bermasalah";
    case "not_required":
      return "Tidak diperlukan";
    case null:
    case undefined:
      return "Menunggu pemeriksaan";
    default:
      return status;
  }
}
