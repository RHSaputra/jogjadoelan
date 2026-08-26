"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/lib/auth-context";
import { emitSync } from "@/lib/sync-events";

/* ============================================================
 * TYPES
 * ============================================================ */
export type ChatFromRole = "user" | "admin" | "system";
export type ChatMsgStatus = "sending" | "sent" | "delivered" | "read" | "failed";
export type ChatFileKind = "image" | "video";

export interface ChatFile {
  url: string;          // data URL (mock) atau URL CDN nanti
  type: ChatFileKind;
  name?: string;
}

export type ChatContextKind = "komplain" | "order" | "produk" | "custom" | "validation";

export interface ChatContext {
  kind: ChatContextKind;
  refId: string;            // KMP-123 / ORD-456 / PRD-789
  label: string;            // "Komplain Refund — KMP-123"
  sublabel?: string;        // "Helm Bogo Retro · ORD-456"
  thumbnailUrl?: string;    // gambar produk (opsional)
  href: string;             // tujuan klik card (mis. "/komplain/KMP-123")
  validation?: {
    productName: string;
    photoUrl?: string;
    variant?: string;
    color?: string;
    qty: number;
    customNote?: string;
    orderId: string;
    orderStatus: string;
    status: "pending" | "approved" | "revision_requested";
    revisionNote?: string;
    adminId?: string;
    adminName?: string;
  };
}

export interface ChatMessage {
  id: string;
  from: ChatFromRole;
  text?: string;
  files?: ChatFile[];
  context?: ChatContext;
  createdAt: string;
  status: ChatMsgStatus;
}

/* ============================================================
 * KONFIGURASI JAM KERJA ADMIN
 * ============================================================ */
export const JAM_KERJA = {
  hariMulai: 1,   // Senin (0=Min, 6=Sab)
  hariAkhir: 6,   // Sabtu
  jamMulai: 9,
  jamAkhir: 17,
  zona: "WIB",
  ringkas: "Senin–Sabtu, 09.00–17.00 WIB",
};

export function isAdminInJamKerja(d: Date = new Date()): boolean {
  const day = d.getDay();
  const hour = d.getHours();
  const inDay = day >= JAM_KERJA.hariMulai && day <= JAM_KERJA.hariAkhir;
  const inHour = hour >= JAM_KERJA.jamMulai && hour < JAM_KERJA.jamAkhir;
  return inDay && inHour;
}

/* ============================================================
 * STORAGE & MAPPERS
 * ============================================================ */
const STORAGE_PREFIX = "jogjadoelan_chat_support_";
const keyFor = (uid: string) => `${STORAGE_PREFIX}${uid}`;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function toChatText(v: unknown): string | undefined {
  return typeof v === "string" && v.trim().length > 0 ? v : undefined;
}

