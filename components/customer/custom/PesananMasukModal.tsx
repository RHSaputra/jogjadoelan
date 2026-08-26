"use client";

interface PesananMasukModalProps {
  open: boolean;
  onCheck: () => void;
}

export function PesananMasukModal({ open, onCheck }: PesananMasukModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 text-center shadow-xl">
        <h3 className="text-lg font-bold text-gray-900">Pesanan Anda Telah Masuk</h3>
        <p className="mt-3 text-sm text-gray-600">
          Estimasi harga akan segera kami proses pada jam kerja. Selanjutnya
          lakukan pembayaran dengan sejumlah harga dan metode pembayaran yang
          telah Anda pilih sebelumnya.
        </p>
        <button
          type="button"
          onClick={onCheck}
          className="mt-5 rounded-md bg-orange-500 px-6 py-2 text-sm font-bold text-white hover:bg-orange-600"
        >
          Cek Pesanan Saya
        </button>
      </div>
    </div>
  );
}