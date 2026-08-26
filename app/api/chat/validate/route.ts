import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireCustomer } from "@/lib/auth-server";
import { logAudit } from "@/lib/audit";
import pusher from "@/lib/pusher-server";

const validateSchema = z.object({
  messageId: z.string().min(1),
  action: z.enum(["approve", "revision"]),
  notes: z.string().optional(),
});

type ValidationCard = {
  status?: string;
  revisionNote?: string | null;
  adminId?: string;
  adminName?: string;
  orderId: string;
  productName?: string;
  variant?: string;
  color?: string;
  qty?: number;
  customNote?: string;
};

type ChatValidationContext = {
  kind?: string;
  href: string;
  validation?: ValidationCard;
};

export const POST = handler(async (req: Request) => {
  const customer = await requireCustomer();
  const body = validateSchema.parse(await req.json());

  // 1. Ambil chat message
  const message = await prisma.chatsupportmessage.findFirst({
    where: {
      id: body.messageId,
      userId: customer.id,
      deletedAt: null,
    },
  });

  if (!message) {
    throw new Error("Pesan validasi tidak ditemukan atau Anda tidak memiliki akses");
  }

  // 2. Pastikan format context ada dan valid
  const contextRaw = message.context as ChatValidationContext | null;
  if (!contextRaw || contextRaw.kind !== "validation" || !contextRaw.validation) {
    throw new Error("Pesan ini bukan merupakan kartu validasi produk");
  }

  // 3. Update status validasi
  const validation = { ...contextRaw.validation };
  if (body.action === "approve") {
    validation.status = "approved";
    validation.revisionNote = null;
  } else {
    if (!body.notes?.trim()) {
      throw new Error("Catatan revisi wajib diisi jika meminta revisi");
    }
    validation.status = "revision_requested";
    validation.revisionNote = body.notes.trim();
  }

  const updatedContext = {
    ...contextRaw,
    validation,
    // Sync sublabel to reflect status update
    sublabel: `Status: ${body.action === "approve" ? "Disetujui" : "Revisi Diminta"}`
  };

  // 4. Simpan ke database
  const updatedMsg = await prisma.chatsupportmessage.update({
    where: { id: body.messageId },
    data: {
      context: updatedContext,
    },
  });

  // 5. Catat ke audit log
  let adminId = validation.adminId;
  let adminName = validation.adminName;
  if (!adminId) {
    const firstAdmin = await prisma.adminuser.findFirst({ where: { aktif: true } });
    adminId = firstAdmin?.id ?? "system";
    adminName = firstAdmin?.nama ?? "System";
  }

  const isCustomOrder = validation.orderId.startsWith("JD-C-") || validation.orderId.includes("-C-") || contextRaw.href.includes("/custom");

  await logAudit({
    adminId,
    adminName,
    action: body.action === "approve" ? "VALIDASI_PRODUK_SETUJU" : "VALIDASI_PRODUK_REVISI",
    entity: isCustomOrder ? "customorder" : "order",
    entityId: validation.orderId,
    meta: {
      productName: validation.productName,
      variant: validation.variant ?? "—",
      color: validation.color ?? "—",
      qty: validation.qty,
      customNote: validation.customNote ?? "—",
      customerName: customer.username,
      messageId: body.messageId,
      ...(body.action === "revision" ? { revisionNote: body.notes } : {}),
    },
  });

  // 6. Trigger real-time sync via Pusher
  await pusher.trigger(`private-chat-${customer.id}`, "user:message", updatedMsg).catch(() => {});
  await pusher.trigger(`admin-chat`, "user:message", { userId: customer.id, message: updatedMsg }).catch(() => {});

  return ok(updatedMsg);
});
