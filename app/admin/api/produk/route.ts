import { logger } from "@/lib/logger";
// app/admin/api/produk/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

// Schema untuk data JSON dari frontend
const produkCreateSchema = z.object({
  nama: z.string().min(1, "Nama wajib diisi"),
  jenis: z.string().min(1, "Jenis wajib dipilih"),
  harga: z.number().int().positive("Harga harus positif"),
  stok: z.number().int().min(0, "Stok tidak boleh negatif").default(0),
  deskripsiSingkat: z.string().optional(),
  ukuranList: z.array(z.string()).default([]),
  gambars: z.array(z.string()).optional(), // URL gambar dari upload terpisah
  // field lain yang mungkin dikirim (opsional)
  kondisi: z.string().optional(),
  spesifikasi: z.string().optional(),
  deskripsi: z.array(z.string()).optional(),
  ukuran: z.array(z.string()).optional(),
  isRekomendasi: z.boolean().optional(),
  rating: z.number().optional(),
  terjual: z.number().optional(),
  hargaCoret: z.number().optional(),
  diskonPersen: z.number().optional(),
  promoLabel: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.role?.includes('ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = produkCreateSchema.parse(body);

    // Gambar utama adalah yang pertama dari array gambars
    const gambarUtama = validated.gambars?.[0] || null;

    // Mapping jenis ke jenisLabel
    const jenisLabelMap: Record<string, string> = {
      'half-face': 'Half Face',
      'full-face': 'Full Face',
      'chips': 'Chips',
    };
    const jenisLabel = jenisLabelMap[validated.jenis] || validated.jenis;

    // Simpan produk
    const produk = await prisma.produk.create({
      data: {
        nama: validated.nama,
        jenis: validated.jenis,
        jenisLabel,
        harga: validated.harga,
        stok: validated.stok,
        deskripsiSingkat: validated.deskripsiSingkat || '',
        ukuranList: validated.ukuranList,
        gambarUtama,
        isActive: true,
        kondisi: validated.kondisi || "Baru",
        spesifikasi: validated.spesifikasi || "",
        deskripsi: validated.deskripsi || [],
        hargaCoret: validated.hargaCoret || 0,
        diskonPersen: validated.diskonPersen || 0,
        promoLabel: validated.promoLabel || null,
        rating: validated.rating || 0,
        terjual: validated.terjual || 0,
        jumlahUlasan: 0,
        isPromo: false,
        isPreOrder: false,
        isCustomMaster: false,
        isRekomendasi: validated.isRekomendasi || false,
      },
    });

    // Simpan semua gambar ke ProdukImage
    if (validated.gambars && validated.gambars.length > 0) {
      await prisma.produkimage.createMany({
        data: validated.gambars.map((path, idx) => ({
          produkId: produk.id,
          path,
          urutan: idx,
          isThumbnail: idx === 0,
        })),
      });
    }

    return NextResponse.json(produk, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    const errMsg = error instanceof Error ? error.message : 'Internal server error';
    logger.error('❌ Error creating produk:', error);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

// GET handler (tetap sama seperti sebelumnya)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.role?.includes('ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const tab = searchParams.get('tab');
    const jenis = searchParams.get('jenis');
    const q = searchParams.get('q');

    // Build WHERE conditions
    const conditions: Prisma.produkWhereInput[] = [];

    if (tab && tab !== 'all') {
      switch (tab) {
        case 'promo':
          conditions.push(
            { OR: [{ diskonPersen: { gt: 0 } }, { promoLabel: { not: null } }] }
          );
          break;
        case 'low_stock':
          conditions.push({ stok: { lt: 5 } });
          break;
        case 'out_of_stock':
          conditions.push({ stok: { equals: 0 } });
          break;
        default:
          break;
      }
    }

    if (jenis) {
      conditions.push({ jenis });
    }

    if (q) {
      // mode: 'insensitive' tidak dikenali tipe MariaDB namun dipertahankan agar payload tidak berubah
      const qFilter = {
        OR: [
          { nama: { contains: q, mode: 'insensitive' } },
          { jenisLabel: { contains: q, mode: 'insensitive' } },
          { id: { contains: q, mode: 'insensitive' } },
        ],
      };
      conditions.push(qFilter as unknown as Prisma.produkWhereInput);
    }

    const where = conditions.length > 0 ? { AND: conditions } : {};

    const produk = await prisma.produk.findMany({
      where,
      include: { produkimage: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(produk);
  } catch (error) {
    logger.error('Error fetching produk:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
