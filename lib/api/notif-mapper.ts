import type { notifikasi as PrismaNotif } from "@prisma/client";
import { toLowerEnum } from "./enum-mapper";

export interface NotifDTO {
  id: string;
  title: string;
  body: string;
  type: string;        // lowercase
  read: boolean;
  createdAt: string;
  link?: string;
  orderId?: string;
  komplainId?: string;
  refundId?: string;
  tukarId?: string;
}

export function mapNotifToDTO(n: PrismaNotif): NotifDTO {
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    type: toLowerEnum(n.type),
    read: n.isRead,
    createdAt: n.createdAt.toISOString(),
    link: n.link ?? undefined,
    orderId: n.orderId ?? undefined,
    komplainId: n.komplainId ?? undefined,
    refundId: n.refundId ?? undefined,
    tukarId: n.tukarId ?? undefined,
  };
}