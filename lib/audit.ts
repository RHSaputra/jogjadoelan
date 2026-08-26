import type { auditlog_action as AuditAction, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";

interface LogInput {
  adminId?: string | null;
  adminName?: string | null;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  meta?: Prisma.InputJsonObject;
  /** Boleh dipakai dalam tx, kalau null pakai prisma global */
  tx?: Prisma.TransactionClient;
}

export async function logAudit(input: LogInput): Promise<void> {
  let ip: string | undefined;
  let userAgent: string | undefined;
  try {
    const h = await headers();
    ip = h.get("x-forwarded-for")?.split(",")[0].trim() ?? h.get("x-real-ip") ?? undefined;
    userAgent = h.get("user-agent") ?? undefined;
  } catch { /* di luar request scope, skip */ }

  const client = input.tx ?? prisma;
  try {
    await client.auditlog.create({
      data: {
        adminId: input.adminId ?? null,
        adminName: input.adminName ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        meta: input.meta ?? {},
        ip, userAgent,
      },
    });
  } catch (e) {
    // Audit gagal jangan ganggu request utama
    console.error("[audit] failed:", e);
  }
}