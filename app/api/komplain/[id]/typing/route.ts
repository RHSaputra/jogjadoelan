import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import pusher from "@/lib/pusher-server";
import { getSessionUser } from "@/lib/auth-server";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const body = await req.json();
    const { isTyping, fromRole } = body;

    if (isTyping === undefined || !fromRole) {
      return NextResponse.json({ ok: false, error: "missing required fields" }, { status: 400 });
    }

    await pusher.trigger(`private-komplain-${id}`, "typing", {
      fromRole,
      isTyping,
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (e) {
    logger.error(`/api/komplain/typing error`, e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
