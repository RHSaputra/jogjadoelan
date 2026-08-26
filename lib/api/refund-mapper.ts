import type { refund as PrismaRefund } from "@prisma/client";
import { toLowerEnum } from "./enum-mapper";

export interface RefundDTO {
  id: string;
  komplainId: string;
  orderId: string;
  userId: string;
  status: string;

  /* Rekening tujuan refund */
  namaBank: string;
  atasNama: string;
  noRek: string;

  /* Pengiriman barang balik oleh customer */
  kurir: string;
  noResi: string | null;
  buktiKirimPath: string | null;
  buktiKirimAt: string | null;

  /* Keputusan admin */
  nominalRefund: number;
  catatanAdmin: string | null;
  rejectReason: string | null;
  adminApprovedAt: string | null;
  adminReceivedAt: string | null;
  adminTransferredAt: string | null;
  adminTransferProofPath: string | null;

  /* Konfirmasi customer */
  customerConfirmedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;

  createdAt: string;
  updatedAt: string;
}

export function mapRefundToDTO(r: PrismaRefund): RefundDTO {
  return {
    id: r.id,
    komplainId: r.komplainId,
    orderId: r.orderId,
    userId: r.userId,
    status: toLowerEnum(r.status),

    namaBank: r.namaBank,
    atasNama: r.atasNama,
    noRek: r.noRek,

    kurir: r.kurir,
    noResi: r.noResi,
    buktiKirimPath: r.buktiKirimPath,
    buktiKirimAt: r.buktiKirimAt?.toISOString() ?? null,

    nominalRefund: r.nominalRefund,
    catatanAdmin: r.catatanAdmin,
    rejectReason: r.rejectReason,
    adminApprovedAt: r.adminApprovedAt?.toISOString() ?? null,
    adminReceivedAt: r.adminReceivedAt?.toISOString() ?? null,
    adminTransferredAt: r.adminTransferredAt?.toISOString() ?? null,
    adminTransferProofPath: r.adminTransferProofPath,

    customerConfirmedAt: r.customerConfirmedAt?.toISOString() ?? null,
    cancelledAt: r.cancelledAt?.toISOString() ?? null,
    cancelReason: r.cancelReason,

    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}