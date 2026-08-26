import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.role.includes("ADMIN")) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const { id } = await context.params;

    const broadcast = await prisma.whatsappbroadcast.findUnique({
      where: { id },
    });

    if (!broadcast) {
      return NextResponse.json({ error: { message: "Broadcast not found" } }, { status: 404 });
    }

    // Delete the broadcast logs first
    await prisma.whatsappbroadcastlog.deleteMany({
      where: { broadcastId: id },
    });

    // Delete the broadcast
    await prisma.whatsappbroadcast.delete({
      where: { id },
    });

    return NextResponse.json({ data: { message: "Broadcast history deleted successfully" } });
  } catch (error) {
    console.error("[DELETE_BROADCAST_ERROR]", error);
    return NextResponse.json({ error: { message: error instanceof Error ? error.message || "Internal Server Error" : "Internal Server Error" } }, { status: 500 });
  }
}
