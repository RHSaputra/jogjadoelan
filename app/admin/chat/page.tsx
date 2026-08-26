"use client";

import { Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle, ArrowLeft, Check, CheckCheck, ChevronRight, Clock,
  MessageCircle, MoreVertical, Package, Paperclip, Search, Send, Trash2, X,
  ZoomIn,
} from "lucide-react";
import type PusherClient from "pusher-js";
import type { Channel } from "pusher-js";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { SuccessModal } from "@/components/admin/SuccessModal";
import type { ChatFile, ChatMessage, ChatContext } from "@/lib/chat-support-context";
import {
  adminDeleteMessage, adminDeleteRoom, adminMarkUserMessagesRead,
  adminSendMessage, formatChatTime, getChatStatsAsync,
  isAdminInJamKerja, JAM_KERJA, listChatRoomsForAdminAsync,
  type ChatRoom, type ChatRoomTab,
} from "@/lib/admin-chat-helpers";
import type { Order } from "@/lib/orders-storage";
import type { CustomOrder } from "@/lib/custom-order-context";

const emptySubscribe = () => () => {};

interface ValidationItem {
  nama?: string;
  gambar?: string | null;
  ukuran?: string;
  warna?: string;
  qty?: number;
}

interface ValidationSource {
  id: string;
  status: string;
  items?: ValidationItem[];
  customMeta?: { notes?: string } | null;
  jenis?: string;
  ukuran?: string;
  notes?: string;
  warnaCatatan?: string;
  referensiFiles?: { dataUrl?: string }[];
  warnaList?: { nama?: string; hex?: string }[];
}

const TABS: { key: ChatRoomTab; label: string; alert?: boolean }[] = [
  { key: "all", label: "Semua" },
  { key: "pending", label: "Perlu Dibalas", alert: true },
  { key: "today", label: "Hari Ini" },
  { key: "offline", label: "Belum Dibaca" },
];

