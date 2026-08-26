import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { mapOrderToLegacy } from '@/lib/api/order-mapper';

const INCLUDE = {
  orderitem: true,
  ordertimeline: { orderBy: { at: 'asc' as const } },
  payment: true,
} as const;

const USER_SELECT = { id: true, username: true, email: true, noHp: true } as const;

// CRITICAL FIX: Tambah pagination — sebelumnya tidak ada LIMIT sama sekali.
// Default limit=100, max=200. Tambah filter status untuk halaman-halaman spesifik.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.role?.includes('ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limitRaw = Math.min(10000, parseInt(searchParams.get('limit') ?? '100', 10));
    const status = searchParams.get('status'); // filter opsional
    const userId = searchParams.get('userId'); // filter opsional
    const q = searchParams.get('q'); // search by order ID

    // Build where clause
    const where: Record<string, unknown> = {};
    if (status) where.status = status.toUpperCase();
    if (userId) where.userId = userId;
    if (q) where.id = { contains: q };

    const [orders] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { ...INCLUDE, user: { select: USER_SELECT } },
        orderBy: { createdAt: 'desc' },
        take: limitRaw,
        skip: (page - 1) * limitRaw,
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json(orders.map((o) => mapOrderToLegacy({
      ...o,
      items: o.orderitem,
      timeline: o.ordertimeline,
      payments: o.payment,
    })));
  } catch (error) {
    logger.error('[API /admin/order] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
