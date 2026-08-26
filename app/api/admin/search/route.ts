import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ADMIN_MENU } from "@/lib/admin-constants";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();

    if (!q) {
      return NextResponse.json([]);
    }

    // Limit setiap entitas maksimal 5 agar pencarian cepat
    const limit = 5;

    // Gunakan Promise.all untuk concurrent queries
    const [
      produk,
      pesanan,
      pelanggan,
      chat,
      audit,
      broadcast,
      komplain,
      customorder,
      voucher,
    ] = await Promise.all([
      // 1. Produk & Inventory
      prisma.produk.findMany({
        where: {
          OR: [
            { nama: { contains: q } },
            { sku: { contains: q } },
          ],
        },
        take: limit,
      }),

      // 2. Pesanan
      prisma.order.findMany({
        where: {
          OR: [
            { id: { contains: q } },
            { resi: { contains: q } },
            { user: { username: { contains: q } } },
            { user: { email: { contains: q } } },
          ],
        },
        include: { user: true },
        take: limit,
      }),

      // 3. Customer (User biasa)
      prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: q } },
            { email: { contains: q } },
            { noHp: { contains: q } },
          ],
        },
        take: limit,
      }),

      // 4. Chat
      prisma.chatsupportmessage.findMany({
        where: {
          pesan: { contains: q },
        },
        include: { user: true },
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),

      // 5. Audit Log
      prisma.auditlog.findMany({
        where: {
          OR: [
            { entityId: { contains: q } },
            { adminName: { contains: q } },
          ],
        },
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),

      // 6. Broadcast
      prisma.broadcast.findMany({
        where: {
          OR: [
            { judul: { contains: q } },
            { isi: { contains: q } },
          ],
        },
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),

      // 7. Komplain / Return / Tukar
      prisma.komplain.findMany({
        where: {
          OR: [
            { id: { contains: q } },
            { deskripsi: { contains: q } },
            { orderId: { contains: q } },
            { user: { username: { contains: q } } },
          ]
        },
        include: { user: true },
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),

      // 8. Custom Order
      prisma.customorder.findMany({
        where: {
          OR: [
            { id: { contains: q } },
            { jenis: { contains: q } },
            { user: { username: { contains: q } } },
          ]
        },
        include: { user: true },
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),

      // 9. Voucher
      prisma.voucher.findMany({
        where: {
          OR: [
            { kode: { contains: q } },
            { judul: { contains: q } },
          ]
        },
        take: limit,
      }),
    ]);

    // Format Data Hasil Pencarian
    const results = [
      ...produk.map((p) => ({
        category: "Produk & Inventory",
        id: p.id,
        title: p.nama,
        subtitle: `SKU: ${p.sku ?? "-"} | Stok: ${p.stok}`,
        href: `/admin/produk/${p.id}/edit`,
      })),
      ...pesanan.map((o) => ({
        category: "Pesanan Reguler",
        id: o.id,
        title: `Order: ${o.id}`,
        subtitle: `${o.user?.username ?? "-"} - Status: ${o.status}`,
        href: `/admin/pesanan?search=${o.id}`,
      })),
      ...customorder.map((co) => ({
        category: "Custom Order",
        id: co.id,
        title: `Custom: ${co.id}`,
        subtitle: `${co.user?.username ?? "-"} - Status: ${co.status}`,
        href: `/admin/custom?search=${co.id}`,
      })),
      ...komplain.map((k) => ({
        category: "Komplain",
        id: k.id,
        title: `Komplain: ${k.jenisLabel} - ${k.id}`,
        subtitle: `Oleh: ${k.user?.username ?? "-"} - Status: ${k.status}`,
        href: `/admin/komplain?search=${k.id}`,
      })),
      ...voucher.map((v) => ({
        category: "Promo & Voucher",
        id: v.id,
        title: v.kode,
        subtitle: `${v.judul} | Kuota: ${v.kuota ?? "∞"}`,
        href: `/admin/promo`,
      })),
      ...pelanggan.map((u) => ({
        category: "Customer",
        id: u.id,
        title: u.username,
        subtitle: `${u.email} | ${u.noHp}`,
        href: `/admin/pelanggan?search=${u.username}`,
      })),
      ...chat.map((c) => ({
        category: "Chat",
        id: c.id,
        title: `Pesan dari ${c.user?.username ?? "-"}`,
        subtitle: c.pesan?.substring(0, 50) + (c.pesan && c.pesan.length > 50 ? "..." : ""),
        href: `/admin/chat?userId=${c.userId}`,
      })),
      ...audit.map((a) => ({
        category: "Audit Log",
        id: a.id,
        title: `Action: ${a.action}`,
        subtitle: `Oleh: ${a.adminName ?? "Sistem"} - Ref: ${a.entityId ?? "-"}`,
        href: `/admin/audit?search=${a.entityId}`,
      })),
      ...broadcast.map((b) => ({
        category: "Broadcast",
        id: b.id,
        title: b.judul,
        subtitle: b.isi.substring(0, 50) + (b.isi.length > 50 ? "..." : ""),
        href: `/admin/broadcast`,
      })),
    ];

    // --- Search Menu Navigasi ---
    type AdminSearchItem = {
      category: string;
      id: string;
      title: string;
      subtitle: string;
      href: string;
    };
    const menuMatches: AdminSearchItem[] = [];
    ADMIN_MENU.forEach((section) => {
      section.items.forEach((item) => {
        if (
          item.label.toLowerCase().includes(q.toLowerCase()) ||
          section.title.toLowerCase().includes(q.toLowerCase())
        ) {
          menuMatches.push({
            category: "Menu & Navigasi",
            id: `menu-${item.href}`,
            title: item.label,
            subtitle: `Menu > ${section.title}`,
            href: item.href,
          });
        }
      });
    });

    // Masukkan menu di urutan paling atas agar mudah diakses
    results.unshift(...menuMatches.slice(0, limit));

    return NextResponse.json(results);
  } catch (error) {
    console.error("[SEARCH_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
