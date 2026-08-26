"use client";

import Link from "next/link";
import { Plus, ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  AlertCircle, Box, Inbox, Layers, Package, PackagePlus,
  Pencil, RotateCcw, Search, Tag,
} from "lucide-react";
import { SuccessModal } from "@/components/admin/SuccessModal";
import {
  adjustProductStock, clearProductOverride, clearProductStockOverride,
  formatRp, getProductJenisList, getProductStats, getStockBadge,
  listProductsForAdmin, setProductOverride, setProductStock,
  type EffectiveProduct, type ProductTabKey,
} from "@/lib/admin-produk-helpers";
import { useDebounce } from "@/hooks/use-debounce";

const TABS: { key: ProductTabKey; label: string }[] = [
  { key: "all",            label: "Semua" },
  { key: "promo",          label: "Promo" },
  { key: "low_stock",      label: "Stok Kritis" },
  { key: "out_of_stock",   label: "Habis" },
];

const emptySubscribe = () => () => {};

export default function AdminProdukPage() {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState<ProductTabKey>("all");
  const [jenis, setJenis] = useState<string>("");
  const [q, setQ] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const [restockId, setRestockId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const onChange = () => setTick((t) => t + 1);
    window.addEventListener("storage", onChange);
    window.addEventListener("jogjadoelan_product_changed", onChange);
    window.addEventListener("jogjadoelan_stock_changed", onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("jogjadoelan_product_changed", onChange);
      window.removeEventListener("jogjadoelan_stock_changed", onChange);
    };
  }, []);

  const [stats, setStats] = useState<Awaited<ReturnType<typeof getProductStats>> | null>(null);
  const [jenisList, setJenisList] = useState<{ value: string; label: string }[]>([]);
  const [items, setItems] = useState<EffectiveProduct[]>([]);

  useEffect(() => {
    if (!mounted) return;
    let active = true;
    getProductStats().then((s) => { if (active) setStats(s); });
    getProductJenisList().then((j) => { if (active) setJenisList(j); });
    return () => { active = false; };
  }, [mounted, tick]);

  const debouncedQ = useDebounce(q, 300);

  useEffect(() => {
    if (!mounted) return;
    let active = true;
    listProductsForAdmin({ tab, jenis: jenis || undefined, q: debouncedQ }).then((d) => {
      if (active) setItems(d);
    });
    return () => { active = false; };
  }, [mounted, tab, jenis, debouncedQ, tick]);

  const editing = useMemo(
    () => (editId ? items.find((p) => p.id === editId) ?? null : null),
    [editId, items],
  );
  const restocking = useMemo(
    () => (restockId ? items.find((p) => p.id === restockId) ?? null : null),
    [restockId, items],
  );

  function refresh() { setTick((t) => t + 1); }

  if (!mounted) return <div className="p-6 text-sm text-gray-500">Memuat...</div>;

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-orange-400 to-orange-500 p-5 text-gray-900 shadow-lg ring-1 ring-orange-500/30 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-orange-900">
              <Package className="h-3.5 w-3.5" /> Manajemen Produk & Inventory
            </p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">Kelola Produk</h1>
            <p className="mt-1 text-xs text-gray-800">
              Override harga/promo, sesuaikan stok, dan pantau inventory toko.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link href="/admin/produk/baru"
              className="flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-xs font-black text-orange-700 shadow-lg hover:scale-105 transition">
              <Plus className="h-4 w-4" /> Tambah Produk
            </Link>
            <div className="rounded-2xl bg-white/50 px-5 py-3 text-center backdrop-blur">
              <p className="text-[10px] font-bold uppercase tracking-wider text-orange-900">Nilai Inventory</p>
              <p className="text-2xl font-black text-gray-900">{formatRp(stats?.totalValue ?? 0)}</p>
              <p className="text-[10px] text-gray-800">{stats?.totalStokUnits ?? 0} unit total</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total Produk" value={stats?.total ?? 0} icon={Box} bg="bg-blue-500" onClick={() => setTab("all")} active={tab === "all"} />
        <Stat label="Lagi Promo" value={stats?.promo ?? 0} icon={Tag} bg="bg-[#FF6B1A]" onClick={() => setTab("promo")} active={tab === "promo"} />
        <Stat label="Stok Kritis" value={stats?.low ?? 0} icon={AlertCircle} bg="bg-amber-500" alert={(stats?.low ?? 0) > 0} onClick={() => setTab("low_stock")} active={tab === "low_stock"} />
        <Stat label="Habis" value={stats?.out ?? 0} icon={AlertCircle} bg="bg-red-500" alert={(stats?.out ?? 0) > 0} onClick={() => setTab("out_of_stock")} active={tab === "out_of_stock"} />
      </section>

      {/* Toolbar */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-2 sm:grid-cols-[1fr_200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari produk, jenis, ID..."
              className="w-full rounded-full border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-xs outline-none focus:border-[#FF6B1A] focus:bg-white" />
          </div>
          <select value={jenis} onChange={(e) => setJenis(e.target.value)}
            className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-bold text-gray-900 outline-none focus:border-[#FF6B1A] focus:bg-white">
            <option value="">Semua Jenis</option>
            {jenisList.map((j) => <option key={j.value} value={j.value}>{j.label}</option>)}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-gray-100 pt-3">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-black transition ${
                  active ? "bg-[#FF6B1A] text-white shadow" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}>
                {t.label}
              </button>
            );
          })}
          {(stats?.overridden ?? 0) > 0 && (
            <span className="ml-auto flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-[10px] font-black text-amber-700">
              <Layers className="h-3 w-3" /> {stats?.overridden} produk override aktif
            </span>
          )}
        </div>
      </section>

      {/* Grid */}
      {items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white py-16 text-center shadow-sm">
          <Inbox className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-sm font-black text-gray-500">Tidak ada produk</p>
          <p className="text-xs text-gray-400">Filter saat ini tidak menampilkan data</p>
        </div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((p) => (
            <ProductCard key={p.id} p={p}
              onEdit={() => setEditId(p.id)}
              onRestock={() => setRestockId(p.id)} />
          ))}
        </section>
      )}

      {/* MODAL: Edit harga/promo */}
      {editing && (
        <EditModal
          product={editing}
          onClose={() => setEditId(null)}
          onSaved={(msg) => { setSuccessMsg(msg); setEditId(null); refresh(); }}
        />
      )}

      {/* MODAL: Restock */}
      {restocking && (
        <RestockModal
          product={restocking}
          onClose={() => setRestockId(null)}
          onSaved={(msg) => { setSuccessMsg(msg); setRestockId(null); refresh(); }}
        />
      )}

      <SuccessModal open={!!successMsg} title={successMsg ?? "Berhasil"} onClose={() => setSuccessMsg(null)} />
    </div>
  );
}

