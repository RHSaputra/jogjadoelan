// GET /api/settings?keys=kontak,identitas,landing,branding,footer,operasional
// Public: baca multiple SiteSetting sekaligus untuk customer
export const dynamic = "force-dynamic";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { getCachedSetting, setCachedSetting } from "@/lib/settings-cache";

const qs = z.object({ keys: z.string().default("") });

export const GET = handler(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const { keys } = qs.parse(Object.fromEntries(searchParams));
  const keyList = keys.split(",").map((k) => k.trim()).filter(Boolean);
  if (keyList.length === 0) return ok({});

  const result: Record<string, unknown> = {};
  const missingKeys: string[] = [];

  for (const key of keyList) {
    const cached = getCachedSetting(key);
    if (cached !== null) {
      result[key] = cached;
    } else {
      missingKeys.push(key);
    }
  }

  if (missingKeys.length > 0) {
    const rows = await prisma.sitesetting.findMany({
      where: { key: { in: missingKeys } },
    });
    for (const row of rows) {
      result[row.key] = row.value;
      setCachedSetting(row.key, row.value);
    }
    // Cache missing keys that weren't found in DB as null to avoid repeated DB hits
    for (const key of missingKeys) {
      if (result[key] === undefined) {
        result[key] = null;
        setCachedSetting(key, null);
      }
    }
  }

  return ok(result);
});
