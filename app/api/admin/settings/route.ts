// GET  /api/admin/settings?keys=kontak,landing,branding,footer,identitas,cabang,faq,promos,header_text,operasional
// PUT  /api/admin/settings  body: { key: string, value: any }
// Semua konfigurasi toko non-transaksional disimpan di SiteSetting key-value.
export const dynamic = "force-dynamic";

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";
import { invalidateSettingCache } from "@/lib/settings-cache";

const qs = z.object({ keys: z.string().default("") });

export const GET = handler(async (req: Request) => {
  await requireAdmin();
  const { searchParams } = new URL(req.url);
  const { keys } = qs.parse(Object.fromEntries(searchParams));
  const keyList = keys.split(",").map((k) => k.trim()).filter(Boolean);
  if (keyList.length === 0) {
    const all = await prisma.sitesetting.findMany();
    const result: Record<string, unknown> = {};
    for (const r of all) result[r.key] = r.value;
    return ok(result);
  }
  const rows = await prisma.sitesetting.findMany({ where: { key: { in: keyList } } });
  const result: Record<string, unknown> = {};
  for (const r of rows) result[r.key] = r.value;
  return ok(result);
});

const putSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
});

export const PUT = handler(async (req: Request) => {
  await requireAdmin();
  const body = putSchema.parse(await req.json());
  const row = await prisma.sitesetting.upsert({
    where: { key: body.key },
    update: { value: body.value as Prisma.InputJsonValue },
    create: { key: body.key, value: body.value as Prisma.InputJsonValue },
  });
  invalidateSettingCache(body.key);
  return ok(row);
});