/* ====================  SUB COMPONENTS  ==================== */

function Stat({ label, value, icon: Icon, bg, alert, onClick, active }: {
  label: string; value: number | string; icon: React.ElementType; bg: string; alert?: boolean; onClick?: () => void; active?: boolean;
}) {
  return (
    <div 
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition-all duration-200 ${onClick ? 'cursor-pointer hover:shadow-md hover:border-orange-200' : ''} ${active ? 'ring-2 ring-orange-500 border-orange-500 bg-orange-50/10' : 'border-gray-200'}`}
    >
      {alert && <span className="absolute right-2 top-2 h-2 w-2 animate-ping rounded-full bg-red-500" />}
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${bg} text-white shadow`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <p className="mt-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
      <p className="text-lg font-black text-gray-900">{value}</p>
    </div>
  );
}

function ProductCard({ p, onEdit, onRestock }: {
  p: EffectiveProduct; onEdit: () => void; onRestock: () => void;
}) {
  const stockBadge = getStockBadge(p.stok);
  const cover = p.gambars?.[0] ?? p.gambar ?? "";
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border-2 border-gray-200 bg-white shadow-sm transition hover:border-[#FF6B1A] hover:shadow-md">
      <div className="relative h-40 overflow-hidden bg-gray-50">
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt={p.nama} className="h-full w-full object-contain transition group-hover:scale-105" />
      ) : (
        <div className="flex h-full items-center justify-center text-gray-300"><Package className="h-12 w-12" /></div>
      )}
        {p.promoLabel && (
          <span className="absolute left-2 top-2 rounded-full bg-[#FF6B1A] px-2 py-0.5 text-[9px] font-black text-white shadow">
            {p.promoLabel}
          </span>
        )}
        {p.hasOverride && (
          <span className="absolute right-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[8px] font-black uppercase text-white shadow">
            Override
          </span>
        )}
        {p.isCustom && (
          <span className="absolute right-2 top-2 rounded-full bg-purple-500 px-2 py-0.5 text-[8px] font-black uppercase text-white shadow">
            Ready Stok
          </span>
        )}
        <span className={`absolute bottom-2 right-2 rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${stockBadge.color}`}>
          {stockBadge.label}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="min-h-[36px]">
          <p className="line-clamp-2 text-xs font-black text-gray-900">{p.nama}</p>
          <p className="mt-0.5 text-[10px] text-gray-500">{p.jenisLabel}</p>
        </div>
        
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-black text-[#FF6B1A]">{formatRp(p.harga)}</span>
          {(() => {
            const diskon = p.diskonPersen ?? 0;
            const coret = diskon > 0 ? Math.round(p.harga / (1 - diskon / 100)) : p.hargaCoret;
            if (coret && coret > p.harga) {
               return <span className="text-[10px] text-gray-400 line-through">{formatRp(coret)}</span>;
            }
            return null;
          })()}
          {(p.diskonPersen ?? 0) > 0 && (
            <span className="rounded bg-red-100 px-1 text-[9px] font-black text-red-700">-{p.diskonPersen}%</span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-1 border-t border-gray-100 pt-2 text-[10px]">
          <Mini label="Stok" value={String(p.stok)} highlight={p.stok < 5} />
          <Mini label="Terjual" value={(p.terjual ?? 0) > 0 ? String(p.terjual) : "-"} />
          <Mini label="Rating" value={(p.rating ?? 0) > 0 ? `${(p.rating ?? 0).toFixed(1)}★` : "-"} />
        </div>

        <div className="mt-auto space-y-1.5 pt-2">
          <Link href={`/admin/produk/${p.id}/edit`}
            className="flex w-full items-center justify-center gap-1 rounded-md border-2 border-[#FF6B1A] bg-orange-50 px-2 py-1.5 text-[11px] font-black text-[#FF6B1A] hover:bg-[#FF6B1A] hover:text-white">
            <ExternalLink className="h-3 w-3" /> Edit Detail Lengkap
          </Link>
          <div className="flex gap-1.5">
            <button onClick={onEdit}
              className="flex flex-1 items-center justify-center gap-1 rounded-md bg-[#fc970a] px-2 py-2 text-[11px] font-black text-white hover:bg-[#1A3066]">
              <Pencil className="h-3 w-3" /> Cepat
            </button>
            <button onClick={onRestock}
              className="flex flex-1 items-center justify-center gap-1 rounded-md bg-emerald-600 px-2 py-2 text-[11px] font-black text-white hover:bg-emerald-700">
              <PackagePlus className="h-3 w-3" /> Stok
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function Mini({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded p-1 text-center ${highlight ? "bg-amber-50" : "bg-gray-50"}`}>
      <p className="text-[8px] font-bold uppercase text-gray-500">{label}</p>
      <p className={`font-black ${highlight ? "text-amber-700" : "text-gray-900"}`}>{value}</p>
    </div>
  );
}

/* ====================  MODAL: EDIT HARGA/PROMO  ==================== */

function EditModal({ product, onClose, onSaved }: {
  product: EffectiveProduct; onClose: () => void; onSaved: (msg: string) => void;
}) {
  const [harga, setHarga] = useState<string>(String(product.harga));
  const [diskon, setDiskon] = useState<string>(product.diskonPersen ? String(product.diskonPersen) : "");
  const [promoLabel, setPromoLabel] = useState<string>(product.promoLabel ?? "");

  async function save() {
    const h = Number(harga);
    if (!h || h < 0) return;
    const ok = await setProductOverride(product.id, {
      harga: h,
      diskonPersen: diskon ? Number(diskon) : null,
      promoLabel: promoLabel.trim() || null,
    });
    if (ok) onSaved("Harga & promo produk berhasil disimpan");
  }

  async function reset() {
    const ok = await clearProductOverride(product.id);
    if (ok) onSaved("Override produk dihapus, kembali ke default");
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-black text-gray-900">Edit Produk</p>
            <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{product.nama}</p>
          </div>
          {product.hasOverride && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase text-amber-700">
              Override Aktif
            </span>
          )}
        </div>

        <div className="mt-4 space-y-3">
          <Field label="Harga (Rp)">
            <input type="number" value={harga} onChange={(e) => setHarga(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none focus:border-[#FF6B1A] focus:bg-white" />
            <p className="mt-0.5 text-[10px] text-gray-400">Default: {formatRp(product.baseHarga)}</p>
          </Field>

          <Field label="Diskon Persen — opsional">
            <input type="number" value={diskon} onChange={(e) => setDiskon(e.target.value)}
              placeholder="Misal: 15"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none focus:border-[#FF6B1A] focus:bg-white" />
            <p className="mt-0.5 text-[10px] text-gray-400">Harga coret otomatis dihitung</p>
          </Field>

          <Field label="Label Promo — opsional">
            <input value={promoLabel} onChange={(e) => setPromoLabel(e.target.value)}
              placeholder="Misal: HEMAT SPESIAL"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none focus:border-[#FF6B1A] focus:bg-white" />
          </Field>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {product.hasOverride && (
            <button onClick={reset}
              className="flex items-center gap-1 rounded-md border-2 border-amber-300 bg-amber-50 px-3 py-2 text-[11px] font-black text-amber-700 hover:bg-amber-100">
              <RotateCcw className="h-3 w-3" /> Hapus Override
            </button>
          )}
          <button onClick={onClose}
            className="ml-auto rounded-md border-2 border-gray-200 px-4 py-2 text-[11px] font-black text-gray-900 hover:bg-gray-50">
            Batal
          </button>
          <button onClick={save}
            className="rounded-md bg-[#FF6B1A] px-4 py-2 text-[11px] font-black text-white hover:bg-[#E55A0F]">
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

/* ====================  MODAL: RESTOCK  ==================== */

function RestockModal({ product, onClose, onSaved }: {
  product: EffectiveProduct; onClose: () => void; onSaved: (msg: string) => void;
}) {
  const [mode, setMode] = useState<"tambah" | "set">("tambah");
  const [qty, setQty] = useState<string>("");

  async function save() {
    const n = Number(qty);
    if (Number.isNaN(n)) return;
    let ok = false;
    if (mode === "tambah") {
  if (n === 0) return;

  const updated = await adjustProductStock(product.id, n);
  ok = !!updated;

  if (ok) onSaved(`Stok ${n > 0 ? "ditambah" : "dikurangi"} ${Math.abs(n)} unit`);
} else {
      if (n < 0) return;
      const updated = await setProductStock(product.id, n);
      ok = !!updated;
      if (ok) onSaved(`Stok diset menjadi ${n} unit`);
    }
    if (!ok) onSaved("Gagal mengubah stok");
  }

  async function resetStok() {
    const ok = await clearProductStockOverride(product.id);
    if (ok) onSaved(`Stok dikembalikan ke default (${product.baseStok} unit)`);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-black text-gray-900">Sesuaikan Stok</p>
            <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{product.nama}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] uppercase text-gray-400">Stok Saat Ini</p>
            <p className="text-xl font-black text-gray-900">{product.stok}</p>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="mt-4 flex gap-1.5">
          {(["tambah", "set"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 rounded-md px-3 py-2 text-[11px] font-black transition ${
                mode === m ? "bg-[#fc970a] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {m === "tambah" ? "Tambah / Kurangi" : "Set Absolut"}
            </button>
          ))}
        </div>

        <div className="mt-3">
          <Field label={mode === "tambah" ? "Jumlah (boleh negatif)" : "Stok Baru"}>
            <input type="number" value={qty} onChange={(e) => setQty(e.target.value)}
              placeholder={mode === "tambah" ? "Misal: 10 atau -3" : "Misal: 25"}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none focus:border-[#FF6B1A] focus:bg-white" />
            {mode === "tambah" && qty && !Number.isNaN(Number(qty)) && (
              <p className="mt-1 text-[10px] text-gray-500">
                Stok setelah: <span className="font-black text-gray-900">
                  {Math.max(0, product.stok + Number(qty))}
                </span>
              </p>
            )}
          </Field>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {product.hasStockOverride && (
            <button onClick={resetStok}
              className="flex items-center gap-1 rounded-md border-2 border-amber-300 bg-amber-50 px-3 py-2 text-[11px] font-black text-amber-700 hover:bg-amber-100">
              <RotateCcw className="h-3 w-3" /> Reset (Default: {product.baseStok})
            </button>
          )}
          <button onClick={onClose}
            className="ml-auto rounded-md border-2 border-gray-200 px-4 py-2 text-[11px] font-black text-gray-900 hover:bg-gray-50">
            Batal
          </button>
          <button onClick={save} disabled={!qty || Number.isNaN(Number(qty))}
            className="rounded-md bg-emerald-600 px-4 py-2 text-[11px] font-black text-white hover:bg-emerald-700 disabled:opacity-50">
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

/* ====================  HELPER SUB  ==================== */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-black uppercase tracking-wider text-gray-500">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}