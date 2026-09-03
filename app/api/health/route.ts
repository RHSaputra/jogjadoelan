import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const start = Date.now();
    const count = await prisma.produk.count();
    const duration = Date.now() - start;
    return NextResponse.json({
      status: "ok",
      duration,
      productCount: count,
      dbUrlDefined: Boolean(process.env.DATABASE_URL),
      dbUrlHost: process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).hostname : null,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
        dbUrlDefined: Boolean(process.env.DATABASE_URL),
        dbUrlHost: process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).hostname : null,
      },
      { status: 500 },
    );
  }
}
