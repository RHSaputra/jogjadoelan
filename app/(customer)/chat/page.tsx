"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Camera,
  CheckCheck,
  Check,
  ChevronRight,
  Clock,
  Image as ImageIcon,
  Info,
  Package,
  Paperclip,
  Send,
  Video as VideoIcon,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import {
  useChatSupport,
  type ChatContext,
  type ChatFile,
  type ChatMessage,
  JAM_KERJA,
  isAdminInJamKerja,
} from "@/lib/chat-support-context";
import {
  useKomplain,
  KOMPLAIN_TINDAKAN_LABEL,
} from "@/lib/komplain-context";
import { getOrder } from "@/lib/orders-storage";
import { useCustomOrder } from "@/lib/custom-order-context";
import { formatRupiah } from "@/lib/utils";

const ADMIN_NAMA = "Admin Jogjadoelan";
const MAX_FILE_PER_KIRIM = 4;

const fmtJam = (iso: string) =>
  new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

const fmtTanggal = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const sama = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sama(d, today)) return "Hari ini";
  if (sama(d, yest)) return "Kemarin";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
};

function ChatSupport() {
  const router = useRouter();
  const sp = useSearchParams();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { hydrated, messages, adminOnline, adminTyping, send, markAllRead } =
    useChatSupport();
  const { get: getKomplain, hydrated: komplainHydrated } = useKomplain();
  const { orders: customOrders } = useCustomOrder();

  const [text, setText] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<ChatFile[]>([]);
  const [lightbox, setLightbox] = useState<ChatFile | null>(null);
  const [pendingContext, setPendingContext] = useState<ChatContext | null>(null);

  const fotoRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /* ====== AUTH GATE ====== */
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login?next=/chat");
  }, [isLoading, isAuthenticated, router]);

  /* ====== READ CONTEXT FROM URL AND FETCH DETAILS ====== */
  useEffect(() => {
    if (!user?.id || !hydrated) return;
    const komplainId = sp.get("komplainId");
    const orderId = sp.get("orderId");
    const customId = sp.get("customId");
    const produkId = sp.get("produkId");

    let active = true;

    if (komplainId && komplainHydrated) {
      const k = getKomplain(komplainId);
      if (k) {
        void Promise.resolve().then(() => {
          if (!active) return;
          setPendingContext({
            kind: "komplain",
            refId: k.id,
            label: `Komplain ${KOMPLAIN_TINDAKAN_LABEL[k.tindakan]} — ${k.id}`,
            sublabel: k.orderId,
            thumbnailUrl: k.files?.[0]?.url || undefined,
            href: `/komplain/${k.id}`,
          });
        });
      }
    } else if (orderId) {
      getOrder(user.id, orderId).then((ord) => {
        if (!active) return;
        if (ord) {
          setPendingContext({
            kind: "order",
            refId: orderId,
            label: `Pesanan ${orderId}`,
            sublabel: ord.items[0]?.nama || "Detail Pesanan",
            thumbnailUrl: ord.items[0]?.gambar || undefined,
            href: `/pesanan/${orderId}`,
          });
        }
      });
    } else if (customId) {
      const co = customOrders.find((o) => o.id === customId);
      if (co) {
        const total = co.estimasi?.total ?? 0;
        void Promise.resolve().then(() => {
          if (!active) return;
          setPendingContext({
            kind: "custom",
            refId: co.id,
            label: `Custom ${co.jenis} — ${co.id}`,
            sublabel: total > 0 ? `${co.ukuran} · ${formatRupiah(total)}` : co.ukuran,
            thumbnailUrl: co.referensiFiles?.[0]?.dataUrl || undefined,
            href: `/custom/${co.id}`,
          });
        });
      }
    } else if (produkId) {
      fetch(`/api/produk/${produkId}`)
        .then((r) => r.json())
        .then((j) => {
          if (!active) return;
          if (j.data) {
            const prod = j.data;
            setPendingContext({
              kind: "produk",
              refId: String(prod.id),
              label: prod.nama,
              sublabel: `Rp ${prod.harga.toLocaleString("id-ID")}`,
              thumbnailUrl: prod.gambarUtama || (prod.produkimage?.[0]?.path) || undefined,
              href: `/produk/${prod.id}`,
            });
          }
        })
        .catch(() => {});
    }

    return () => {
      active = false;
    };
  }, [sp, user?.id, hydrated, komplainHydrated, getKomplain, customOrders]);

  /* ====== AUTO SCROLL ====== */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, adminTyping]);

  /* ====== MARK READ ====== */
  useEffect(() => {
    if (hydrated) {
      const hasUnreadAdmin = messages.some((m) => m.from === "admin" && m.status !== "read");
      if (hasUnreadAdmin) {
        markAllRead();
      }
    }
  }, [hydrated, messages, markAllRead]);

  /* ====== GROUP BY DATE ====== */
  const grouped = useMemo(() => {
    const out: Array<{ tanggal: string; items: ChatMessage[] }> = [];
    messages.forEach((m) => {
      const tgl = fmtTanggal(m.createdAt);
      const last = out[out.length - 1];
      if (last && last.tanggal === tgl) last.items.push(m);
      else out.push({ tanggal: tgl, items: [m] });
    });
    return out;
  }, [messages]);

  const adminInJam = isAdminInJamKerja();

  if (isLoading || !isAuthenticated || !hydrated) {
    return <div className="min-h-screen bg-brand-cream-light" />;
  }

  /* ====== HANDLERS ====== */
  function readFiles(list: FileList, type: "image" | "video") {
    Array.from(list).forEach((f) => {
      if (pendingFiles.length >= MAX_FILE_PER_KIRIM) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== "string") return;
        setPendingFiles((prev) =>
          prev.length >= MAX_FILE_PER_KIRIM
            ? prev
            : [...prev, { url: reader.result as string, type, name: f.name }],
        );
      };
      reader.readAsDataURL(f);
    });
  }
  const pickFoto = () => { setPickerOpen(false); fotoRef.current?.click(); };
  const pickVideo = () => { setPickerOpen(false); videoRef.current?.click(); };
  const removePending = (i: number) => setPendingFiles((p) => p.filter((_, j) => j !== i));

  const sendTypingEvent = async (isTyping: boolean) => {
    if (!user?.id) return;
    try {
      await fetch("/api/chat/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, isTyping, fromRole: "USER" }),
      });
    } catch {}
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    sendTypingEvent(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingEvent(false);
    }, 2000);
  };

  function handleSend() {
    if (!text.trim() && pendingFiles.length === 0 && !pendingContext) return;
    send(text, pendingFiles, pendingContext ?? undefined);
    setText("");
    setPendingFiles([]);
    setPendingContext(null);
    sendTypingEvent(false);
  }
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
  <div className="fixed inset-0 bottom-0 h-[100svh] overflow-hidden bg-gradient-to-br from-orange-100 via-amber-50 to-rose-50">
    
    {/* === CARD CONTAINER === */}
    <div className="relative z-40 flex h-[100svh] w-full flex-col overflow-hidden bg-white">
        {/* === HEADER GRADIENT === */}
        <div className="sticky top-0 z-20 w-full border-b border-border bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/80">
        <header className="relative overflow-hidden text-foreground">
          <div className="relative flex items-center gap-3 px-3 py-3">
            <button
              onClick={() => router.back()}
              className="grid h-9 w-9 place-items-center rounded-full bg-zinc-100 transition hover:bg-zinc-200"
              aria-label="Kembali"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="relative">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-orange-100 text-orange-600 font-black shadow-sm ring-1 ring-orange-200">
                AJ
              </div>
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                  adminOnline ? "bg-green-400" : "bg-zinc-400"
                }`}
              >
                {adminOnline && <span className="absolute inset-0 animate-ping rounded-full bg-green-400 opacity-75" />}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-base font-black">{ADMIN_NAMA}</h1>
                <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-orange-700">
                  Admin
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">
                {adminTyping ? "sedang mengetik…" : adminOnline ? "Online sekarang" : `Offline · ${JAM_KERJA.ringkas}`}
              </p>
            </div>

            <Link
              href="/notifikasi"
              className="grid h-9 w-9 place-items-center rounded-full bg-zinc-100 hover:bg-zinc-200"
              aria-label="Info"
            >
              <Info className="h-5 w-5" />
            </Link>
          </div>

          {!adminInJam && (
            <div className="border-t border-orange-200 bg-orange-50 px-3 py-1.5 text-center text-[11px] text-orange-800">
              <strong>Di luar jam kerja.</strong> Pesan akan dibaca admin di jam buka berikutnya.
            </div>
          )}
        </header>
        </div>
        {/* === MESSAGE LIST === */}
        <div
          ref={scrollRef}
          className="relative z-30 flex-1 overflow-y-auto scrollbar-chat bg-[radial-gradient(circle_at_top,#fff7ed,transparent_60%),repeating-linear-gradient(45deg,transparent,transparent_15px,rgba(251,146,60,0.04)_15px,rgba(251,146,60,0.04)_16px)] px-3 py-4"
        >
          <div className="mx-auto max-w-2xl space-y-3">
            {messages.length === 0 && (
              <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-dashed border-zinc-300 bg-white/80 p-5 text-center backdrop-blur">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-orange-100 text-orange-600 font-black">
                  AJ
                </div>
                <h3 className="mt-3 text-sm font-bold text-zinc-900">
                  Halo {user?.nama?.split(" ")[0] ?? "kak"}! 👋
                </h3>
                <p className="mt-1 text-xs text-zinc-600">
                  Tanya apa saja seputar produk, pesanan, komplain refund, atau tukar.
                  Semua dalam satu chat ini. Admin siap bantu di {JAM_KERJA.ringkas}.
                </p>
              </div>
            )}

            {grouped.map((g) => (
              <div key={g.tanggal} className="space-y-2">
                <div className="my-3 flex items-center justify-center">
                  <span className="rounded-full bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500 shadow-sm ring-1 ring-zinc-200 backdrop-blur">
                    {g.tanggal}
                  </span>
                </div>
                {g.items.map((m) => (
                  <MsgBubble key={m.id} msg={m} onOpenMedia={setLightbox} />
                ))}
              </div>
            ))}

            {adminTyping && (
              <div className="flex items-end gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-orange-500 to-amber-600 text-[10px] font-black text-white">
                  AJ
                </div>
                <div className="rounded-2xl rounded-bl-sm bg-white px-3 py-2 shadow-sm">
                  <div className="flex gap-1">
                    <span className="dot-typing" />
                    <span className="dot-typing animation-delay-200" />
                    <span className="dot-typing animation-delay-400" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* === COMPOSER === */}
          <div className="sticky bottom-0 z-20 border-t bg-white">
          {pendingContext && (
            <div className="mx-auto max-w-2xl px-3 py-2 border-b bg-orange-50/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {pendingContext.thumbnailUrl ? (
                  <Image src={pendingContext.thumbnailUrl} alt="" width={40} height={40} className="h-10 w-10 rounded border object-cover bg-white" />
                ) : (
                  <div className="h-10 w-10 rounded border bg-zinc-100 flex items-center justify-center text-zinc-400">
                    <Package className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[8px] font-black text-orange-600 uppercase tracking-widest leading-none">{pendingContext.kind}</p>
                  <p className="text-xs font-bold truncate text-zinc-950 mt-0.5 leading-tight">{pendingContext.label}</p>
                  {pendingContext.sublabel && <p className="text-[10px] text-zinc-500 truncate leading-none mt-0.5">{pendingContext.sublabel}</p>}
                </div>
              </div>
              <button onClick={() => setPendingContext(null)} className="p-1 rounded-full hover:bg-orange-100 text-zinc-400 hover:text-zinc-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {pendingFiles.length > 0 && (
            <div className="mx-auto max-w-2xl border-b px-3 py-2">
              <div className="flex gap-2 overflow-x-auto">
                {pendingFiles.map((f, i) => (
                  <div key={i} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-zinc-100">
                    {f.type === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <video src={f.url} muted className="h-full w-full object-cover" />
                    )}
                    <button
                      onClick={() => removePending(i)}
                      className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/70 text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mx-auto flex max-w-2xl items-end gap-2 px-3 py-2">
            <button
              onClick={() => setPickerOpen(true)}
              disabled={pendingFiles.length >= MAX_FILE_PER_KIRIM}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-orange-50 text-orange-600 hover:bg-orange-100 disabled:opacity-40"
              aria-label="Lampirkan"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <textarea
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Ketik pesan…"
              className="max-h-32 min-h-[40px] flex-1 resize-none rounded-2xl border-2 border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-orange-400 focus:bg-white focus:outline-none"
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() && pendingFiles.length === 0}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-md hover:shadow-lg disabled:opacity-40"
              aria-label="Kirim"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      

        <input ref={fotoRef} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && readFiles(e.target.files, "image")} />
        <input ref={videoRef} type="file" accept="video/*" multiple hidden onChange={(e) => e.target.files && readFiles(e.target.files, "video")} />

        {/* === PICKER ATTACHMENT === */}
        <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
          <DialogContent className="max-w-xs">
            <DialogHeader><DialogTitle>Pilih Lampiran</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button onClick={pickFoto} className="flex flex-col items-center gap-2 rounded-xl border-2 border-zinc-200 p-4 hover:border-orange-400">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-orange-100 text-orange-600">
                  <Camera className="h-6 w-6" />
                </div>
                <span className="text-sm font-medium">Foto</span>
              </button>
              <button onClick={pickVideo} className="flex flex-col items-center gap-2 rounded-xl border-2 border-zinc-200 p-4 hover:border-orange-400">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-purple-100 text-purple-600">
                  <VideoIcon className="h-6 w-6" />
                </div>
                <span className="text-sm font-medium">Video</span>
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* === LIGHTBOX MEDIA — klik thumbnail = popup ukuran asli === */}
        <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
          <DialogContent className="max-w-[95vw] border-0 bg-black/95 p-0 sm:max-w-3xl">
            <DialogHeader className="sr-only">
              <DialogTitle>Pratinjau Media</DialogTitle>
            </DialogHeader>
            {lightbox && (
              <div className="flex max-h-[85vh] items-center justify-center p-2">
                {lightbox.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={lightbox.url}
                    alt={lightbox.name ?? "Pratinjau"}
                    className="max-h-[80vh] max-w-full rounded-lg object-contain"
                  />
                ) : (
                  <video
                    src={lightbox.url}
                    controls
                    autoPlay
                    className="max-h-[80vh] max-w-full rounded-lg"
                  />
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <style jsx>{`
          .dot-typing { width:6px; height:6px; border-radius:9999px; background:#a1a1aa; display:inline-block; animation:bounce 1.2s infinite ease-in-out; }
          .animation-delay-200 { animation-delay:.15s; }
          .animation-delay-400 { animation-delay:.3s; }
          @keyframes bounce { 0%,60%,100%{transform:translateY(0);opacity:.5} 30%{transform:translateY(-4px);opacity:1} }
        `}</style>
      </div>
    </div>
  );
}

export default function ChatSupportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-brand-cream-light" />}>
      <ChatSupport />
    </Suspense>
  );
}

/* ======================================================
   BUBBLE
   ====================================================== */
function MsgBubble({
  msg,
  onOpenMedia,
}: {
  msg: ChatMessage;
  onOpenMedia: (f: ChatFile) => void;
}) {
  const isUser = msg.from === "user";
  const isSystem = msg.from === "system";

  /* === SYSTEM BUBBLE → context card clickable === */
  if (isSystem && msg.context && msg.context.kind === "validation") {
    return (
      <div className="flex justify-center">
        <ValidationCard ctx={msg.context} messageId={msg.id} />
      </div>
    );
  }
  if (isSystem && msg.context) {
    return <ContextCard ctx={msg.context} createdAt={msg.createdAt} />;
  }
  if (isSystem) {
    return (
      <div className="flex justify-center">
        <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] italic text-zinc-600 shadow-sm ring-1 ring-zinc-200">
          {msg.text}
        </span>
      </div>
    );
  }

  /* === VALIDATION CARD FROM ADMIN === */
  if (msg.context && msg.context.kind === "validation") {
    return (
      <div className={`flex items-end gap-2 ${isUser ? "justify-end" : ""}`}>
        {!isUser && (
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-orange-500 to-amber-600 text-[10px] font-black text-white self-start">
            AJ
          </div>
        )}
        <ValidationCard ctx={msg.context} messageId={msg.id} />
      </div>
    );
  }

  return (
    <div className={`flex items-end gap-2 ${isUser ? "justify-end" : ""}`}>
      {!isUser && (
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-orange-500 to-amber-600 text-[10px] font-black text-white">
          AJ
        </div>
      )}
      <div
        className={`max-w-[75%] rounded-2xl px-3 py-2 shadow-sm ${
          isUser ? "rounded-br-sm bg-[#FF7B00] text-white" : "rounded-bl-sm bg-white text-zinc-900"
        }`}
      >
        {msg.context && (
          <div className="mb-2">
            <Link
              href={msg.context.href}
              className="group relative flex w-full items-center gap-2 overflow-hidden rounded-xl border border-zinc-200 bg-white p-2 shadow-sm transition hover:shadow-md text-zinc-900"
            >
              {msg.context.thumbnailUrl ? (
                <Image
                  src={msg.context.thumbnailUrl}
                  alt=""
                  width={40}
                  height={40}
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
                  <p className="text-[10px] text-zinc-500 truncate leading-none mt-0.5">
                    {msg.context.sublabel}
                  </p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-orange-500" />
            </Link>
          </div>
        )}
        {msg.files && msg.files.length > 0 && (
          <div className="mb-1 flex flex-wrap gap-1">
            {msg.files.map((f, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onOpenMedia(f)}
                className="group relative h-20 w-20 overflow-hidden rounded-lg bg-black/10 ring-1 ring-black/5 transition hover:scale-[1.02] hover:ring-orange-400"
                aria-label={`Lihat ${f.type === "image" ? "gambar" : "video"} ukuran asli`}
              >
                {f.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <>
                    <video src={f.url} muted className="h-full w-full object-cover" />
                    <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/30">
                      <div className="grid h-7 w-7 place-items-center rounded-full bg-white/90 text-zinc-900">
                        <PlayIcon />
                      </div>
                    </div>
                  </>
                )}
                <span className="pointer-events-none absolute bottom-0.5 left-0.5 rounded bg-black/60 px-1 text-[9px] text-white">
                  {f.type === "image" ? (
                    <ImageIcon className="inline h-2.5 w-2.5" />
                  ) : (
                    <VideoIcon className="inline h-2.5 w-2.5" />
                  )}
                </span>
              </button>
            ))}
          </div>
        )}
        {msg.text && <p className="whitespace-pre-wrap break-words text-sm leading-snug">{msg.text}</p>}
        <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${isUser ? "text-orange-100" : "text-zinc-400"}`}>
          <span>{fmtJam(msg.createdAt)}</span>
          {isUser && <StatusIcon status={msg.status} />}
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: ChatMessage["status"] }) {
  if (status === "sending") return <Clock className="h-3 w-3 text-orange-100" />;
  if (status === "sent") return <Check className="h-3 w-3 text-orange-100" />;
  if (status === "delivered") return <CheckCheck className="h-3 w-3 text-orange-100" />;
  return <CheckCheck className="h-3 w-3 text-sky-200" />;
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

/* ======================================================
   CONTEXT CARD — compact (single row), clickable lompat ke
   pesanan/komplain/produk
   ====================================================== */
  function ContextCard({ ctx, createdAt }: { ctx: ChatContext; createdAt: string }) {
  const dotColorByKind = {
    komplain: "bg-rose-500",
    order: "bg-blue-500",
    produk: "bg-violet-500",
    custom: "bg-orange-500",
    validation: "bg-orange-500",
  } as const;
  const labelByKind = {
    komplain: "KOMPLAIN",
    order: "PESANAN",
    produk: "PRODUK",
    custom: "CUSTOM",
    validation: "VALIDASI",
  } as const;

  return (
  <div className="flex justify-center">
    <Link
      href={ctx.href}
      className="group relative flex w-full max-w-[78%] items-center gap-2 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/95 px-3 py-2 shadow-[0_4px_14px_rgba(0,0,0,0.06)] backdrop-blur transition hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(249,115,22,0.18)]"
    >
      {/* Accent Line */}
      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b" />

      {ctx.thumbnailUrl ? (
        <Image
          src={ctx.thumbnailUrl}
          alt=""
          width={36}
          height={36}
          className="h-9 w-9 shrink-0 rounded-md border object-cover"
        />
      ) : (
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-zinc-100 text-zinc-400">
            <Package className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${dotColorByKind[ctx.kind]}`} />
            <span className="text-[9px] font-black tracking-wider text-zinc-500">
              {labelByKind[ctx.kind]}
            </span>
            <span className="ml-auto text-[9px] text-zinc-400">{fmtJam(createdAt)}</span>
          </div>
          <div className="truncate text-xs font-bold leading-tight text-zinc-900">
            {ctx.label}
          </div>
          {ctx.sublabel && (
            <div className="truncate text-[10px] leading-tight text-zinc-500">
              {ctx.sublabel}
            </div>
          )}
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-orange-500" />
      </Link>
    </div>
  );
}

function ValidationCard({ ctx, messageId }: { ctx: ChatContext; messageId: string }) {
  const v = ctx.validation;
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");
  const [loading, setLoading] = useState(false);

  if (!v) return null;

  const statusLabel = {
    pending: "Menunggu Validasi Anda",
    approved: "Disetujui",
    revision_requested: "Revisi Diminta",
  }[v.status as "pending" | "approved" | "revision_requested"] || "Status Tidak Diketahui";

  const statusColor = {
    pending: "bg-amber-100 text-amber-800 border-amber-200 animate-pulse",
    approved: "bg-green-100 text-green-800 border-green-200",
    revision_requested: "bg-rose-100 text-rose-800 border-rose-200",
  }[v.status as "pending" | "approved" | "revision_requested"] || "bg-gray-100 text-gray-800";

  const handleApprove = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/chat/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, action: "approve" }),
      });
      const j = await res.json();
      if (!j.ok) {
        alert(j.error || "Gagal menyetujui validasi");
      }
    } catch {
      alert("Terjadi kesalahan koneksi");
    } finally {
      setLoading(false);
    }
  };

  const handleRevision = async () => {
    if (!revisionNote.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/chat/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, action: "revision", notes: revisionNote.trim() }),
      });
      const j = await res.json();
      if (j.ok) {
        setShowRevisionForm(false);
      } else {
        alert(j.error || "Gagal mengirim permintaan revisi");
      }
    } catch {
      alert("Terjadi kesalahan koneksi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="my-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 text-xs text-zinc-800 shadow-md transition hover:shadow-lg w-full max-w-sm">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between border-b border-zinc-100 pb-2">
        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-orange-600">
          Validasi Produk Pesanan
        </span>
        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {/* Product Info Block */}
      <div className="flex gap-3">
        {v.photoUrl ? (
          <Image
            src={v.photoUrl}
            alt={v.productName}
            width={80}
            height={80}
            className="h-20 w-20 shrink-0 rounded-xl border border-zinc-100 object-cover bg-zinc-50"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-400">
            <Package className="h-6 w-6" />
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-extrabold text-zinc-900 leading-tight text-sm truncate">{v.productName}</p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-zinc-500 pt-0.5">
            <p><span className="font-medium text-zinc-400">Variasi:</span> <span className="font-semibold text-zinc-800">{v.variant || "—"}</span></p>
            <p><span className="font-medium text-zinc-400">Warna:</span> <span className="font-semibold text-zinc-800">{v.color || "—"}</span></p>
            <p><span className="font-medium text-zinc-400">Qty:</span> <span className="font-semibold text-zinc-800">{v.qty}</span></p>
            <p><span className="font-medium text-zinc-400">Order ID:</span> <span className="font-semibold text-zinc-800">{v.orderId}</span></p>
          </div>
        </div>
      </div>

      {/* Custom notes if exists */}
      <div className="mt-3 rounded-xl bg-orange-50/50 p-2.5 border border-orange-100/50">
        <p className="text-[9px] font-black uppercase tracking-wide text-orange-700">Catatan Custom</p>
        <p className="mt-0.5 text-zinc-700 leading-relaxed font-semibold">
          {v.customNote || "Tidak ada catatan custom"}
        </p>
      </div>

      {/* Revision requested note if exists */}
      {v.status === "revision_requested" && v.revisionNote && (
        <div className="mt-3 rounded-xl bg-red-50 p-2.5 border border-red-100">
          <p className="text-[9px] font-black uppercase tracking-wide text-red-700">Detail Revisi Anda</p>
          <p className="mt-0.5 text-red-800 leading-relaxed font-bold">
            &quot;{v.revisionNote}&quot;
          </p>
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-3 border-t border-zinc-100 pt-2 flex items-center justify-between text-[10px] text-zinc-400 font-medium">
        <span>Pesanan: <span className="font-bold text-zinc-600">{v.orderStatus}</span></span>
        {v.adminName && <span>Oleh: <span className="font-bold text-zinc-600">{v.adminName}</span></span>}
      </div>

      {/* Action Buttons for Customer if status pending */}
      {v.status === "pending" && !showRevisionForm && (
        <div className="mt-4 flex gap-2 pt-2 border-t border-zinc-100">
          <button
            onClick={() => setShowRevisionForm(true)}
            disabled={loading}
            className="flex-1 rounded-xl border border-red-200 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
          >
            Minta Revisi
          </button>
          <button
            onClick={handleApprove}
            disabled={loading}
            className="flex-1 rounded-xl bg-green-650 py-2 text-xs font-bold text-white transition hover:bg-green-700 shadow-md disabled:opacity-50"
            style={{ backgroundColor: "#16a34a" }}
          >
            Setujui Produk
          </button>
        </div>
      )}

      {/* Revision Form */}
      {showRevisionForm && (
        <div className="mt-3 pt-2 border-t border-zinc-100 space-y-2">
          <label className="text-[9px] font-black uppercase tracking-wide text-red-700 block">Masukkan Catatan Revisi</label>
          <textarea
            value={revisionNote}
            onChange={(e) => setRevisionNote(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-xs outline-none focus:border-orange-400 focus:bg-white resize-none"
            rows={2}
            placeholder="Tulis bagian yang perlu direvisi..."
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowRevisionForm(false);
                setRevisionNote("");
              }}
              disabled={loading}
              className="flex-1 rounded-lg border border-zinc-200 py-1.5 text-[11px] font-bold text-zinc-500 hover:bg-zinc-50"
            >
              Batal
            </button>
            <button
              onClick={handleRevision}
              disabled={loading || !revisionNote.trim()}
              className="flex-1 rounded-lg bg-red-600 py-1.5 text-[11px] font-bold text-white hover:bg-red-700 disabled:opacity-50"
            >
              Kirim Revisi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}