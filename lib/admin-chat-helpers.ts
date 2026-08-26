"use client";

import {
  isAdminInJamKerja, JAM_KERJA,
  type ChatFile, type ChatMessage, type ChatMsgStatus, type ChatContext,
} from "@/lib/chat-support-context";
import { emitSync } from "@/lib/sync-events";

/* ====================  PRISMA→CHATMESSAGE MAPPER  ==================== */

/** Map raw Prisma record → ChatMessage */
function mapPrismaToChatMessage(m: Record<string, unknown>): ChatMessage {
  const from: ChatMessage["from"] =
    m.fromRole === "USER" ? "user" : m.fromRole === "ADMIN" ? "admin" : m.fromRole === "SYSTEM" ? "system" : (typeof m.from === "string" ? m.from as ChatMessage["from"] : "user");
  const status: ChatMsgStatus =
    m.status === "SENDING" ? "sending" : m.status === "SENT" ? "sent" : m.status === "DELIVERED" ? "delivered" : m.status === "READ" ? "read" : "sent";
  const text = typeof m.pesan === "string" ? m.pesan : typeof m.text === "string" ? m.text : undefined;
  let files: ChatFile[] | undefined;
  if (Array.isArray(m.filesPaths) && m.filesPaths.length > 0) {
    files = (m.filesPaths as Array<{ url?: unknown; type?: unknown; name?: unknown }>)
      .filter((fp) => typeof fp.url === "string")
      .map((fp) => ({ url: String(fp.url), type: (fp.type === "video" ? "video" : "image") as ChatFile["type"], name: typeof fp.name === "string" ? fp.name : undefined }));
  } else if (Array.isArray(m.files) && m.files.length > 0) {
    files = m.files as unknown as ChatFile[];
  }
  return {
    id: typeof m.id === "string" ? m.id : `MSG-${Date.now()}`,
    from,
    text,
    files,
    context: (m.context as ChatContext) ?? undefined,
    createdAt: typeof m.createdAt === "string" ? m.createdAt : new Date().toISOString(),
    status,
  };
}

function mapServerRoom(room: Record<string, unknown>): ChatRoom {
  const userId = String(room.userId ?? "");
  const msgsArr = Array.isArray(room.messages)
    ? room.messages.map((m: Record<string, unknown>) => mapPrismaToChatMessage(m))
    : [];
  const last = msgsArr.length > 0 ? msgsArr[msgsArr.length - 1] : undefined;
  const unread = msgsArr.filter((m) => m.from === "user" && m.status !== "read").length;
  return {
    userId,
    userName: String(room.userName ?? room.userEmail ?? `User ${userId.slice(0, 6)}`),
    userEmail: room.userEmail ? String(room.userEmail) : undefined,
    userAvatar: room.userAvatar ? String(room.userAvatar) : undefined,
    messages: msgsArr,
    lastMessage: last,
    lastAt: last ? new Date(last.createdAt).getTime() : (typeof room.lastAt === "number" ? room.lastAt : 0),
    totalMessages: msgsArr.length,
    unreadFromUser: unread,
    hasUserPending: unread > 0,
  };
}

/* ====================  ROOMS  ==================== */

export interface ChatRoom {
  userId: string;
  userName: string;
  userEmail?: string;
  userAvatar?: string;
  messages: ChatMessage[];
  lastMessage?: ChatMessage;
  lastAt: number;
  totalMessages: number;
  unreadFromUser: number;
  hasUserPending: boolean;
}

/**
 * Fetch all chat rooms from server API.
 * This is the primary source of truth — localStorage is no longer used.
 */
export async function getAllChatRoomsAsync(): Promise<ChatRoom[]> {
  if (typeof window === "undefined") return [];
  try {
    const res = await fetch("/api/admin/chat/rooms", { cache: "no-store" });
    if (!res.ok) return [];
    const j = await res.json();
    if (!j.ok || !Array.isArray(j.data)) return [];
    return j.data.map((room: Record<string, unknown>) => mapServerRoom(room));
  } catch (e) {
    console.error("[admin-chat-helpers] getAllChatRoomsAsync failed", e);
    return [];
  }
}

/**
 * Fetch single chat room from server API.
 */
export async function getChatRoomAsync(userId: string): Promise<ChatRoom | null> {
  if (!userId || typeof window === "undefined") return null;
  const all = await getAllChatRoomsAsync();
  return all.find((r) => r.userId === userId) ?? null;
}

/** @deprecated Gunakan getAllChatRoomsAsync() — localStorage sudah tidak didukung */
export function getAllChatRooms(): ChatRoom[] { return []; }

/** @deprecated Gunakan getChatRoomAsync() — localStorage sudah tidak didukung */
export function getChatRoom(_userId: string): ChatRoom | null { void _userId; return null; }

/* ====================  FILTER ROOMS (async)  ==================== */

