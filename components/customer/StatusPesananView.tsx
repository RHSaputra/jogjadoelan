"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Order,
  OrderTimelineEntry,
  getOrderTimeline,
  getEkspedisiByName,
  formatTanggalJamID,
  formatRangeTanggalID,
  customerKonfirmasiDiterima,
} from "@/lib/orders-storage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Clock,
  CheckCircle2,
  Package,
  Truck,
  PackageCheck,
  Hourglass,
  ExternalLink,
  AlertTriangle,
  Copy,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  order: Order;
  userId: string;
  onChanged?: (next: Order) => void;
}

const STEP_LABEL: Record<OrderTimelineEntry["step"], string> = {
  dibuat: "Pesanan Dibuat",
  dibayar: "Pembayaran Diunggah",
  dikonfirmasi: "Pembayaran Dikonfirmasi",
  diproses: "Pesanan Diproses",
  dikirim: "Pesanan Dikirim",
  sampai: "Pesanan Sampai",
  selesai: "Pesanan Selesai",
  dibatalkan: "Pesanan Dibatalkan",
  kadaluarsa: "Pesanan Kadaluarsa",
};

const STEPS_5: OrderTimelineEntry["step"][] = [
  "dibuat",
  "dikonfirmasi",
  "diproses",
  "dikirim",
  "selesai",
];

function activeStepFromStatus(status: Order["status"]): number {
  switch (status) {
    case "menunggu_pembayaran": return 0;
    case "menunggu_konfirmasi": return 1;
    case "diproses": return 2;
    case "dikirim": return 3;
    case "selesai": return 4;
    default: return 0;
  }
}

