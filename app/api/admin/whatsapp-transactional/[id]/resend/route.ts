// app/api/admin/whatsapp-transactional/[id]/resend/route.ts
import { prisma } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import { sendWhatsapp } from "@/lib/whatsapp";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler(async (req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;

  const log = await prisma.whatsapptransactional.findUnique({
    where: { id },
  });

  if (!log) {
    return fail(404, "Log transaksional tidak ditemukan");
  }

  // Update status to PENDING for the retry
  await prisma.whatsapptransactional.update({
    where: { id },
    data: {
      status: "PENDING",
      error: null,
    },
  });

  // Try sending
  let success = false;
  let errorReason = "";
  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts && !success) {
    attempt++;
    const res = await sendWhatsapp(log.noHp, log.pesan);
    if (res.success) {
      success = true;
    } else {
      errorReason = res.reason;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
  }

  // Update DB log
  const updatedLog = await prisma.whatsapptransactional.update({
    where: { id },
    data: {
      status: success ? "SENT" : "FAILED",
      error: success ? null : errorReason,
      retries: log.retries + attempt,
      sentAt: success ? new Date() : null,
    },
  });

  return ok({ log: updatedLog });
});
