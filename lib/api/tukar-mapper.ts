import type { tukar as PrismaTukar, Prisma } from "@prisma/client";
import { toLowerEnum } from "./enum-mapper";

export interface AlamatTujuanDTO {
  nama: string;
  hp: string;
  alamat: string;
  kota: string;
  kodePos: string;
}

export interface TukarDTO {
  id: string;
  komplainId: string;
  orderId: string;
  userId: string;
  productId: string | null;
  status: string;

  productNama: string;
  productGambar: string | null;
  ukuranLama: string | null;
  ukuranBaru: string;
  warnaLama: string | null;
  warnaBaru: string | null;
  notes: string | null;

  alamatTujuan: AlamatTujuanDTO;

  kurirBalik: string;
  noResiBalik: string | null;
  buktiKirimBalikPath: string | null;
  buktiKirimBalikAt: string | null;

  adminApprovedAt: string | null;
  adminReceivedAt: string | null;
  adminKirimVarianAt: string | null;
  adminNoResiKirim: string | null;
  adminKurirKirim: string | null;
  adminCatatan: string | null;
  rejectReason: string | null;

  customerConfirmedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;

  createdAt: string;
  updatedAt: string;
}

export function mapTukarToDTO(t: PrismaTukar): TukarDTO {
  const at = (t.alamatTujuan ?? {}) as Prisma.JsonObject;
  return {
    id: t.id,
    komplainId: t.komplainId,
    orderId: t.orderId,
    userId: t.userId,
    productId: t.productId,
    status: toLowerEnum(t.status),

    productNama: t.productNama,
    productGambar: t.productGambar,
    ukuranLama: t.ukuranLama,
    ukuranBaru: t.ukuranBaru,
    warnaLama: t.warnaLama,
    warnaBaru: t.warnaBaru,
    notes: t.notes,

    alamatTujuan: {
      nama: String(at.nama ?? ""),
      hp: String(at.hp ?? ""),
      alamat: String(at.alamat ?? ""),
      kota: String(at.kota ?? ""),
      kodePos: String(at.kodePos ?? ""),
    },

    kurirBalik: t.kurirBalik,
    noResiBalik: t.noResiBalik,
    buktiKirimBalikPath: t.buktiKirimBalikPath,
    buktiKirimBalikAt: t.buktiKirimBalikAt?.toISOString() ?? null,

    adminApprovedAt: t.adminApprovedAt?.toISOString() ?? null,
    adminReceivedAt: t.adminReceivedAt?.toISOString() ?? null,
    adminKirimVarianAt: t.adminKirimVarianAt?.toISOString() ?? null,
    adminNoResiKirim: t.adminNoResiKirim,
    adminKurirKirim: t.adminKurirKirim,
    adminCatatan: t.adminCatatan,
    rejectReason: t.rejectReason,

    customerConfirmedAt: t.customerConfirmedAt?.toISOString() ?? null,
    cancelledAt: t.cancelledAt?.toISOString() ?? null,
    cancelReason: t.cancelReason,

    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}