function FiveStepBar({ activeIdx }: { activeIdx: number }) {
  return (
    <div className="flex items-center justify-between px-1 py-3">
      {STEPS_5.map((s, i) => {
        const done = i <= activeIdx;
        return (
          <div key={s} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              {i > 0 && (
                <div className={`h-1 flex-1 ${done ? "bg-orange-500" : "bg-zinc-200"}`} />
              )}
              <div
                className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${
                  done ? "bg-orange-500 text-white" : "bg-zinc-200 text-zinc-500"
                }`}
              >
                {done ? <CheckCircle2 size={16} /> : i + 1}
              </div>
              {i < STEPS_5.length - 1 && (
                <div className={`h-1 flex-1 ${i < activeIdx ? "bg-orange-500" : "bg-zinc-200"}`} />
              )}
            </div>
            <span className={`mt-2 text-center text-[10px] leading-tight ${done ? "text-zinc-900 font-medium" : "text-zinc-400"}`}>
              {STEP_LABEL[s]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TimelineDetail({ items }: { items: OrderTimelineEntry[] }) {
  return (
    <ol className="relative ml-3 border-l-2 border-zinc-200">
      {items.map((it, i) => (
        <li key={i} className="ml-4 pb-4 last:pb-0">
          <span className="absolute -left-[7px] mt-1 h-3 w-3 rounded-full bg-orange-500 ring-2 ring-white" />
          <div className="text-sm font-medium text-zinc-900">{it.label}</div>
          {it.sub && <div className="text-xs text-zinc-500">{it.sub}</div>}
          <div className="text-[11px] text-zinc-400">{formatTanggalJamID(it.at)}</div>
        </li>
      ))}
    </ol>
  );
}

/* ============================================================ */
/*                       MAIN COMPONENT                         */
/* ============================================================ */

export function StatusPesananView({ order, userId, onChanged }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const timeline = getOrderTimeline(order);
  const activeIdx = activeStepFromStatus(order.status);

  function copy(text: string) {
    navigator.clipboard?.writeText(text).then(() => toast.success("Disalin"));
  }

  async function handleKonfirmasiDiterima() {
    setBusy(true);
    const next = await customerKonfirmasiDiterima(userId, order.id);
    setBusy(false);
    if (next) {
      toast.success("Terima kasih! Pesanan ditandai selesai.");
      onChanged?.(next);
      router.push(`/akun/ulasan/baru/${order.id}`);
    } else {
      toast.error("Gagal memperbarui status.");
    }
  }

  return (
    <div className="space-y-4">
      {/* === BIG STATUS HEADER (per status) === */}
      {order.status === "menunggu_konfirmasi" && (
        <Card className="border-blue-200 bg-blue-50 p-5 text-center">
          <Hourglass className="mx-auto mb-2 h-12 w-12 text-blue-600" />
          <h2 className="text-lg font-bold text-blue-900">Menunggu Validasi Pembayaran</h2>
          <p className="mt-1 text-sm text-blue-800">
            Bukti transfer kamu sedang diperiksa admin. Proses ±1–2 jam pada jam kerja.
          </p>
        </Card>
      )}

      {order.status === "diproses" && (
        <Card className="border-indigo-200 bg-indigo-50 p-5 text-center">
          <div className="mx-auto mb-2 grid h-14 w-14 place-items-center rounded-full bg-indigo-100">
            <Package className="h-8 w-8 text-indigo-600" />
            <Clock className="-mt-3 ml-7 h-4 w-4 text-indigo-600" />
          </div>
          <h2 className="text-lg font-bold text-indigo-900">Pesanan Sedang Diproses</h2>
          <p className="mt-1 text-sm text-indigo-800">
            Pembayaran telah dikonfirmasi. Admin sedang menyiapkan pesanan kamu.
          </p>
          {order.estimasiProsesHari && (
            <p className="mt-2 text-xs text-indigo-700">
              Estimasi proses: {order.estimasiProsesHari} hari kerja
            </p>
          )}
        </Card>
      )}

      {order.status === "dikirim" && (
        <Card className="border-purple-200 bg-purple-50 p-5 text-center">
          <Truck className="mx-auto mb-2 h-12 w-12 text-purple-600" />
          <h2 className="text-lg font-bold text-purple-900">Pesanan Sedang Dikirim</h2>
          <p className="mt-1 text-sm text-purple-800">
            Paket dalam perjalanan menuju alamat kamu.
          </p>
          {order.estimasiTiba && (
            <p className="mt-2 text-xs font-medium text-purple-800">
              Estimasi tiba pada {formatRangeTanggalID(order.estimasiTiba)}
            </p>
          )}
        </Card>
      )}

      {order.status === "selesai" && !order.konfirmasiDiterimaAt && (
        <Card className="border-emerald-200 bg-emerald-50 p-5 text-center">
          <PackageCheck className="mx-auto mb-2 h-12 w-12 text-emerald-600" />
          <h2 className="text-lg font-bold text-emerald-900">
            Pesanan Telah Sampai di Alamat Tujuan
          </h2>
          <p className="mt-1 text-sm text-emerald-800">
            Mohon konfirmasi penerimaan agar pesanan ditandai selesai.
          </p>
          {order.deliveredAt && (
            <p className="mt-2 text-xs text-emerald-700">
              Diterima pada {formatTanggalJamID(order.deliveredAt)}
            </p>
          )}
        </Card>
      )}

      {order.status === "selesai" && order.konfirmasiDiterimaAt && (
        <Card className="border-green-200 bg-green-50 p-5 text-center">
          <CheckCircle2 className="mx-auto mb-2 h-12 w-12 text-green-600" />
          <h2 className="text-lg font-bold text-green-900">Pesanan Selesai</h2>
          <p className="mt-1 text-sm text-green-800">
            Terima kasih telah berbelanja di Jogjadoelan.
          </p>
        </Card>
      )}

      {/* === 5-STEP STATUS BAR === */}
      <Card className="p-3">
        <FiveStepBar activeIdx={activeIdx} />
      </Card>

      {/* === VALIDASI ADMIN CARD (WF 17) === */}
      {order.transferInfo && order.status !== "menunggu_pembayaran" && (
        <Card className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold">Validasi dari Admin</h3>
          </div>
          <p className="text-sm text-zinc-600">
            Admin telah memvalidasi pembayaran sebesar{" "}
            <span className="font-semibold text-zinc-900">
              Rp {(order.transferInfo.nominal ?? order.total).toLocaleString("id-ID")}
            </span>
          </p>
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <div className="rounded-lg border bg-zinc-50 p-2">
              <div className="text-[11px] text-zinc-500">Dari</div>
              <div className="font-medium">{order.transferInfo.pengirim.nama}</div>
              <div className="text-xs text-zinc-600">
                {order.transferInfo.pengirim.bank}
                {order.transferInfo.pengirim.norek && ` · ${order.transferInfo.pengirim.norek}`}
              </div>
            </div>
            <div className="rounded-lg border bg-zinc-50 p-2">
              <div className="text-[11px] text-zinc-500">Ke</div>
              <div className="font-medium">{order.transferInfo.penerima.nama}</div>
              <div className="text-xs text-zinc-600">{order.transferInfo.penerima.lokasi ?? "-"}</div>
            </div>
            <div className="rounded-lg border bg-zinc-50 p-2">
              <div className="text-[11px] text-zinc-500">Tujuan</div>
              <div className="font-medium">{order.transferInfo.tujuan.bank}</div>
              <div className="text-xs text-zinc-600">{order.transferInfo.tujuan.norek}</div>
            </div>
          </div>
          {order.transferInfo.validatedAt && (
            <p className="text-[11px] text-zinc-400">
              Divalidasi pada {formatTanggalJamID(order.transferInfo.validatedAt)}
            </p>
          )}
        </Card>
      )}

      {/* === EKSPEDISI / TRACKING CARD (WF 15) === */}
      {order.ekspedisi?.resi && (
        <Card className="space-y-3 p-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <Truck className="h-4 w-4 text-purple-600" /> Informasi Pengiriman
          </h3>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <div className="text-xs text-zinc-500">Jasa Pengiriman</div>
            <div className="font-medium">{order.ekspedisi.kurir ?? "-"}</div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <div>
                <div className="text-xs text-zinc-500">Nomor Resi</div>
                <div className="font-mono font-medium">{order.ekspedisi.resi}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => copy(order.ekspedisi!.resi!)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {(() => {
            const ek = getEkspedisiByName(order.ekspedisi.kurir);
            if (!ek) return null;
            const url = ek.trackUrl(order.ekspedisi!.resi!);
            return (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-purple-500 px-4 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-50"
              >
                Lacak Pengiriman <ExternalLink className="h-4 w-4" />
              </a>
            );
          })()}
          {order.estimasiTiba && (
            <div className="text-xs text-zinc-600">
              <span className="text-zinc-500">Estimasi tiba: </span>
              <span className="font-medium">{formatRangeTanggalID(order.estimasiTiba)}</span>
            </div>
          )}
        </Card>
      )}

      {/* === ITEMS RINGKAS === */}
      <Card className="p-4">
        <h3 className="mb-3 font-semibold">Pesanan Anda</h3>
        <div className="space-y-3">
          {order.items.map((it, i) => (
            <div key={i} className="flex gap-3">
              {it.gambar ? (
                <Image
                  src={it.gambar}
                  alt={it.nama}
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-lg border object-cover"
                />
              ) : (
                <div className="h-14 w-14 rounded-lg bg-zinc-100" />
              )}
              <div className="flex-1">
                <div className="text-sm font-medium">{it.nama}</div>
                <div className="text-xs text-zinc-500">
                  {it.ukuran} · x{it.qty}
                </div>
              </div>
              <div className="text-sm font-semibold">
                Rp {it.subtotal.toLocaleString("id-ID")}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* === ALAMAT === */}
      <Card className="p-4">
        <h3 className="mb-2 font-semibold">Alamat Pengiriman</h3>
        <div className="text-sm">
          <div className="font-medium">{order.alamat.nama}</div>
          <div className="text-zinc-600">{order.alamat.noHp}</div>
          <div className="mt-1 text-zinc-700">
            {order.alamat.alamat}
            {order.alamat.detail && `, ${order.alamat.detail}`}
            {order.alamat.kecamatan && `, ${order.alamat.kecamatan}`}, {order.alamat.kota}
            {order.alamat.provinsi && `, ${order.alamat.provinsi}`} {order.alamat.kodePos}
          </div>
        </div>
      </Card>

      {/* === SYARAT KOMPLAIN (WF 16) === */}
      {order.status === "selesai" && !order.konfirmasiDiterimaAt && (
        <Card className="border-amber-200 bg-amber-50 p-4">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertTriangle className="h-4 w-4" /> Syarat Pengajuan Komplain
          </h4>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-amber-800">
            <li>Komplain hanya bisa diajukan dalam 1×24 jam setelah pesanan diterima.</li>
            <li>Wajib menyertakan video unboxing yang jelas (tidak buram).</li>
            <li>Cek kembali detail pesanan secara teliti sebelum mengajukan.</li>
          </ul>
        </Card>
      )}

      {/* === TIMELINE LENGKAP === */}
      {timeline.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 font-semibold">Riwayat Status</h3>
          <TimelineDetail items={timeline} />
        </Card>
      )}

      {/* === STICKY CTA (WF 16) === */}
      {order.status === "selesai" && !order.konfirmasiDiterimaAt && (
        <div className="sticky bottom-16 -mx-4 grid grid-cols-2 gap-2 border-t bg-white p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
          <Link href={`/komplain/baru?orderId=${encodeURIComponent(order.id)}`}>
            <Button variant="outline" className="w-full border-orange-500 text-orange-600">
              Ajukan Komplain
            </Button>
          </Link>
          <Button
            className="w-full bg-orange-500 hover:bg-orange-600"
            onClick={handleKonfirmasiDiterima}
            disabled={busy}
          >
            {busy ? "Memproses…" : "Konfirmasi Diterima"}
          </Button>
        </div>
      )}

      {order.status === "dikirim" && (
        <div className="sticky bottom-16 -mx-4 grid grid-cols-2 gap-2 border-t bg-white p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
          <Link href={`/komplain/baru?orderId=${encodeURIComponent(order.id)}`}>
            <Button variant="outline" className="w-full border-orange-500 text-orange-600">
              Ada Masalah?
            </Button>
          </Link>
          <Button
            className="w-full bg-orange-500 hover:bg-orange-600"
            onClick={handleKonfirmasiDiterima}
            disabled={busy}
          >
            Sudah Diterima
          </Button>
        </div>
      )}
    </div>
  );
}

export default StatusPesananView;