"use client";

export function PrintReportButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white"
    >
      Cetak / Simpan sebagai PDF
    </button>
  );
}
