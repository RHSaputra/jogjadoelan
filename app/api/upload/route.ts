// POST /api/upload  (multipart) — customer/user general upload
// field: file (File), sub: "custom-ref" | "ulasan" | "komplain" | "refund" | "tukar"
// response: { path }

import { ok, fail, handler } from "@/lib/api/response";
import { requireUser } from "@/lib/auth-server";
import { saveUpload, type UploadSub } from "@/lib/upload";

const ALLOWED: UploadSub[] = ["custom-ref", "ulasan", "komplain", "refund", "tukar"];

export const POST = handler(async (req: Request) => {
  await requireUser();
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const sub = (form.get("sub") as string) || "custom-ref";
  if (!file) return fail(422, "File wajib diisi");
  if (!ALLOWED.includes(sub as UploadSub)) {
    return fail(422, `Sub folder tidak valid (${ALLOWED.join("|")})`);
  }
  const r = await saveUpload(file, sub as UploadSub, { imageOnly: true, maxMb: 5 });
  return ok({ path: r.path });
});