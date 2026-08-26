// GET /api/promo — public: daftar promo aktif untuk customer
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { getCachedSetting, setCachedSetting } from "@/lib/settings-cache";

export const GET = handler(async () => {
  const cached = getCachedSetting("promos");
  if (cached !== null) {
    return ok(Array.isArray(cached) ? cached : []);
  }

  const setting = await prisma.sitesetting.findUnique({ where: { key: "promos" } });
  const promos = setting ? (setting.value as unknown as unknown[]) : [];
  setCachedSetting("promos", promos);
  return ok(promos);
});
