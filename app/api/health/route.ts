import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.DATABASE_URL || "";
  let diag: Record<string, unknown> = {};
  try {
    const u = new URL(url);
    diag = {
      user: u.username,
      port: u.port,
      path: u.pathname,
      passwordLen: u.password.length,
      startsWithQuote: url.startsWith('"') || url.startsWith("'"),
      endsWithQuote: url.endsWith('"') || url.endsWith("'"),
      hasNewline: url.includes("\n") || url.includes("\r"),
    };
  } catch (e: any) {
    diag = { parseError: e.message };
  }

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
      diag,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        message: error?.message,
        code: error?.code,
        diag,
        dbUrlDefined: Boolean(process.env.DATABASE_URL),
        dbUrlHost: process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).hostname : null,
      },
      { status: 500 },
    );
  }
}
