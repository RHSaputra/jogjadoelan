// GET  /api/admin/bank — list semua bank
// POST /api/admin/bank — tambah bank baru
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, handler } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth-server";

const createSchema = z.object({
  keyUnik: z.string().min(1),
  nama: z.string().min(1),
  noRek: z.string().min(1),
  anNama: z.string().min(1),
  color: z.string().default("#0E2148"),
  logoPath: z.string().optional(),
  urutan: z.number().int().default(0),
  aktif: z.boolean().default(true),
});

export const GET = handler(async () => {
  await requireAdmin();
  const banks = await prisma.bank.findMany({ orderBy: { urutan: "asc" } });
  return ok(banks);
});

export const POST = handler(async (req: Request) => {
  await requireAdmin();
  const body = createSchema.parse(await req.json());
  const bank = await prisma.bank.create({ data: body });
  return ok(bank, { status: 201 });
});

// PUT /api/admin/bank — replace seluruh list (bulk sync dari admin page)
export const PUT = handler(async (req: Request) => {
  await requireAdmin();
  const body = z.array(z.object({
    id: z.string().optional(),
    keyUnik: z.string().min(1),
    nama: z.string().min(1),
    noRek: z.string().min(1),
    anNama: z.string().min(1),
    color: z.string().default("#0E2148"),
    logoPath: z.string().nullish(),
    urutan: z.number().int().default(0),
    aktif: z.boolean().default(true),
  })).parse(await req.json());

  // Hapus semua & insert ulang secara atomik dalam transaksi
  const result = await prisma.$transaction(async (tx) => {
    await tx.bank.deleteMany();
    for (const b of body) {
      const bankId = b.keyUnik ? `${b.keyUnik}-${Date.now()}` : `bank-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await tx.bank.create({
        data: {
          id: bankId,
          keyUnik: b.keyUnik || bankId,
          nama: b.nama,
          noRek: b.noRek,
          anNama: b.anNama,
          color: b.color,
          logoPath: b.logoPath ?? null,
          urutan: b.urutan ?? 0,
          aktif: b.aktif,
        },
      });
    }
    return tx.bank.findMany({ orderBy: { urutan: "asc" } });
  });

  return ok(result);
});