const genId = () => `MSG-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function asChatContext(v: unknown): ChatContext | undefined {
  return v !== null && typeof v === "object" ? (v as ChatContext) : undefined;
}

function mapPrismaMessageToChatMessage(m: unknown): ChatMessage {
  if (!isRecord(m)) {
    return { id: genId(), from: "user", createdAt: new Date().toISOString(), status: "sent" };
  }

  const fromRoleRaw = m.fromRole;
  const from: ChatFromRole =
    fromRoleRaw === "USER" ? "user" : fromRoleRaw === "ADMIN" ? "admin" : fromRoleRaw === "SYSTEM" ? "system" : (typeof m.from === "string" ? (m.from as ChatFromRole) : "user");

  const statusRaw = m.status;
  const status: ChatMsgStatus =
    statusRaw === "SENDING" ? "sending" : statusRaw === "SENT" ? "sent" : statusRaw === "DELIVERED" ? "delivered" : statusRaw === "READ" ? "read" : "sent";

  const filesPathsRaw = m.filesPaths;
  const filesRecords = Array.isArray(filesPathsRaw) ? filesPathsRaw.filter(isRecord) : [];
  const files: ChatFile[] | undefined = filesRecords.length > 0
    ? filesRecords
        .map((fp) => ({
          url: typeof fp.url === "string" ? fp.url : "",
          type: (fp.type === "video" ? "video" : "image") as ChatFileKind,
          name: typeof fp.name === "string" ? fp.name : undefined,
        }))
        .filter((f) => f.url.length > 0)
    : undefined;

  const createdAt = typeof m.createdAt === "string" || typeof m.createdAt === "number"
    ? new Date(m.createdAt).toISOString()
    : new Date().toISOString();

  return {
    id: typeof m.id === "string" ? m.id : genId(),
    from,
    text: toChatText(m.pesan) ?? toChatText(m.text),
    files,
    context: asChatContext(m.context),
    createdAt,
    status,
  };
}

function loadMessages(uid: string): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(keyFor(uid));
    if (!raw) return [];
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.map((m): ChatMessage => {
      if (isRecord(m) && (typeof m.text === "string" || Array.isArray(m.files))) {
        return m as unknown as ChatMessage;
      }
      return mapPrismaMessageToChatMessage(m);
    });
  } catch {
    return [];
  }
}

function saveMessages(uid: string, msgs: ChatMessage[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(keyFor(uid), JSON.stringify(msgs));
  } catch {}
}

/* ============================================================
 * CONTEXT
 * ============================================================ */
interface ChatSupportCtx {
  hydrated: boolean;
  messages: ChatMessage[];
  adminOnline: boolean;
  adminTyping: boolean;
  unreadCount: number;
  send: (text: string, files?: ChatFile[], context?: ChatContext) => void;
  markAllRead: () => void;
  clearAll: () => void;
  attachContext: (ctx: ChatContext) => void;
  resync: () => void;
}

const Ctx = createContext<ChatSupportCtx | null>(null);

/* ============================================================
 * RETRY UTILITY FOR API CALLS
 * ============================================================ */
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3, delayMs = 1000): Promise<Response> {
  let lastError: Error | null = null;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastError = e as Error;
    }
    if (i < maxRetries - 1) {
      await new Promise((r) => setTimeout(r, delayMs * Math.pow(2, i))); // Exponential backoff
    }
  }
  throw lastError ?? new Error("Unknown error");
}

/* ============================================================
 * PROVIDER
 * ============================================================ */
interface PusherConnectionStates { current: string; previous: string; }
interface PusherConnection {
  bind(event: string, cb: (states: PusherConnectionStates) => void): void;
}
interface PusherChannel {
  bind(event: string, cb: (data: unknown) => void): void;
  unbind_all?(): void;
}
interface PusherClient {
  connection: PusherConnection;
  subscribe(channel: string): PusherChannel;
  unsubscribe(channel: string): void;
  disconnect(): void;
}

export function ChatSupportProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const uid = user?.id ?? "";

  const [hydrated, setHydrated] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [adminOnline, setAdminOnline] = useState<boolean>(() => isAdminInJamKerja());
  const [adminTyping, setAdminTyping] = useState(false);

  // Queue references for sending pending messages
  const queueRef = useRef<Set<string>>(new Set());

  // 1. Initial Load (DB + LocalStorage Fallback)
  useEffect(() => {
    if (!uid) {
      queueMicrotask(() => setHydrated(true));
      return;
    }

    let cancelled = false;
    const fetchInitial = async () => {
      // Muat data lokal dulu untuk mengambil pesan yang belum tersinkron
      const local = loadMessages(uid);

      try {
        const res = await fetch(`/api/chat/messages?userId=${encodeURIComponent(uid)}&limit=100`);
        const j = await res.json();
        if (!cancelled && j.ok && Array.isArray(j.data)) {
          const mapped: ChatMessage[] = j.data.map(mapPrismaMessageToChatMessage);
          
          // Merge pesan lokal yang statusnya sending/failed agar tidak hilang saat refresh
          const pendingLocal = local.filter(m => m.from === "user" && (m.status === "sending" || m.status === "failed"));
          const merged = [...mapped, ...pendingLocal.filter(p => !mapped.find(m => m.id === p.id))];
          merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

          setMessages(merged);
          saveMessages(uid, merged);
          setHydrated(true);
          return;
        }
      } catch {}

      // Fallback
      if (!cancelled) {
        setMessages(local);
        setHydrated(true);
      }
    };
    fetchInitial();

    return () => { cancelled = true; };
  }, [uid]);

  // 2. Persist to LocalStorage
  useEffect(() => {
    if (!hydrated || !uid) return;
    const timeout = setTimeout(() => saveMessages(uid, messages), 500);
    return () => clearTimeout(timeout);
  }, [hydrated, uid, messages]);

  // Admin Work Hours Check
  useEffect(() => {
    const tick = () => setAdminOnline(isAdminInJamKerja());
    tick();
    const t = window.setInterval(tick, 60_000);
    return () => window.clearInterval(t);
  }, []);

  // 3. Process Pending Queue
  useEffect(() => {
    if (!hydrated || !uid) return;

    const pending = messages.filter(m => m.from === "user" && m.status === "sending" && !queueRef.current.has(m.id));
    
    pending.forEach(async (msg) => {
      queueRef.current.add(msg.id);
      try {
        await fetchWithRetry("/api/chat/send", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: msg.id, userId: uid, text: msg.text, files: msg.files ?? [], context: msg.context ?? undefined }),
        }, 3);
        
        // Success
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: "sent" } : m));
        emitSync("chat");
      } catch {
        // Failed -> show failed status
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: "failed" } : m));
      } finally {
        queueRef.current.delete(msg.id);
      }
    });
  }, [messages, hydrated, uid]);

  // 4. Sync Function (Used after reconnect)
  const resync = useCallback(async () => {
    if (!uid) return;
    try {
      // Get the latest message date we have
      let afterCursor: string | null = null;
      setMessages(prev => {
        if (prev.length > 0) {
          afterCursor = prev[prev.length - 1].createdAt;
        }
        return prev;
      });

      let url = `/api/chat/messages?userId=${encodeURIComponent(uid)}&limit=100`;
      if (afterCursor) {
        url += `&afterCursor=${encodeURIComponent(afterCursor)}`;
      }

      const res = await fetch(url);
      const j = await res.json();
      if (j.ok && Array.isArray(j.data) && j.data.length > 0) {
        const mapped: ChatMessage[] = j.data.map(mapPrismaMessageToChatMessage);
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMsgs = mapped.filter((m: ChatMessage) => !existingIds.has(m.id));
          if (newMsgs.length === 0) return prev;
          
          const combined = [...prev, ...newMsgs];
          combined.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          return combined;
        });
      }
    } catch {}
  }, [uid]);

  // 5. Pusher Real-time Events & Reconnect Handling
  useEffect(() => {
    if (!uid) return;

    let pusherClient: PusherClient | null = null;
    let channel: PusherChannel | null = null;
    let mounted = true;
    let pollTimer: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (pollTimer) return;
      pollTimer = setInterval(() => {
        if (mounted) resync();
      }, 15000);
    };

    (async () => {
      try {
        const Pusher = (await import("pusher-js")).default;
        const key = process.env.NEXT_PUBLIC_PUSHER_KEY || "f3e9ef9647495d6eb53f";
        const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap1";
        
        pusherClient = new Pusher(key, { cluster, authEndpoint: "/api/pusher/auth" });
        
        // Listen to state changes for auto-reconnect sync
        pusherClient.connection.bind('state_change', (states: PusherConnectionStates) => {
          if (states.current === 'connected' && states.previous !== 'connected') {
            resync(); // Automatically fetch missing messages when reconnected
          }
        });

        channel = pusherClient.subscribe(`private-chat-${uid}`);
        
        channel.bind("admin:message", (m: unknown) => {
          if (!mounted) return;
          const newMsg = mapPrismaMessageToChatMessage(m);
          setMessages(prev => {
            if (prev.some(existing => existing.id === newMsg.id)) {
              return prev.map(existing => existing.id === newMsg.id ? newMsg : existing);
            }
            return [...prev, newMsg].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          });
          
          // Ack Delivery automatically
          fetch("/api/chat/delivered", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messageId: newMsg.id })
          }).catch(() => {});
        });

        channel.bind("user:message", (m: unknown) => {
          if (!mounted) return;
          const newMsg = mapPrismaMessageToChatMessage(m);
          setMessages(prev => {
            if (prev.some(existing => existing.id === newMsg.id)) {
              return prev.map(existing => existing.id === newMsg.id ? newMsg : existing);
            }
            return [...prev, newMsg].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          });
        });

        // Other bindings
        channel.bind("admin:typing", (data: unknown) => setAdminTyping(Boolean(data)));
        channel.bind("admin:read", () => {
          setMessages(prev => prev.map(m => m.from === "user" ? { ...m, status: "read" } : m));
        });
        channel.bind("admin:delivered", () => {
          setMessages(prev => prev.map(m => m.from === "user" && m.status === "sent" ? { ...m, status: "delivered" } : m));
        });
        channel.bind("admin:online", (data: unknown) => setAdminOnline(Boolean(data)));

        channel.bind("admin:delete-message", (data: unknown) => {
          if (!mounted || !isRecord(data) || !data.messageId) return;
          setMessages(prev => prev.filter(m => m.id !== data.messageId));
        });
        channel.bind("admin:delete-room", () => {
          if (!mounted) return;
          setMessages([]);
        });

      } catch {
        startPolling();
      }
    })();

    return () => {
      mounted = false;
      if (pollTimer) clearInterval(pollTimer);
      try {
        channel?.unbind_all?.();
        pusherClient?.unsubscribe?.(`private-chat-${uid}`);
        pusherClient?.disconnect?.();
      } catch {}
    };
  }, [uid, resync]);

  /* ----------------------------------------------------------
   * ACTIONS
   * ---------------------------------------------------------- */
  const send = useCallback((text: string, files?: ChatFile[], context?: ChatContext) => {
    if (!uid) return;
    const trimmed = text.trim();
    if (!trimmed && (!files || files.length === 0) && !context) return;

    const msg: ChatMessage = {
      id: genId(),
      from: "user",
      text: trimmed || undefined,
      files: files && files.length > 0 ? files : undefined,
      context: context ?? undefined,
      createdAt: new Date().toISOString(),
      status: "sending",
    };
    
    // Add to state -> Triggers queue processor effect automatically
    setMessages(prev => [...prev, msg]);
  }, [uid]);

  const markAllRead = useCallback(() => {
    setMessages((prev) => prev.map((m) => (m.from === "admin" ? { ...m, status: "read" } : m)));
    if (uid) {
      fetch("/api/chat/read", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: uid }),
      })
        .then(() => emitSync("chat"))
        .catch(() => {});
    }
  }, [uid]);

  const clearAll = useCallback(() => {
    setMessages([]);
    if (uid) saveMessages(uid, []);
  }, [uid]);

  const attachContext = useCallback((ctx: ChatContext) => {
    if (!uid) return;
    setMessages((prev) => {
      const recent = prev.slice(-5);
      const already = recent.some((m) => m.context?.kind === ctx.kind && m.context.refId === ctx.refId);
      if (already) return prev;
      const sysMsg: ChatMessage = {
        id: genId(),
        from: "system",
        text: `📌 Membahas: ${ctx.label}`,
        context: ctx,
        createdAt: new Date().toISOString(),
        status: "read",
      };
      return [...prev, sysMsg];
    });
  }, [uid]);

  const unreadCount = useMemo(() => messages.filter((m) => m.from === "admin" && m.status !== "read").length, [messages]);

  const value: ChatSupportCtx = {
    hydrated,
    messages,
    adminOnline,
    adminTyping,
    unreadCount,
    send,
    markAllRead,
    clearAll,
    attachContext,
    resync,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChatSupport(): ChatSupportCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useChatSupport harus dipakai di dalam <ChatSupportProvider>");
  return c;
}