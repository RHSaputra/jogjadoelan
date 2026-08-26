import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { mapProdukToDTO } from '@/lib/api/produk-mapper';
import { serverCache } from '@/lib/server-cache';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.role?.includes('ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const nama = body.nama as string;
  const jenis = body.jenis as string;
  const harga = parseInt(body.harga as string);
  const stok = parseInt(body.stok as string);

  // Extract all fields from form
  const deskripsiSingkat = body.deskripsiSingkat || '';
  const deskripsi = body.deskripsi || [];
  const ukuran = body.ukuran || [];
  const kondisi = body.kondisi || 'Baru';
  const spesifikasi = body.spesifikasi || '';
  const hargaCoret = body.hargaCoret || 0;
  const diskonPersen = body.diskonPersen || 0;
  const promoLabel = body.promoLabel || null;
  const rating = body.rating || 5;
  const terjual = body.terjual || 0;
  const isRekomendasi = body.isRekomendasi || false;

  // Handle both gambars (array) and gambarUtama (legacy single)
  let gambarsArray: string[] = body.gambars || [];
  if (!gambarsArray.length && body.gambarUtama) {
    gambarsArray = [body.gambarUtama];
  }

  // Validasi
  if (!nama || !jenis || !harga) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    // Determine jenisLabel based on jenis
    let jenisLabel = jenis;
    if (jenis === 'half-face') jenisLabel = 'Half Face';
    else if (jenis === 'full-face') jenisLabel = 'Full Face';
    else if (jenis === 'chips') jenisLabel = 'Chips';
    else if (jenis === 'modular') jenisLabel = 'Modular';
    else if (jenis === 'open-face') jenisLabel = 'Open Face';

      // Simpan ke database
      const produk = await prisma.produk.create({
        data: {
          id: `PRD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          nama,
          jenis,
          jenisLabel,
          harga,
          stok,
          deskripsiSingkat,
          deskripsi,
          ukuranList: ukuran,
          kondisi,
          spesifikasi,
          hargaCoret,
          diskonPersen,
          promoLabel,
          rating,
          terjual,
          gambarUtama: gambarsArray[0] || null,
          isRekomendasi,
          isActive: true,
        },
      });

      // Buat entry di ProdukImage untuk semua gambar
      if (gambarsArray.length > 0) {
        await prisma.produkimage.createMany({
          data: gambarsArray.map((path, idx) => ({
            produkId: produk.id,
            path,
            urutan: idx,
            isThumbnail: idx === 0,
          })),
        });
      }

      // Fetch the product with images to return as DTO
      const produkWithImages = await prisma.produk.findUnique({
        where: { id: produk.id },
        include: { produkimage: true },
      });

      if (!produkWithImages) {
        throw new Error('Product not found after creation');
      }

      serverCache.delete("kategori-list");
      const produkDTO = mapProdukToDTO(produkWithImages);
      return NextResponse.json(produkDTO, { status: 201 });
  } catch (error) {
    logger.error('[produk POST] error:', error);
    return NextResponse.json(
      { error: 'Gagal membuat produk' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.role?.includes('ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tab = searchParams.get('tab');
  const jenis = searchParams.get('jenis');
  const q = searchParams.get('q');

  const where: Prisma.produkWhereInput = {};

  if (tab === 'promo') {
    where.OR = [
      { isPromo: true },
      { diskonPersen: { gt: 0 } },
      { promoLabel: { not: null } }
    ];
  } else if (tab === 'low_stock') {
    where.stok = { gt: 0, lt: 5 };
  } else if (tab === 'out_of_stock') {
    where.stok = { lte: 0 };
  }

  if (jenis) {
    where.jenis = jenis;
  }

  if (q) {
    const qLower = q.toLowerCase();
    // If we already have an OR from promo, we need to AND it
    if (where.OR) {
      where.AND = [
        { OR: where.OR },
        {
          OR: [
            { nama: { contains: qLower } },
            { sku: { contains: qLower } },
            { jenisLabel: { contains: qLower } },
          ]
        }
      ];
      delete where.OR;
    } else {
      where.OR = [
        { nama: { contains: qLower } },
        { sku: { contains: qLower } },
        { jenisLabel: { contains: qLower } },
      ];
    }
  }

  try {
    const produk = await prisma.produk.findMany({
      where,
      include: { produkimage: true },
      orderBy: { createdAt: 'desc' },
    });
    const produkDTO = produk.map(mapProdukToDTO);
    return NextResponse.json(produkDTO);
  } catch (error) {
    logger.error('[produk GET] error:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data produk' },
      { status: 500 }
    );
  }
}
