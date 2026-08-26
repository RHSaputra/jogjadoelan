// lib/api/custom-mapper.ts
import type {
  customorder as PrismaCustomOrder,
  customprogress as PrismaCustomProgress,
  customorder_status as PrismaCustomStatus,
  customorder_paymentType as PrismaCustomPaymentType,
  payment as PrismaPayment,
  user as User,
} from "@prisma/client";

type Full = PrismaCustomOrder & {
  user?: Pick<User, "id" | "username" | "email"> | null;
  customprogress?: PrismaCustomProgress[];
  payment?: PrismaPayment[];
};

export interface WarnaItemDTO {
  hex: string;
  nama?: string;
  sumber: "preset" | "custom";
}
export interface EstimasiItemDTO {
  label: string; sub: string; harga: number; hari: number;
}
export interface ProgressUpdateDTO {
  id: string; tahap: string; deskripsi?: string; fotoUrl?: string; createdAt: number;
}
export interface PaymentRecordDTO {
  amount: number;
  metode: "transfer" | "qris";
  bank?: "bca" | "bni" | "bri" | "mandiri";
  buktiUrl: string;
  at: number;
  status: "pending" | "verified" | "rejected";
}
export interface HasilProduksiItemDTO {
  type: "image" | "video";
  url: string;
}

export interface CustomOrderDTO {
  id: string;
  userId: string;
  userNama?: string;
  status: Lowercase<PrismaCustomStatus>;
  createdAt: number;
  updatedAt: number;

  jenis: string;
  ukuran: string;
  finishing?: string | null;
  strap?: string | null;
  motifBusa?: string | null;
  bahan?: string | null;
  aksesoris?: string | null;
  warnaList: WarnaItemDTO[];
  warnaCatatan?: string | null;
  notes?: string | null;
  referensiPaths: string[];
  hasilProduksi?: HasilProduksiItemDTO[];

  estimasi?: { items: EstimasiItemDTO[]; total: number };
  estimasiTanggal?: { mulai: string; selesai: string };
  quotedByAdminAt?: number;
  quotedCatatan?: string | null;
  customerApprovedAt?: number;

  paymentType?: Lowercase<PrismaCustomPaymentType>;
  hargaFinal?: number;
  dpAmount?: number;
  sisaAmount?: number;
  isLate: boolean;

  dpPayment?: PaymentRecordDTO;
  lunasPayment?: PaymentRecordDTO;
  pelunasanPayment?: PaymentRecordDTO;

  progressUpdates: ProgressUpdateDTO[];
}

function asArray<T>(v: unknown): T[] { return Array.isArray(v) ? (v as T[]) : []; }
function epoch(d?: Date | null): number | undefined { return d ? d.getTime() : undefined; }

function mapPayment(p: PrismaPayment): PaymentRecordDTO {
  return {
    amount: p.nominal,
    metode: p.metode.toLowerCase() as "transfer" | "qris",
    bank: p.bankKey ? (p.bankKey.toLowerCase() as PaymentRecordDTO["bank"]) : undefined,
    buktiUrl: p.buktiPath,
    at: p.createdAt.getTime(),
    status: p.status.toLowerCase() as PaymentRecordDTO["status"],
  };
}

export function mapCustomOrderToDTO(c: Full): CustomOrderDTO {
  const userNama =
    c.user?.username ?? c.user?.email?.split("@")[0] ?? undefined;

  const estimasiObj = c.estimasi as { items: EstimasiItemDTO[]; total: number } | null;
  const estimasiTglObj = c.estimasiTanggal as { mulai: string; selesai: string } | null;

  const pays = c.payment ?? [];
  const dp = pays.find((p) => p.type === "DP" && p.status !== "REJECTED");
  const lunas = pays.find((p) => p.type === "FULL" && p.status !== "REJECTED");
  const pelunasan = pays.find((p) => p.type === "PELUNASAN" && p.status !== "REJECTED");

  return {
    id: c.id,
    userId: c.userId,
    userNama,
    status: c.status.toLowerCase() as Lowercase<PrismaCustomStatus>,
    createdAt: c.createdAt.getTime(),
    updatedAt: c.updatedAt.getTime(),

    jenis: c.jenis,
    ukuran: c.ukuran,
    finishing: c.finishing,
    strap: c.strap,
    motifBusa: c.motifBusa,
    bahan: c.bahan,
    aksesoris: c.aksesoris,
    warnaList: asArray<WarnaItemDTO>(c.warnaList),
    warnaCatatan: c.warnaCatatan,
    notes: c.notes,
    referensiPaths: asArray<string>(c.referensiPaths),
    hasilProduksi: (c.hasilProduksi as unknown as HasilProduksiItemDTO[] | undefined) ?? undefined,

    estimasi: estimasiObj ?? undefined,
    estimasiTanggal: estimasiTglObj ?? undefined,
    quotedByAdminAt: epoch(c.quotedByAdminAt),
    quotedCatatan: c.quotedCatatan,
    customerApprovedAt: epoch(c.customerApprovedAt),

    paymentType: c.paymentType
      ? (c.paymentType.toLowerCase() as Lowercase<PrismaCustomPaymentType>)
      : undefined,
    hargaFinal: c.hargaFinal ?? undefined,
    dpAmount: c.dpAmount ?? undefined,
    sisaAmount: c.sisaAmount ?? undefined,
    isLate: c.isLate,

    dpPayment: dp ? mapPayment(dp) : undefined,
    lunasPayment: lunas ? mapPayment(lunas) : undefined,
    pelunasanPayment: pelunasan ? mapPayment(pelunasan) : undefined,

    progressUpdates: (c.customprogress ?? []).map((p) => ({
      id: p.id,
      tahap: p.tahap,
      deskripsi: p.deskripsi ?? undefined,
      fotoUrl: p.fotoPath ?? undefined,
      createdAt: p.createdAt.getTime(),
    })),
  };
}