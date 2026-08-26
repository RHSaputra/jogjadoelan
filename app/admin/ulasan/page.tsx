"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Search, Star, Filter, MessageSquare, MessageCircle, Image as ImageIcon,
  X, Video, Reply, Trash2
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { listUlasanAdmin, adminHideUlasan, adminBalasUlasan, type Ulasan } from "@/lib/ulasan-helpers";

export default function AdminUlasanPage() {
  const [ulasanList, setUlasanList] = useState<Ulasan[]>([]);
  const [q, setQ] = useState("");
  const [filterRating, setFilterRating] = useState<number | "All">("All");
  const [tick, setTick] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string } | null>(null);

  useEffect(() => {
    void listUlasanAdmin({ hidden: "false" }).then(setUlasanList);
  }, [tick]);

  const [replyingTo, setReplyingTo] = useState<Ulasan | null>(null);
  const [replyText, setReplyText] = useState("");
  const [activeMedia, setActiveMedia] = useState<{ url: string; type: "image" | "video" } | null>(null);

  const filteredData = useMemo(() => {
    return ulasanList.filter((u) => {
      const customerMockName = "Pelanggan";
      const matchSearch = customerMockName.toLowerCase().includes(q.toLowerCase()) || 
                          (u.produkNama || "").toLowerCase().includes(q.toLowerCase()) ||
                          u.komentar.toLowerCase().includes(q.toLowerCase());
      const matchRating = filterRating === "All" || u.rating === filterRating;
      return matchSearch && matchRating;
    });
  }, [ulasanList, q, filterRating]);

  const avgRating = ulasanList.length > 0 
    ? (ulasanList.reduce((acc, curr) => acc + curr.rating, 0) / ulasanList.length).toFixed(1)
    : "0.0";
  const totalReviews = ulasanList.length;
  const totalWithMedia = ulasanList.filter(u => u.foto && u.foto.length > 0).length;

  const handleSendReply = async () => {
    if (!replyingTo || !replyText.trim()) return;
    const sukses = await adminBalasUlasan(replyingTo.userId, replyingTo.id, replyText.trim());
    if (sukses) {
      toast.success("Balasan berhasil dikirim!");
      setReplyingTo(null);
      setReplyText("");
      setTick(t => t + 1);
    } else {
      toast.error("Gagal membalas ulasan.");
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F3F8] p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-gray-900 sm:text-3xl">Kelola Ulasan</h1>
          <p className="mt-1 text-sm font-medium text-gray-500">Pantau kepuasan pelanggan dan balas ulasan masuk.</p>
        </div>

        {/* STATISTIK CARDS */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="rounded-2xl border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                <Star className="h-6 w-6 text-orange-500" fill="currentColor" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">Rata-rata Rating</p>
                <p className="text-2xl font-black text-gray-900">{avgRating} <span className="text-sm text-gray-400">/ 5.0</span></p>
              </div>
            </div>
          </Card>
          <Card className="rounded-2xl border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">Total Ulasan</p>
                <p className="text-2xl font-black text-gray-900">{totalReviews}</p>
              </div>
            </div>
          </Card>
          <Card className="rounded-2xl border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <ImageIcon className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">Ulasan Berfoto</p>
                <p className="text-2xl font-black text-gray-900">{totalWithMedia}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* TOOLBAR FILTER & SEARCH */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input 
              placeholder="Cari produk atau isi ulasan..." 
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-11 w-full rounded-full border-2 border-gray-200 bg-white pl-10 pr-4 text-sm font-bold focus:border-orange-500 focus:ring-0"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <div className="flex rounded-full border-2 border-gray-200 bg-white p-1">
              {["All", 5, 4, 3, 2, 1].map((rating) => (
                <button
                  key={rating}
                  onClick={() => setFilterRating(rating as number | "All")}
                  className={`flex items-center gap-1 rounded-full px-4 py-1.5 text-xs font-black transition-colors ${
                    filterRating === rating 
                      ? "bg-orange-500 text-white" 
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {rating !== "All" && <Star className="h-3 w-3" fill={filterRating === rating ? "white" : "currentColor"} />}
                  {rating}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* LIST ULASAN (DESAIN MODERN 1-KOLOM + SISA WAKTU) */}
        <div className="space-y-4">
          {filteredData.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-white p-12 text-center shadow-sm">
              <MessageSquare className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <h3 className="text-sm font-black uppercase text-gray-800">Belum ada ulasan</h3>
              <p className="mt-1 text-xs font-medium text-gray-400">Tunggu sampai pelanggan mengirim penilaian.</p>
            </div>
          ) : (
            filteredData.map((review) => {
              // KALKULASI SISA HARI
              const createdTime = new Date(review.createdAt).getTime();
              const ageMs = new Date().getTime() - createdTime;
              const remainingDays = Math.ceil((7 * 24 * 60 * 60 * 1000 - ageMs) / (1000 * 60 * 60 * 24));

              return (
                <div key={review.id} className="rounded-2xl bg-white p-4 shadow-sm transition-all hover:shadow-md border border-gray-100 mb-4">
                  {/* HEADER ROW */}
                  <div className="flex items-start justify-between gap-4 mb-3 pb-2 border-b border-gray-50">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-orange-50 flex items-center justify-center border border-orange-100 shrink-0">
                        <span className="text-[9px] font-black text-orange-500">U</span>
                      </div>
                      <span className="text-xs font-bold text-gray-700 truncate max-w-[150px]" title={review.userId}>
                        ID: {review.userId.slice(0, 8)}...
                      </span>
                      <div className="flex gap-0.5 ml-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className={`h-3.5 w-3.5 ${star <= review.rating ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"}`} />
                        ))}
                      </div>
                    </div>
                    
                    {/* AREA KANAN ATAS: TANGGAL & BADGE SISA WAKTU */}
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] text-gray-400 font-medium">
                        {review.createdAt ? new Date(review.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                      </p>
                      {!review.balasan && remainingDays > 0 && (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-bold uppercase border shadow-sm ${
                          remainingDays <= 2 
                            ? "bg-red-50 text-red-600 border-red-200 animate-pulse" 
                            : "bg-amber-50 text-amber-600 border-amber-200"
                        }`}>
                          Sisa {remainingDays}H
                        </span>
                      )}
                    </div>
                  </div>

                  {/* CONTENT ROW */}
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-700 leading-relaxed pl-2.5 border-l-2 border-orange-400/60">
                      &quot;{review.komentar}&quot;
                    </p>

                    {/* Media */}
                    {review.foto && review.foto.length > 0 && (
                      <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5">
                        {review.foto.map((file, i) => (
                          <div key={i} onClick={() => setActiveMedia(file)} className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-gray-50 cursor-pointer">
                            {file.type === "image" ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={file.url} alt="Media" className="h-full w-full object-cover" />
                            ) : (
                              <div className="relative h-full w-full">
                                <video src={file.url} className="h-full w-full object-cover" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/15">
                                  <Video className="h-3 w-3 text-white" />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Balasan Admin */}
                    {review.balasan && (
                      <div className="mt-2.5 rounded-xl border border-orange-100 bg-orange-50/40 p-2.5 relative">
                        <MessageSquare className="absolute top-2.5 right-2.5 h-3.5 w-3.5 text-orange-500/40" />
                        <p className="text-[9px] font-black uppercase tracking-wider text-orange-600 mb-0.5">
                          Balasan Anda (Admin Jogjadoelan):
                        </p>
                        <p className="text-xs font-semibold text-gray-700 italic">
                          {review.balasan}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* FOOTER ROW */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2.5 border-t border-gray-50">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-10 w-10 shrink-0 rounded-lg border border-gray-100 bg-gray-50 overflow-hidden flex items-center justify-center">
                        {review.produkGambar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={review.produkGambar} alt={review.produkNama} className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-gray-300" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-800 truncate" title={review.produkNama}>
                          {review.produkNama}
                        </p>
                        <p className="text-[9px] font-medium text-gray-400">
                          Order: {review.orderId}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/admin/chat?userId=${review.userId}`}
                        className="flex items-center gap-1.5 rounded-lg border border-orange-200 bg-white px-3 py-1.5 text-[11px] font-bold text-[#FF6B1A] transition-all hover:bg-orange-50 shadow-sm"
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> Chat
                      </Link>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget({ id: review.id })}
                        className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-[11px] font-bold text-red-600 transition-all hover:bg-red-50 shadow-sm"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Sembunyikan
                      </button>

                      {!review.balasan && (
                        <button
                          type="button"
                          onClick={() => { setReplyingTo(review); setReplyText(""); }}
                          className="flex items-center gap-1.5 rounded-lg border border-orange-500 bg-orange-500 px-3 py-1.5 text-[11px] font-bold text-white transition-all hover:bg-orange-600 shadow-sm"
                        >
                          <MessageSquare className="h-3.5 w-3.5" /> Balas
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL BALAS */}
      {replyingTo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md rounded-3xl border-gray-200 bg-white p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2"><Reply className="h-5 w-5 text-orange-500" /> Balas Ulasan</h3>
              <button onClick={() => setReplyingTo(null)} className="rounded-full bg-gray-100 p-1.5 text-gray-400 hover:text-orange-500"><X className="h-5 w-5" /></button>
            </div>
            
            <div className="mb-4 rounded-xl bg-gray-50 p-3 text-xs text-gray-700 border border-gray-200">
              <span className="font-black text-gray-900 block mb-1">Pelanggan:</span>
              <span className="italic">&quot;{replyingTo.komentar}&quot;</span>
            </div>

            <Label className="text-xs font-black text-gray-900 mb-2 block">Pesan Balasan</Label>
            <Textarea 
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Tuliskan apresiasi atau tanggapan..."
              className="w-full min-h-[120px] rounded-2xl border-2 border-gray-200 bg-white p-4 text-sm font-bold focus:border-orange-500 focus:ring-0 resize-none"
            />
            
            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="flex-1 rounded-full h-12 text-[11px] font-black uppercase" onClick={() => setReplyingTo(null)}>Batal</Button>
              <Button disabled={!replyText.trim()} onClick={() => { void handleSendReply(); }} className="flex-1 rounded-full bg-orange-500 hover:bg-orange-600 text-white h-12 text-[11px] font-black uppercase shadow-md disabled:opacity-50">Kirim Balasan</Button>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL GAMBAR/VIDEO */}
      {activeMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm" onClick={() => setActiveMedia(null)}>
          <button type="button" className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white transition hover:bg-white/40" onClick={() => setActiveMedia(null)}><X className="h-6 w-6" /></button>
          <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl" onClick={e => e.stopPropagation()}>
            {activeMedia.type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={activeMedia.url} alt="" className="w-full h-auto object-contain max-h-[85vh]" />
            ) : ( <video src={activeMedia.url} controls autoPlay className="w-full h-auto max-h-[85vh] rounded-2xl outline-none bg-black" /> )}
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI SEMBUNYIKAN CUSTOM */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-sm rounded-3xl border-none bg-white p-6 shadow-2xl text-center animate-in zoom-in-95 duration-200">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 border-4 border-red-100">
              <Trash2 className="h-7 w-7 text-red-500" />
            </div>
            
            <h3 className="mb-2 text-lg font-black text-gray-900">Sembunyikan Ulasan?</h3>
            <p className="mb-6 text-sm font-medium text-gray-500 leading-relaxed">
              Ulasan ini akan dihapus dari pandangan Admin agar tidak menumpuk. Pelanggan tetap bisa melihat ulasannya di akun mereka.
            </p>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 rounded-full h-11 text-xs font-black border-2 border-gray-200 hover:bg-gray-50" 
                onClick={() => setDeleteTarget(null)}
              >
                Batal
              </Button>
              <Button 
                className="flex-1 rounded-full bg-red-500 hover:bg-red-600 text-white h-11 text-xs font-black shadow-md shadow-red-500/20" 
                onClick={async () => {
                  try {
                    await adminHideUlasan(deleteTarget.id);
                    toast.success("Ulasan berhasil disembunyikan dari dashboard Admin!");
                    setTick(t => t + 1);
                    setDeleteTarget(null);
                  } catch {
                    toast.error("Gagal menyembunyikan ulasan");
                  }
                }}
              >
                Ya, Sembunyikan
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}