// GET /api/admin/promo — daftar promo dari SiteSetting key "promos"
// PUT /api/admin/promo — simpan semua promo
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import { invalidateSettingCache } from "@/lib/settings-cache";

const PROMO_KEY = "promos";

export const GET = handler(async () => {
  await requireAdmin();
  const setting = await prisma.sitesetting.findUnique({ where: { key: PROMO_KEY } });
  const promos = setting ? (setting.value as unknown as unknown[]) : [];
  return ok(Array.isArray(promos) ? promos : []);
});

export const PUT = handler(async (req: Request) => {
  await requireAdmin();
  const body: unknown = await req.json();
  const list = Array.isArray(body) ? body : [];
  await prisma.sitesetting.upsert({
    where: { key: PROMO_KEY },
    update: { value: list },
    create: { key: PROMO_KEY, value: list },
  });
  invalidateSettingCache(PROMO_KEY);
  return ok(list);
});
