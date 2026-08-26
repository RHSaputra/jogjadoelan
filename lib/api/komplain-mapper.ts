import type {
  komplain as PrismaKomplain,
  refund as PrismaRefund,
  tukar as PrismaTukar,
} from "@prisma/client";
import { toLowerEnum } from "./enum-mapper";
import type {
  RefundFormData,
  RefundResultData,
  TukarFormData,
  TukarResultData,
} from "@/lib/komplain-context";

type Full = PrismaKomplain & {
  refund?: PrismaRefund | null;
  tukar?: PrismaTukar | null;
};

export interface KomplainFile { url: string; type: "image" | "video"; name?: string; }

export interface KomplainChatEntry {
  id?: string;
  by?: string;
  pesan?: string;
  files?: KomplainFile[];
  createdAt?: string;
}

function asJson<T>(value: unknown): T | null {
  return (value ?? null) as T | null;
}

export interface KomplainDTO {
  id: string;
  orderId: string;
  jenis: string;
  jenisLabel: string;
  deskripsi: string;
  files: KomplainFile[];
  tindakan: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  chat: KomplainChatEntry[]; // Deprecated, kept empty for legacy UI compatibility if needed
  penolakan?: { alasan: string; by: string; at: string } | null;
  refundForm?: RefundFormData | null;
  refundResult?: RefundResultData | null;
  tukarForm?: TukarFormData | null;
  tukarResult?: TukarResultData | null;
  refund?: PrismaRefund | null;
  tukar?: PrismaTukar | null;
  /* Admin-only ext: */
  userId?: string;
  userName?: string;
  userEmail?: string;
}

export function mapKomplainToDTO(k: Full): KomplainDTO {
  return {
    id: k.id,
    orderId: k.orderId ?? "",
    jenis: toLowerEnum(k.jenis),
    jenisLabel: k.jenisLabel,
    deskripsi: k.deskripsi,
    files: Array.isArray(k.filesPaths) ? (k.filesPaths as unknown as KomplainFile[]) : [],
    tindakan: toLowerEnum(k.tindakan).replace(/_/g, "_"),
    status: toLowerEnum(k.status),
    createdAt: k.createdAt.toISOString(),
    updatedAt: k.updatedAt.toISOString(),
    chat: [],
    penolakan: asJson<{ alasan: string; by: string; at: string }>(k.penolakan),
    refundForm: asJson<RefundFormData>(k.refundForm),
    refundResult: asJson<RefundResultData>(k.refundResult),
    tukarForm: asJson<TukarFormData>(k.tukarForm),
    tukarResult: asJson<TukarResultData>(k.tukarResult),
    refund: k.refund ?? null,
    tukar: k.tukar ?? null,
  };
}