function AdminChat({ userIdParam, customIdParam }: { userIdParam: string | null; customIdParam: string | null }) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState<ChatRoomTab>("all");
  const [q, setQ] = useState("");
  const [activeId, setActiveId] = useState<string | null>(userIdParam);

  const [draft, setDraft] = useState("");
  const [attached, setAttached] = useState<ChatFile[]>([]);
  const [showRoomMenu, setShowRoomMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ type: "room" | "msg"; id?: string } | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [pendingContext, setPendingContext] = useState<ChatContext | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [userTyping, setUserTyping] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [activeCustomOrders, setActiveCustomOrders] = useState<CustomOrder[]>([]);

  // States untuk Validasi Produk Pesanan
  const [selectedOrderForValidation, setSelectedOrderForValidation] = useState<ValidationSource | null>(null);
  const [selectedItemForValidation, setSelectedItemForValidation] = useState<ValidationItem | null>(null);
  const [valPhoto, setValPhoto] = useState("");
  const [valName, setValName] = useState("");
  const [valVariant, setValVariant] = useState("");
  const [valColor, setValColor] = useState("");
  const [valQty, setValQty] = useState(1);
  const [valCustomNote, setValCustomNote] = useState("");
  const [valOrderId, setValOrderId] = useState("");
  const [valOrderStatus, setValOrderStatus] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!customIdParam || userIdParam) return;
    let cancelled = false;
    import("@/lib/admin-custom-helpers").then(async ({ getCustomOrderById }) => {
      const order = await getCustomOrderById(customIdParam);
      if (!cancelled && order?.userId) {
        setTab("all");
        setActiveId(order.userId);
      }
    });
    return () => { cancelled = true; };
  }, [userIdParam, customIdParam]);
  useEffect(() => {
    const onChange = () => setTick((t) => t + 1);
    window.addEventListener("storage", onChange);
    window.addEventListener("jogjadoelan_chat_changed", onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("jogjadoelan_chat_changed", onChange);
    };
  }, []);

  const [stats, setStats] = useState<null | { total: number; pending: number; today: number; totalMessages: number }>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);

  // subscribe to admin pusher channel to get realtime notifications
  useEffect(() => {
    let pusherClient: PusherClient | null = null;
    let channel: Channel | null = null;
    let mounted = true;
    let pollTimer: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (pollTimer) return;
      pollTimer = setInterval(() => {
        if (mounted) setTick((t) => t + 1);
      }, 5000);
    };

    (async () => {
      try {
        const Pusher = (await import("pusher-js")).default;
        const key = process.env.NEXT_PUBLIC_PUSHER_KEY || "f3e9ef9647495d6eb53f";
        const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap1";
        pusherClient = new Pusher(key, { cluster, authEndpoint: "/api/pusher/auth" });
        channel = pusherClient.subscribe("admin-chat");
        channel.bind("user:message", () => {
          if (!mounted) return;
          setTick((t) => t + 1);
        });
      } catch {
        // ignore and fallback to polling
        startPolling();
      }
    })();
    return () => {
      mounted = false;
      if (pollTimer) clearInterval(pollTimer);
      try {
        if (channel) channel.unbind_all();
        if (pusherClient) {
          pusherClient.unsubscribe("admin-chat");
          pusherClient.disconnect();
        }
      } catch { }
    };
  }, []);

  // Pencarian produk manual dihilangkan karena validasi terikat ke pesanan aktif



  // Subscribe to active room's private channel to receive messages, read states, and typing events in real time
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset indikator typing saat pindah room
    setUserTyping(false);
    if (!activeId) return;

    let pusherClient: PusherClient | null = null;
    let channel: Channel | null = null;
    let mounted = true;

    (async () => {
      try {
        const Pusher = (await import("pusher-js")).default;
        const key = process.env.NEXT_PUBLIC_PUSHER_KEY || "f3e9ef9647495d6eb53f";
        const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap1";
        pusherClient = new Pusher(key, { cluster, authEndpoint: "/api/pusher/auth" });
        channel = pusherClient.subscribe(`private-chat-${activeId}`);

        channel.bind("user:message", (msg: { id?: string }) => {
          if (!mounted) return;
          setTick((t) => t + 1);

          // Ack Delivery automatically
          fetch("/api/admin/chat/delivered", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: activeId, messageId: msg.id })
          }).catch(() => { });
        });

        channel.bind("user:typing", (payload: { isTyping?: boolean }) => {
          if (!mounted) return;
          setUserTyping(Boolean(payload.isTyping));
        });

        channel.bind("user:read", () => {
          if (!mounted) return;
          setTick((t) => t + 1);
        });

        channel.bind("admin:delivered", () => {
          if (!mounted) return;
          setRooms((prev) => prev.map(r => r.userId === activeId ? {
            ...r,
            messages: r.messages.map(m => m.from === "admin" && m.status === "sent" ? { ...m, status: "delivered" } : m)
          } : r));
        });
      } catch {
        // ignore
      }
    })();

    return () => {
      mounted = false;
      try {
        if (channel) channel.unbind_all();
        if (pusherClient) {
          pusherClient.unsubscribe(`private-chat-${activeId}`);
          pusherClient.disconnect();
        }
      } catch { }
    };
  }, [activeId]);

  // Async fetch rooms from server on mount + tick
  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    (async () => {
      const [fetchedRooms, fetchedStats] = await Promise.all([
        listChatRoomsForAdminAsync({ tab, q }),
        getChatStatsAsync(),
      ]);
      if (!cancelled) {
        setRooms(fetchedRooms);
        setStats(fetchedStats);
      }
    })();
    return () => { cancelled = true; };
  }, [mounted, tab, q, tick]);
  const active = useMemo(
    () => rooms.find((r) => r.userId === activeId) ?? null,
    [rooms, activeId],
  );

  useEffect(() => {
    if (!productModalOpen || !active?.userId) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tampilkan loading saat modal membuka data
    setModalLoading(true);
    (async () => {
      try {
        const [orders, customs] = await Promise.all([
          import("@/lib/orders-storage").then(m => m.getAllOrdersGlobal()),
          import("@/lib/admin-custom-helpers").then(m => m.listCustomOrdersForAdmin()),
        ]);
        if (cancelled) return;
        const ongoingOrders = orders.filter(o =>
          o.userId === active.userId &&
          !["selesai", "dibatalkan", "kadaluarsa"].includes(o.status)
        );
        const ongoingCustoms = customs.filter(o =>
          o.userId === active.userId &&
          !["selesai", "dibatalkan", "ditolak", "dibatalkan"].includes(o.status)
        );
        setActiveOrders(ongoingOrders);
        setActiveCustomOrders(ongoingCustoms);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setModalLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [productModalOpen, active?.userId]);

  const adminOnline = mounted ? isAdminInJamKerja() : false;

  /* auto scroll bottom saat ada msg baru */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [active?.messages.length, activeId]);

  /* auto mark read saat buka room atau ada pesan baru dari user */
  const lastUserMsgId = useMemo(() => {
    if (!active) return null;
    const userMsgs = active.messages.filter((m) => m.from === "user");
    return userMsgs.length > 0 ? userMsgs[userMsgs.length - 1].id : null;
  }, [active]);

  useEffect(() => {
    if (active && active.unreadFromUser > 0) {
      void adminMarkUserMessagesRead(active.userId).then(() => {
        setTick((t) => t + 1);
      });
    }
  }, [activeId, lastUserMsgId]); // eslint-disable-line

  function refresh() { setTick((t) => t + 1); }

  async function handleAttachFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const list: ChatFile[] = [];
    for (const f of files) {
      const isImg = f.type.startsWith("image/");
      const isVid = f.type.startsWith("video/");
      if (!isImg && !isVid) continue;
      const dataUrl = await new Promise<string>((res) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.readAsDataURL(f);
      });
      list.push({ url: dataUrl, type: isImg ? "image" : "video", name: f.name });
    }
    setAttached((prev) => [...prev, ...list]);
    if (fileRef.current) fileRef.current.value = "";
  }

  // FIX BUG 8: Await adminSendMessage before refresh to ensure UI updates properly
  const sendTypingEvent = async (isTyping: boolean) => {
    if (!active?.userId) return;
    try {
      await fetch("/api/chat/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: active.userId, isTyping, fromRole: "ADMIN" }),
      });
    } catch { }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(e.target.value);
    sendTypingEvent(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingEvent(false);
    }, 2000);
  };

  async function handleSend(overrideContext?: ChatContext) {
    if (!active) return;

    // Cegah React MouseEvent tersimpan ke database secara tidak sengaja
    let safeContext = overrideContext;
    if (safeContext && typeof safeContext === "object" && "nativeEvent" in safeContext) {
      safeContext = undefined;
    }

    const ctx = safeContext ?? pendingContext;
    if (!draft.trim() && attached.length === 0 && !ctx) return;

    const txt = draft.trim();
    const att = [...attached];

    setDraft("");
    setAttached([]);
    setPendingContext(null);

    // Optimistic Message Update
    const tempId = `MSG-${Date.now()}`;
    const optMsg: ChatMessage = {
      id: tempId,
      from: "admin",
      text: txt || undefined,
      files: att.length > 0 ? att : undefined,
      context: ctx ?? undefined,
      createdAt: new Date().toISOString(),
      status: "sending"
    };

    setRooms(prev => prev.map(r => r.userId === active.userId ? {
      ...r,
      messages: [...r.messages, optMsg],
      lastMessage: optMsg,
      lastAt: Date.now()
    } : r));

    sendTypingEvent(false);

    try {
      const resMsg = await adminSendMessage(active.userId, txt, att, ctx ?? undefined);
      if (resMsg) {
        setRooms(prev => prev.map(r => r.userId === active.userId ? {
          ...r,
          messages: r.messages.map(m => m.id === tempId ? { ...resMsg, status: "sent" } : m)
        } : r));
      } else {
        setRooms(prev => prev.map(r => r.userId === active.userId ? {
          ...r,
          messages: r.messages.map(m => m.id === tempId ? { ...m, status: "failed" } : m)
        } : r));
      }
    } catch {
      setRooms(prev => prev.map(r => r.userId === active.userId ? {
        ...r,
        messages: r.messages.map(m => m.id === tempId ? { ...m, status: "failed" } : m)
      } : r));
    }
  }

  async function doDelete() {
    if (!confirmDelete || !active) return;
    if (confirmDelete.type === "room") {
      await adminDeleteRoom(active.userId);
      setActiveId(null);
      setSuccessMsg("Room chat berhasil dihapus");
    } else if (confirmDelete.type === "msg" && confirmDelete.id) {
      await adminDeleteMessage(active.userId, confirmDelete.id);
      setSuccessMsg("Pesan dihapus");
    }
    setConfirmDelete(null);
    setShowRoomMenu(false);
    refresh();
  }

  if (!mounted) return <div className="p-6 text-sm text-gray-500">Memuat...</div>;

  return (
    <div className="space-y-4">
      {/* Header strip */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-orange-400 to-orange-500 p-5 text-gray-900 shadow-lg ring-1 ring-orange-500/30">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-orange-900">
              <MessageCircle className="h-3.5 w-3.5" /> Customer Support
            </p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">Chat Customer</h1>
            <p className="mt-1 text-xs text-gray-800">
              Balas pertanyaan customer real-time. Jam kerja admin: {JAM_KERJA.ringkas}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Stat label="Total Room" value={stats?.total ?? 0} />
            <Stat label="Perlu Balas" value={stats?.pending ?? 0} alert={(stats?.pending ?? 0) > 0} />
            <Stat label="Hari Ini" value={stats?.today ?? 0} />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-800">
          <span className={`inline-block h-2 w-2 rounded-full ${adminOnline ? "bg-green-500" : "bg-gray-400"}`} />
          {adminOnline ? "Anda Online (jam kerja)" : "Di luar jam kerja â€” pesan masuk tetap diterima"}
        </div>
      </section>

      {/* Split layout */}
      <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
        {/* SIDEBAR â€” list rooms */}
        <aside className={`flex h-[calc(100vh-220px)] min-h-[500px] flex-col rounded-2xl border border-gray-200 bg-white shadow-sm ${active ? "hidden lg:flex" : "flex"}`}>
          <div className="border-b border-gray-100 p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari customer atau pesan..."
                className="w-full rounded-full border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-[#FF6B1A] focus:bg-white"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {TABS.map((t) => {
                const isActive = tab === t.key;
                const showDot = t.alert && (stats?.pending ?? 0) > 0;
                return (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    className={`relative rounded-full px-2.5 py-1 text-[10px] font-black transition ${isActive ? "bg-[#FF6B1A] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}>
                    {t.label}
                    {showDot && !isActive && (
                      <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-ping rounded-full bg-red-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {rooms.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                <MessageCircle className="h-12 w-12 text-gray-200" />
                <p className="mt-2 text-xs font-black text-gray-500">Belum ada chat</p>
              </div>
            ) : (
              rooms.map((r) => (
                <RoomItem key={r.userId} room={r} active={activeId === r.userId}
                  onClick={() => setActiveId(r.userId)} />
              ))
            )}
          </div>
        </aside>

        {/* MAIN â€” conversation */}
        <div className={`flex h-[calc(100vh-220px)] min-h-[500px] flex-col rounded-2xl border border-gray-200 bg-white shadow-sm ${active ? "flex" : "hidden lg:flex"}`}>
          {!active ? (
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-orange-100 to-amber-100">
                <MessageCircle className="h-10 w-10 text-[#FF6B1A]" />
              </div>
              <p className="mt-4 text-base font-black text-gray-900">Pilih percakapan</p>
              <p className="mt-1 text-xs text-gray-500">Klik salah satu room di kiri untuk mulai membalas customer.</p>
            </div>
          ) : (
            <>
              {/* Room header */}
              <div className="flex items-center gap-3 border-b border-gray-100 p-3">
                <button onClick={() => setActiveId(null)} className="lg:hidden rounded-full p-1.5 hover:bg-gray-100">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <Avatar room={active} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-gray-900">{active.userName}</p>
                  <p className="truncate text-[10px] text-gray-500">
                    {userTyping ? (
                      <span className="font-bold text-orange-600 animate-pulse">sedang mengetikâ€¦</span>
                    ) : (
                      `${active.userEmail ?? active.userId} Â· ${active.totalMessages} pesan`
                    )}
                  </p>
                </div>
                <div className="relative">
                  <button onClick={() => setShowRoomMenu((s) => !s)} className="rounded-full p-2 hover:bg-gray-100">
                    <MoreVertical className="h-4 w-4 text-gray-500" />
                  </button>
                  {showRoomMenu && (
                    <div className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
                      <button onClick={() => { adminMarkUserMessagesRead(active.userId); setShowRoomMenu(false); refresh(); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50">
                        <CheckCheck className="h-3.5 w-3.5" /> Tandai semua dibaca
                      </button>
                      <button onClick={() => { setConfirmDelete({ type: "room" }); setShowRoomMenu(false); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50">
                        <Trash2 className="h-3.5 w-3.5" /> Hapus seluruh room
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white p-4">
                {active.messages.length === 0 ? (
                  <p className="text-center text-xs text-gray-400">Belum ada pesan.</p>
                ) : (
                  <div className="space-y-3">
                    {active.messages.map((m, i) => (
                      <MessageBubble key={m.id} msg={m}
                        showDate={i === 0 || !sameDay(active.messages[i - 1].createdAt, m.createdAt)}
                        onPreview={setPreview}
                        onDelete={() => setConfirmDelete({ type: "msg", id: m.id })} />
                    ))}
                  </div>
                )}
              </div>

              {/* Composer */}
              <div className="border-t border-gray-100 p-3">
                {pendingContext && (
                  <div className="mb-2 border bg-orange-50/60 p-2 flex items-center justify-between gap-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      {pendingContext.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={pendingContext.thumbnailUrl} alt="" className="h-10 w-10 rounded border object-cover bg-white" />
                      ) : (
                        <div className="h-10 w-10 rounded border bg-gray-100 flex items-center justify-center text-gray-400">
                          <Package className="h-4 w-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-[8px] font-black text-[#FF6B1A] uppercase tracking-widest leading-none">{pendingContext.kind}</p>
                        <p className="text-xs font-bold truncate text-zinc-950 mt-0.5 leading-tight">{pendingContext.label}</p>
                        {pendingContext.sublabel && <p className="text-[10px] text-zinc-500 truncate leading-none mt-0.5">{pendingContext.sublabel}</p>}
                      </div>
                    </div>
                    <button onClick={() => setPendingContext(null)} className="p-1 rounded-full hover:bg-orange-100 text-zinc-400 hover:text-zinc-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {attached.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {attached.map((f, i) => (
                      <div key={i} className="relative h-16 w-16 overflow-hidden rounded-lg border border-gray-200">
                        {f.type === "image" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={f.url} alt={f.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-gray-100 text-[9px] font-bold">VIDEO</div>
                        )}
                        <button onClick={() => setAttached(attached.filter((_, x) => x !== i))}
                          className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-bl bg-black/60 text-white">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <input ref={fileRef} type="file" accept="image/*,video/*" multiple
                    className="hidden" onChange={handleAttachFile} />
                  <button onClick={() => fileRef.current?.click()}
                    className="rounded-full p-2.5 text-gray-500 hover:bg-gray-100"
                    title="Lampirkan File">
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <button onClick={() => setProductModalOpen(true)}
                    className="rounded-full p-2.5 text-gray-500 hover:bg-gray-100"
                    title="Validasi Produk Pesanan">
                    <Package className="h-4 w-4" />
                  </button>
                  <textarea
                    value={draft} onChange={handleTextChange}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                    }}
                    rows={1}
                    className="flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs outline-none focus:border-[#FF6B1A] focus:bg-white"
                  />
                  <button onClick={() => handleSend()} disabled={!draft.trim() && attached.length === 0}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF6B1A] text-white shadow-md transition hover:bg-[#E55A0F] disabled:opacity-40">
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1.5 text-[10px] text-gray-400">
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Confirm */}
      <ConfirmModal
        open={!!confirmDelete}
        title={confirmDelete?.type === "room" ? "Hapus Seluruh Room Chat?" : "Hapus Pesan Ini?"}
        message={confirmDelete?.type === "room"
          ? "Semua pesan di room ini akan dihapus permanen dari sisi admin & customer. Tidak bisa dikembalikan."
          : "Pesan akan dihapus permanen dari riwayat chat."}
        confirmText="Ya, Hapus"
        variant="danger"
        onConfirm={doDelete}
        onClose={() => setConfirmDelete(null)}
      />

      {/* Preview lightbox */}
      {preview && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4" onClick={() => setPreview(null)}>
          <button className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Preview" className="max-h-[90vh] max-w-[90vw] object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      <SuccessModal open={!!successMsg} title={successMsg ?? "Berhasil"} onClose={() => setSuccessMsg(null)} />

      {/* Product Validation Modal */}
      {productModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3">
              <p className="text-base font-black text-gray-900">Validasi Produk Pesanan</p>
              <button
                onClick={() => {
                  setProductModalOpen(false);
                  setSelectedOrderForValidation(null);
                  setSelectedItemForValidation(null);
                }}
                className="rounded-full p-1 hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
              {modalLoading ? (
                <p className="text-center text-xs text-gray-400 py-6">Memuat transaksi customer...</p>
              ) : selectedItemForValidation || (selectedOrderForValidation && selectedOrderForValidation.jenis) ? (
                // Screen 3: Form Validasi Detail
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    {valPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={valPhoto} alt="" className="h-16 w-16 rounded-xl border object-cover bg-gray-50" />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl border bg-gray-50 text-gray-400">
                        <Package className="h-6 w-6" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{valName}</p>
                      <p className="text-[10px] text-gray-500">Order: {valOrderId} Â· Status: {valOrderStatus}</p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2 text-xs">
                    <div>
                      <label className="text-[10px] font-black uppercase text-gray-400">Foto URL</label>
                      <input
                        type="text"
                        value={valPhoto}
                        onChange={(e) => setValPhoto(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none focus:border-[#FF6B1A] focus:bg-white"
                        placeholder="Masukkan URL foto produk..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-black uppercase text-gray-400">Variasi</label>
                        <input
                          type="text"
                          value={valVariant}
                          onChange={(e) => setValVariant(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none focus:border-[#FF6B1A] focus:bg-white"
                          placeholder="Variasi..."
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-gray-400">Warna</label>
                        <input
                          type="text"
                          value={valColor}
                          onChange={(e) => setValColor(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none focus:border-[#FF6B1A] focus:bg-white"
                          placeholder="Warna..."
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-black uppercase text-gray-400">Qty</label>
                        <input
                          type="number"
                          value={valQty}
                          onChange={(e) => setValQty(Number(e.target.value))}
                          className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none focus:border-[#FF6B1A] focus:bg-white"
                          min={1}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-gray-400">Nomor Pesanan</label>
                        <input
                          type="text"
                          value={valOrderId}
                          readOnly
                          className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-xs outline-none cursor-not-allowed"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-gray-400">Catatan Custom</label>
                      <textarea
                        value={valCustomNote}
                        onChange={(e) => setValCustomNote(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-xs outline-none focus:border-[#FF6B1A] focus:bg-white"
                        rows={3}
                        placeholder="Masukkan detail custom..."
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => {
                        if (selectedItemForValidation) {
                          setSelectedItemForValidation(null);
                        } else {
                          setSelectedOrderForValidation(null);
                        }
                      }}
                      className="flex-1 rounded-full border-2 border-gray-200 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
                    >
                      Kembali
                    </button>
                    <button
                      onClick={async () => {
                        if (!active) return;
                        const isCustomOrder = !!selectedOrderForValidation?.jenis;
                        const validationContext: ChatContext = {
                          kind: "validation",
                          refId: valOrderId,
                          label: valName,
                          sublabel: `Status: Menunggu Validasi`,
                          thumbnailUrl: valPhoto || undefined,
                          href: isCustomOrder ? `/custom/${valOrderId}` : `/pesanan/${valOrderId}`,
                          validation: {
                            productName: valName,
                            photoUrl: valPhoto || undefined,
                            variant: valVariant || undefined,
                            color: valColor || undefined,
                            qty: valQty,
                            customNote: valCustomNote || undefined,
                            orderId: valOrderId,
                            orderStatus: valOrderStatus,
                            status: "pending"
                          }
                        };
                        await handleSend(validationContext);
                        setProductModalOpen(false);
                        setSelectedOrderForValidation(null);
                        setSelectedItemForValidation(null);
                      }}
                      className="flex-1 rounded-full bg-[#FF6B1A] py-2 text-xs font-bold text-white hover:bg-[#E55A0F]"
                    >
                      Kirim Validasi
                    </button>
                  </div>
                </div>
              ) : selectedOrderForValidation ? (
                // Screen 2: List Items Pesanan Reguler
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                    <button onClick={() => setSelectedOrderForValidation(null)} className="rounded-full p-1 hover:bg-gray-100">
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <span>Pilih Item Pesanan: {selectedOrderForValidation.id}</span>
                  </div>
                  <div className="space-y-2">
                    {selectedOrderForValidation.items?.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setValPhoto(item.gambar || "");
                          setValName(item.nama || "");
                          setValVariant(item.ukuran || "");
                          setValColor(item.warna || "");
                          setValQty(item.qty ?? 1);
                          setValCustomNote(selectedOrderForValidation.customMeta?.notes || "");
                          setValOrderId(selectedOrderForValidation.id);
                          setValOrderStatus(selectedOrderForValidation.status);
                          setSelectedItemForValidation(item);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl border border-gray-100 bg-gray-50/50 p-2 text-left transition hover:bg-orange-50/50 hover:border-orange-200"
                      >
                        {item.gambar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.gambar} alt="" className="h-10 w-10 rounded object-cover border bg-white" />
                        ) : (
                          <div className="h-10 w-10 rounded border bg-zinc-100 flex items-center justify-center text-zinc-400">
                            <Package className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-gray-800 truncate">{item.nama}</p>
                          <p className="text-[9px] text-gray-500 mt-0.5">
                            Variasi: {item.ukuran || "â€”"} Â· Qty: {item.qty}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                // Screen 1: List Pesanan Aktif
                <>
                  {/* Ongoing Regular Orders */}
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Pesanan Aktif ({activeOrders.length})</p>
                    {activeOrders.length === 0 ? (
                      <p className="text-[11px] text-gray-400 italic pl-1">Tidak ada pesanan aktif</p>
                    ) : (
                      <div className="space-y-1.5 font-bold">
                        {activeOrders.map(order => (
                          <button
                            key={order.id}
                            onClick={() => {
                              setSelectedOrderForValidation(order);
                            }}
                            className="flex w-full items-center gap-2.5 rounded-xl border border-gray-100 bg-gray-50/50 p-2.5 text-left transition hover:bg-orange-50/50 hover:border-orange-200"
                          >
                            <div className="h-8 w-8 rounded border bg-zinc-100 flex items-center justify-center text-zinc-400">
                              <Package className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-gray-800 truncate">{order.id}</p>
                              <p className="text-[9px] text-[#FF6B1A] font-black mt-0.5">
                                {order.items[0]?.nama || "â€”"} ({order.items.length} item)
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Ongoing Custom Orders */}
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Custom Order Aktif ({activeCustomOrders.length})</p>
                    {activeCustomOrders.length === 0 ? (
                      <p className="text-[11px] text-gray-400 italic pl-1">Tidak ada custom order aktif</p>
                    ) : (
                      <div className="space-y-1.5 font-bold">
                        {activeCustomOrders.map(co => {
                          return (
                            <button
                              key={co.id}
                              onClick={() => {
                                setValPhoto(co.referensiFiles?.[0]?.dataUrl || "");
                                setValName(`Custom ${co.jenis}`);
                                setValVariant(co.ukuran);
                                const warnaListNames = Array.isArray(co.warnaList) ? co.warnaList.map((w) => w.nama || w.hex).join(", ") : "";
                                setValColor(co.warnaCatatan || warnaListNames || "");
                                setValQty(1);
                                setValCustomNote(co.notes || "");
                                setValOrderId(co.id);
                                setValOrderStatus(co.status);
                                setSelectedOrderForValidation(co);
                              }}
                              className="flex w-full items-center gap-2.5 rounded-xl border border-gray-100 bg-gray-50/50 p-2.5 text-left transition hover:bg-orange-50/50 hover:border-orange-200"
                            >
                              {co.referensiFiles?.[0]?.dataUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={co.referensiFiles[0].dataUrl} alt="" className="h-8 w-8 rounded object-cover border bg-white" />
                              ) : (
                                <div className="h-8 w-8 rounded border bg-zinc-100 flex items-center justify-center text-zinc-400">
                                  <Package className="h-4 w-4" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-gray-800 truncate">{co.id}</p>
                                <p className="text-[9px] text-[#FF6B1A] font-black mt-0.5">
                                  Custom {co.jenis} Â· {co.ukuran}
                                </p>
                              </div>
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ====================  SUB COMPONENTS  ==================== */

function sameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function Stat({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className="relative rounded-xl bg-white/50 px-4 py-2 text-center backdrop-blur">
      {alert && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-ping rounded-full bg-red-500" />}
      <p className="text-[9px] font-bold uppercase tracking-wider text-orange-900">{label}</p>
      <p className="text-xl font-black text-gray-900">{value}</p>
    </div>
  );
}

function Avatar({ room, size }: { room: ChatRoom; size: number }) {
  const initial = (room.userName ?? "?").charAt(0).toUpperCase();
  return (
    <div className="relative shrink-0">
      <div
        className="flex items-center justify-center rounded-full bg-gradient-to-br from-[#FF6B1A] to-orange-600 text-white shadow-md"
        style={{ width: size, height: size, fontSize: size * 0.4, fontWeight: 900 }}
      >
        {room.userAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={room.userAvatar} alt={room.userName} className="h-full w-full rounded-full object-cover" />
        ) : initial}
      </div>
      {room.hasUserPending && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white ring-2 ring-white">
          {room.unreadFromUser}
        </span>
      )}
    </div>
  );
}

function RoomItem({ room, active, onClick }: {
  room: ChatRoom; active: boolean; onClick: () => void;
}) {
  const last = room.lastMessage;
  const lastTxt = last?.text
    ?? (last?.files?.length ? `${last.files.length} lampiran` : "");
  const fromLabel =
    last?.from === "admin" ? "Anda: "
      : last?.from === "system" ? ""
        : "";
  return (
    <button onClick={onClick}
      className={`flex w-full items-start gap-3 border-b border-gray-50 px-3 py-3 text-left transition ${active ? "bg-orange-50/60" : "hover:bg-gray-50"
        }`}>
      <Avatar room={room} size={44} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className={`truncate text-xs ${room.hasUserPending ? "font-black text-gray-900" : "font-bold text-gray-700"}`}>
            {room.userName}
          </p>
          <span className="shrink-0 text-[9px] font-bold text-gray-400">
            {last ? formatChatTime(last.createdAt) : ""}
          </span>
        </div>
        <p className={`mt-0.5 truncate text-[11px] ${room.hasUserPending ? "font-bold text-gray-900" : "text-gray-500"}`}>
          {fromLabel}{lastTxt || "(tidak ada teks)"}
        </p>
      </div>
      {active && <ChevronRight className="mt-3 h-4 w-4 shrink-0 text-[#FF6B1A]" />}
    </button>
  );
}

function MessageBubble({ msg, showDate, onPreview, onDelete }: {
  msg: ChatMessage; showDate: boolean; onPreview: (url: string) => void; onDelete: () => void;
}) {
  const isAdmin = msg.from === "admin";
  const isSystem = msg.from === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold text-blue-700 ring-1 ring-blue-100">
          {msg.text}
          {msg.context && (
            <span className="ml-1 opacity-70">({msg.context.label})</span>
          )}
        </div>
      </div>
    );
  }



  return (
    <>
      {showDate && (
        <div className="flex justify-center pb-1">
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[9px] font-bold uppercase text-gray-500">
            {new Date(msg.createdAt).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" })}
          </span>
        </div>
      )}
      <div className={`group flex ${isAdmin ? "justify-end" : "justify-start"}`}>
        <div className={`relative max-w-[80%] rounded-2xl px-3 py-2 text-xs shadow-sm ${isAdmin
          ? "rounded-br-sm bg-[#FF7B00] text-white"
          : "rounded-bl-sm bg-white text-gray-900 ring-1 ring-gray-200"
          }`}>
          {msg.context && msg.context.kind === "validation" ? (
            <div className="mb-2">
              <ValidationCard ctx={msg.context} />
            </div>
          ) : msg.context ? (
            <div className="mb-2">
              <a
                href={msg.context.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex w-full items-center gap-2 overflow-hidden rounded-xl border border-gray-200 bg-white p-2 shadow-sm transition hover:shadow-md text-zinc-900"
              >
                {msg.context.thumbnailUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={msg.context.thumbnailUrl}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded border object-cover bg-white"
                  />
                ) : (
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded border bg-zinc-50 text-zinc-400">
                    <Package className="h-4 w-4" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[8px] font-black text-orange-600 uppercase tracking-widest leading-none">
                    {msg.context.kind}
                  </p>
                  <p className="text-xs font-bold truncate leading-tight mt-0.5">
                    {msg.context.label}
                  </p>
                  {msg.context.sublabel && (
                    <p className="text-[10px] text-gray-500 truncate leading-none mt-0.5">
                      {msg.context.sublabel}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-[#FF6B1A]" />
              </a>
            </div>
          ) : null}
          {msg.files && msg.files.length > 0 && (
            <div className={`mb-1.5 grid gap-1.5 ${msg.files.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
              {msg.files.map((f, i) => (
                <button key={i} onClick={() => onPreview(f.url)}
                  className="group/img relative overflow-hidden rounded-lg">
                  {f.type === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.url} alt={f.name ?? "img"} className="max-h-48 w-full object-cover" />
                  ) : (
                    <video src={f.url} controls className="max-h-48 w-full" />
                  )}
                  {f.type === "image" && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover/img:bg-black/30 group-hover/img:opacity-100">
                      <ZoomIn className="h-4 w-4 text-white" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          {msg.text && <p className="whitespace-pre-wrap break-words">{msg.text}</p>}
          <div className={`mt-1 flex items-center gap-1 text-[9px] ${isAdmin ? "justify-end text-white/70" : "text-gray-400"}`}>
            <span>{new Date(msg.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
            {isAdmin && msg.status === "sending" && <Clock className="h-3 w-3" />}
            {isAdmin && msg.status === "failed" && <AlertCircle className="h-3 w-3 text-red-200" />}
            {isAdmin && msg.status === "sent" && <Check className="h-3 w-3" />}
            {isAdmin && msg.status === "delivered" && <CheckCheck className="h-3 w-3" />}
            {isAdmin && msg.status === "read" && <CheckCheck className="h-3 w-3 text-blue-300" />}
          </div>

          {/* delete menu â€” visible on hover */}
          <button onClick={onDelete}
            className={`absolute -top-2 ${isAdmin ? "-left-2" : "-right-2"} hidden h-6 w-6 items-center justify-center rounded-full bg-white text-red-500 shadow-md ring-1 ring-gray-200 hover:bg-red-50 group-hover:flex`}>
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </>
  );
}

export default function AdminChatPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Memuat...</div>}>
      <AdminChatWithParams />
    </Suspense>
  );
}

function AdminChatWithParams() {
  const sp = useSearchParams();
  const userIdParam = sp.get("userId");
  const customIdParam = sp.get("customId");
  return (
    <AdminChat
      key={`${userIdParam ?? ""}|${customIdParam ?? ""}`}
      userIdParam={userIdParam}
      customIdParam={customIdParam}
    />
  );
}

function ValidationCard({ ctx }: { ctx?: ChatContext }) {
  const v = ctx?.validation;
  if (!v) return null;

  const statusLabel = {
    pending: "Menunggu Validasi Customer",
    approved: "Disetujui Customer",
    revision_requested: "Revisi Diminta",
  }[v.status as "pending" | "approved" | "revision_requested"] || "Status Tidak Diketahui";

  const statusColor = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    approved: "bg-green-100 text-green-800 border-green-200",
    revision_requested: "bg-rose-100 text-rose-800 border-rose-200",
  }[v.status as "pending" | "approved" | "revision_requested"] || "bg-gray-100 text-gray-800";

  return (
    <div className="my-2 overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 text-xs text-gray-800 shadow-md transition hover:shadow-lg w-full max-w-sm">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-2">
        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-orange-600">
          Validasi Produk
        </span>
        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {/* Product Info Block */}
      <div className="flex gap-3">
        {v.photoUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={v.photoUrl}
            alt={v.productName}
            className="h-20 w-20 shrink-0 rounded-xl border border-gray-100 object-cover bg-gray-50"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-400">
            <Package className="h-6 w-6" />
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-extrabold text-gray-900 leading-tight text-sm truncate">{v.productName}</p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-gray-500 pt-0.5">
            <p><span className="font-medium text-gray-400">Variasi:</span> <span className="font-semibold text-gray-800">{v.variant || "â€”"}</span></p>
            <p><span className="font-medium text-gray-400">Warna:</span> <span className="font-semibold text-gray-800">{v.color || "â€”"}</span></p>
            <p><span className="font-medium text-gray-400">Qty:</span> <span className="font-semibold text-gray-800">{v.qty}</span></p>
            <p><span className="font-medium text-gray-400">Order ID:</span> <span className="font-semibold text-gray-800">{v.orderId}</span></p>
          </div>
        </div>
      </div>

      {/* Custom notes if exists */}
      <div className="mt-3 rounded-xl bg-orange-50/50 p-2.5 border border-orange-100/50">
        <p className="text-[9px] font-black uppercase tracking-wide text-orange-700">Catatan Custom</p>
        <p className="mt-0.5 text-gray-700 leading-relaxed font-semibold">
          {v.customNote || "Tidak ada catatan custom"}
        </p>
      </div>

      {/* Revision requested note if exists */}
      {v.status === "revision_requested" && v.revisionNote && (
        <div className="mt-3 rounded-xl bg-red-50 p-2.5 border border-red-100">
          <p className="text-[9px] font-black uppercase tracking-wide text-red-700">Detail Revisi Customer</p>
          <p className="mt-0.5 text-red-800 leading-relaxed font-bold">
            &quot;{v.revisionNote}&quot;
          </p>
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-3 border-t border-gray-100 pt-2 flex items-center justify-between text-[10px] text-gray-400 font-medium">
        <span>Pesanan: <span className="font-bold text-gray-600">{v.orderStatus}</span></span>
        {v.adminName && <span>Oleh: <span className="font-bold text-gray-600">{v.adminName}</span></span>}
      </div>
    </div>
  );
}