export type ChatRoomTab = "all" | "pending" | "today" | "offline";

export interface ChatRoomFilter {
  tab?: ChatRoomTab;
  q?: string;
}

/**
 * Fetch & filter chat rooms from server API.
 */
export async function listChatRoomsForAdminAsync(f: ChatRoomFilter = {}): Promise<ChatRoom[]> {
  let arr = await getAllChatRoomsAsync();
  const tab = f.tab ?? "all";
  const now = Date.now();
  const TODAY = 24 * 60 * 60 * 1000;
  if (tab === "pending") {
    arr = arr.filter((r) => r.hasUserPending);
  } else if (tab === "today") {
    arr = arr.filter((r) => now - r.lastAt < TODAY);
  } else if (tab === "offline") {
    arr = arr.filter(
      (r) => r.lastMessage?.from === "user" && r.lastMessage.status !== "read",
    );
  }
  if (f.q) {
    const q = f.q.toLowerCase();
    arr = arr.filter(
      (r) =>
        r.userName.toLowerCase().includes(q) ||
        (r.userEmail ?? "").toLowerCase().includes(q) ||
        r.userId.toLowerCase().includes(q) ||
        (r.lastMessage?.text ?? "").toLowerCase().includes(q),
    );
  }
  return arr;
}

/**
 * Get chat stats from server API.
 */
export async function getChatStatsAsync(): Promise<{
  total: number; pending: number; today: number; totalMessages: number;
}> {
  const all = await getAllChatRoomsAsync();
  const now = Date.now();
  const TODAY = 24 * 60 * 60 * 1000;
  return {
    total: all.length,
    pending: all.filter((r) => r.hasUserPending).length,
    today: all.filter((r) => now - r.lastAt < TODAY).length,
    totalMessages: all.reduce((s, r) => s + r.totalMessages, 0),
  };
}

/** @deprecated Gunakan listChatRoomsForAdminAsync() — localStorage sudah tidak didukung */
export function listChatRoomsForAdmin(_f?: ChatRoomFilter): ChatRoom[] { void _f; return []; }

/** @deprecated Gunakan getChatStatsAsync() — localStorage sudah tidak didukung */
export function getChatStats() { return { total: 0, pending: 0, today: 0, totalMessages: 0 }; }

/** @deprecated Tidak perlu sync ke localStorage lagi — baca langsung dari API */
export function syncRoomsFromServer(): Promise<void> { return Promise.resolve(); }

/* ====================  AKSI ADMIN  ==================== */

/** Kirim balasan dari admin ke user. Sekaligus tandai semua msg user sbg "read". */
export async function adminSendMessage(
  userId: string,
  text: string,
  files?: ChatFile[],
  context?: ChatContext,
): Promise<ChatMessage | null> {
  if (!userId) return null;
  const trimmed = text.trim();
  if (!trimmed && (!files || files.length === 0) && !context) return null;
  try {
    const res = await fetch("/api/admin/chat/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, text: trimmed, files: files ?? [], context: context ?? undefined }),
    });
    const j = await res.json();
    if (!j.ok) return null;
    return mapPrismaToChatMessage(j.data);
  } catch (e) {
    console.error("adminSendMessage error", e);
    return null;
  }
}

/** Tandai semua pesan user sebagai sudah dibaca admin (tanpa kirim balasan). */
export async function adminMarkUserMessagesRead(userId: string): Promise<number> {
  try {
    const res = await fetch("/api/admin/chat/read", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const j = await res.json();
    if (!j.ok) return 0;
    
    if (j.data?.count > 0) {
      emitSync("chat");
    }
    return j.data?.count ?? 0;
  } catch (e) {
    console.error("adminMarkUserMessagesRead error", e);
    return 0;
  }
}

/** Hapus seluruh room chat user (clear storage). */
export async function adminDeleteRoom(userId: string): Promise<boolean> {
  try {
    const res = await fetch("/api/admin/chat/deleteRoom", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const j = await res.json();
    if (!j.ok) return false;
    emitSync("chat");
    return true;
  } catch (e) {
    console.error("adminDeleteRoom error", e);
    return false;
  }
}

/** Hapus satu pesan dari room. */
export async function adminDeleteMessage(userId: string, msgId: string): Promise<boolean> {
  try {
    const res = await fetch("/api/admin/chat/deleteMessage", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messageId: msgId }),
    });
    const j = await res.json();
    if (!j.ok) return false;
    emitSync("chat");
    return true;
  } catch (e) {
    console.error("adminDeleteMessage error", e);
    return false;
  }
}

/* ====================  FORMAT HELPERS  ==================== */

export function formatChatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  }
  const diffDay = Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDay === 1) return "Kemarin";
  if (diffDay < 7) return d.toLocaleDateString("id-ID", { weekday: "short" });
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export function formatChatDateLong(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export { JAM_KERJA, isAdminInJamKerja };