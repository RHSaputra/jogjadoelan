"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2, ChevronDown } from "lucide-react";

interface WilayahItem {
  id: string;
  name: string;
  nama?: string;
}

export interface WilayahInitial {
  provinsi?: string;
  kabupaten?: string;
  kecamatan?: string;
  kelurahan?: string;
  kodePos?: string;
}

interface Props {
  onChange: (data: {
    provinsi: string;
    kabupaten: string;
    kecamatan: string;
    kelurahan: string;
    kodePos: string;
    provinsiId: string;
    kabId: string;
    kecId: string;
    kelId: string;
  }) => void;
  loading?: boolean;
  initialValue?: WilayahInitial;
}

const getName = (item: WilayahItem | null | undefined): string =>
  item?.name || item?.nama || "";
const norm = (s: string) => {
  let n = s.trim().toLowerCase();
  n = n.replace(/^diy\s/, "di ");
  n = n.replace(/^d\.i\.\s/, "di ");
  n = n.replace(/^daerah istimewa\s/, "di ");
  n = n.replace(/^kab\.\s/, "kabupaten ");
  return n;
};

const matchWilayah = (list: WilayahItem[], searchStr: string) => {
  if (!searchStr) return undefined;
  const s = norm(searchStr);
  let found = list.find((item) => norm(getName(item)) === s);
  if (found) return found;
  found = list.find((item) => norm(getName(item)).includes(s));
  if (found) return found;
  found = list.find((item) => s.includes(norm(getName(item))));
  return found;
};

interface WilayahResponse {
  data?: WilayahItem[];
}

const clientCache: Record<string, WilayahResponse> = {};

async function fetchWithCache(url: string, signal?: AbortSignal): Promise<WilayahResponse> {
  if (typeof window === "undefined") {
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`Fetch failed with status ${res.status}`);
    return (await res.json()) as WilayahResponse;
  }

  try {
    const cached = sessionStorage.getItem(url);
    if (cached) {
      return JSON.parse(cached) as WilayahResponse;
    }
  } catch {
    // Ignore storage exceptions
  }

  if (clientCache[url]) {
    return clientCache[url];
  }

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Fetch failed with status ${res.status}`);
  const data = (await res.json()) as WilayahResponse;

  clientCache[url] = data;
  try {
    sessionStorage.setItem(url, JSON.stringify(data));
  } catch {
    // Ignore storage quota/security exceptions
  }

  return data;
}

export default function WilayahSelect({
  onChange,
  loading: parentLoading,
  initialValue,
}: Props) {
  // Data lists
  const [provList, setProvList] = useState<WilayahItem[]>([]);
  const [kabList, setKabList] = useState<WilayahItem[]>([]);
  const [kecList, setKecList] = useState<WilayahItem[]>([]);
  const [kelList, setKelList] = useState<WilayahItem[]>([]);

  // Selected IDs
  const [provId, setProvId] = useState("");
  const [kabId, setKabId] = useState("");
  const [kecId, setKecId] = useState("");
  const [kelId, setKelId] = useState("");
  const [kodePos, setKodePos] = useState(initialValue?.kodePos ?? "");

  // Search text (what user types)
  const [provSearch, setProvSearch] = useState("");
  const [kabSearch, setKabSearch] = useState("");
  const [kecSearch, setKecSearch] = useState("");
  const [kelSearch, setKelSearch] = useState("");

  // Dropdown visibility
  const [showProv, setShowProv] = useState(false);
  const [showKab, setShowKab] = useState(false);
  const [showKec, setShowKec] = useState(false);
  const [showKel, setShowKel] = useState(false);

  // Loading states
  const [loadingProv, setLoadingProv] = useState(true);
  const [loadingKab, setLoadingKab] = useState(false);
  const [loadingKec, setLoadingKec] = useState(false);
  const [loadingKel, setLoadingKel] = useState(false);

  // Error states
  const [errProv, setErrProv] = useState(false);
  const [errKab, setErrKab] = useState(false);
  const [errKec, setErrKec] = useState(false);
  const [errKel, setErrKel] = useState(false);

  // Retry counts
  const [retryProv, setRetryProv] = useState(0);
  const [retryKab, setRetryKab] = useState(0);
  const [retryKec, setRetryKec] = useState(0);
  const [retryKel, setRetryKel] = useState(0);

  // Hydration state — agar initialValue hanya dipakai sekali, bukan overwrite terus
  const [hydrated, setHydrated] = useState({
    prov: false,
    kab: false,
    kec: false,
    kel: false,
  });

  // Refs for click outside
  const provRef = useRef<HTMLDivElement>(null);
  const kabRef = useRef<HTMLDivElement>(null);
  const kecRef = useRef<HTMLDivElement>(null);
  const kelRef = useRef<HTMLDivElement>(null);

  // Click outside handler
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (provRef.current && !provRef.current.contains(e.target as Node)) setShowProv(false);
      if (kabRef.current && !kabRef.current.contains(e.target as Node)) setShowKab(false);
      if (kecRef.current && !kecRef.current.contains(e.target as Node)) setShowKec(false);
      if (kelRef.current && !kelRef.current.contains(e.target as Node)) setShowKel(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Load provinsi on mount
  useEffect(() => {
    const controller = new AbortController();
    fetchWithCache("/api/wilayah/provinsi", controller.signal)
      .then((j) => setProvList(j?.data ?? []))
      .catch((err) => {
        if (err.name !== "AbortError") setErrProv(true);
      })
      .finally(() => setLoadingProv(false));
    return () => controller.abort();
  }, [retryProv]);

  /* eslint-disable react-hooks/set-state-in-effect -- one-shot hydration latch: seed the saved address once its wilayah list arrives */
  useEffect(() => {
    if (hydrated.prov) return;
    if (loadingProv) return;
    if (provList.length === 0) return;

    if (!initialValue?.provinsi) {
      setHydrated((h) => ({ ...h, prov: true }));
      return;
    }

    const found = matchWilayah(provList, initialValue.provinsi);
    if (found) {
      setProvId(found.id);
      setProvSearch(getName(found));
      setLoadingKab(true);
      setErrKab(false);
    } else {
      setProvSearch(initialValue.provinsi);
    }
    setHydrated((h) => ({ ...h, prov: true }));
  }, [provList, loadingProv, initialValue, hydrated.prov]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Filter lists
  const filteredProv = provList.filter((p) => norm(getName(p)).includes(norm(provSearch)));
  const filteredKab = kabList.filter((k) => norm(getName(k)).includes(norm(kabSearch)));
  const filteredKec = kecList.filter((k) => norm(getName(k)).includes(norm(kecSearch)));
  const filteredKel = kelList.filter((k) => norm(getName(k)).includes(norm(kelSearch)));

  // Emit change
  useEffect(() => {
    const isHydrating = 
      (initialValue?.provinsi && !hydrated.prov) ||
      (initialValue?.kabupaten && !hydrated.kab) ||
      (initialValue?.kecamatan && !hydrated.kec) ||
      (initialValue?.kelurahan && !hydrated.kel);

    if (isHydrating) return;

    const prov =
      getName(provList.find((p) => p.id === provId)) ||
      (provId ? provSearch : "");
    const kab =
      getName(kabList.find((k) => k.id === kabId)) ||
      (kabId ? kabSearch : "");
    const kec =
      getName(kecList.find((k) => k.id === kecId)) ||
      (kecId ? kecSearch : "");
    const kel =
      getName(kelList.find((k) => k.id === kelId)) ||
      (kelId ? kelSearch : "");
    onChange({
      provinsi: prov,
      kabupaten: kab,
      kecamatan: kec,
      kelurahan: kel,
      kodePos,
      provinsiId: provId,
      kabId,
      kecId,
      kelId,
    });
  }, [
    provId,
    kabId,
    kecId,
    kelId,
    kodePos,
    provList,
    kabList,
    kecList,
    kelList,
    provSearch,
    kabSearch,
    kecSearch,
    kelSearch,
    hydrated.prov,
    hydrated.kab,
    hydrated.kec,
    hydrated.kel,
    initialValue,
    onChange,
  ]);

  // Load kabupaten when provinsi changes
  useEffect(() => {
    if (!provId) return;
    const controller = new AbortController();
    fetchWithCache(`/api/wilayah/kabupaten?id_provinsi=${provId}`, controller.signal)
      .then((j) => setKabList(j?.data ?? []))
      .catch((err) => {
        if (err.name !== "AbortError") setErrKab(true);
      })
      .finally(() => setLoadingKab(false));
    return () => controller.abort();
  }, [provId, retryKab]);

  /* eslint-disable react-hooks/set-state-in-effect -- one-shot hydration latch: seed the saved address once its wilayah list arrives */
  useEffect(() => {
    if (hydrated.kab) return;
    if (!provId) {
      setHydrated((h) => ({ ...h, kab: true }));
      return;
    }
    if (loadingKab) return;
    if (kabList.length === 0) return;

    if (!initialValue?.kabupaten) {
      setHydrated((h) => ({ ...h, kab: true }));
      return;
    }

    const found = matchWilayah(kabList, initialValue.kabupaten);
    if (found) {
      setKabId(found.id);
      setKabSearch(getName(found));
      setLoadingKec(true);
      setErrKec(false);
    } else {
      setKabSearch(initialValue.kabupaten);
    }
    setHydrated((h) => ({ ...h, kab: true }));
  }, [kabList, loadingKab, initialValue, hydrated.kab, provId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Load kecamatan when kabupaten changes
  useEffect(() => {
    if (!kabId) return;
    const controller = new AbortController();
    fetchWithCache(`/api/wilayah/kecamatan?id_kabupaten=${kabId}`, controller.signal)
      .then((j) => setKecList(j?.data ?? []))
      .catch((err) => {
        if (err.name !== "AbortError") setErrKec(true);
      })
      .finally(() => setLoadingKec(false));
    return () => controller.abort();
  }, [kabId, retryKec]);

  /* eslint-disable react-hooks/set-state-in-effect -- one-shot hydration latch: seed the saved address once its wilayah list arrives */
  useEffect(() => {
    if (hydrated.kec) return;
    if (!kabId) {
      setHydrated((h) => ({ ...h, kec: true }));
      return;
    }
    if (loadingKec) return;
    if (kecList.length === 0) return;

    if (!initialValue?.kecamatan) {
      setHydrated((h) => ({ ...h, kec: true }));
      return;
    }

    const found = matchWilayah(kecList, initialValue.kecamatan);
    if (found) {
      setKecId(found.id);
      setKecSearch(getName(found));
      setLoadingKel(true);
      setErrKel(false);
    } else {
      setKecSearch(initialValue.kecamatan);
    }
    setHydrated((h) => ({ ...h, kec: true }));
  }, [kecList, loadingKec, initialValue, hydrated.kec, kabId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Load kelurahan when kecamatan changes
  useEffect(() => {
    if (!kecId) return;
    const controller = new AbortController();
    fetchWithCache(`/api/wilayah/kelurahan?id_kecamatan=${kecId}`, controller.signal)
      .then((j) => setKelList(j?.data ?? []))
      .catch((err) => {
        if (err.name !== "AbortError") setErrKel(true);
      })
      .finally(() => setLoadingKel(false));
    return () => controller.abort();
  }, [kecId, retryKel]);

  /* eslint-disable react-hooks/set-state-in-effect -- one-shot hydration latch: seed the saved address once its wilayah list arrives */
  useEffect(() => {
    if (hydrated.kel) return;
    if (!kecId) {
      setHydrated((h) => ({ ...h, kel: true }));
      return;
    }
    if (loadingKel) return;
    if (kelList.length === 0) return;

    if (!initialValue?.kelurahan) {
      setHydrated((h) => ({ ...h, kel: true }));
      return;
    }

    const found = matchWilayah(kelList, initialValue.kelurahan);
    if (found) {
      setKelId(found.id);
      setKelSearch(getName(found));
    } else {
      setKelSearch(initialValue.kelurahan);
    }
    setHydrated((h) => ({ ...h, kel: true }));
  }, [kelList, loadingKel, initialValue, hydrated.kel, kecId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const inputClass =
    "w-full rounded-md border-2 border-brand-cream px-3 py-2.5 text-sm focus:border-brand-orange bg-white";
  const dropdownClass =
    "absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-brand-cream bg-white shadow-lg";

  const selectProv = (p: WilayahItem) => {
    setProvId(p.id);
    setProvSearch(getName(p));
    setShowProv(false);
    setKabId("");
    setKecId("");
    setKelId("");
    setKabSearch("");
    setKecSearch("");
    setKelSearch("");
    setLoadingKab(true);
    setErrKab(false);
    setHydrated({ prov: true, kab: true, kec: true, kel: true });
  };
  const selectKab = (k: WilayahItem) => {
    setKabId(k.id);
    setKabSearch(getName(k));
    setShowKab(false);
    setKecId("");
    setKelId("");
    setKecSearch("");
    setKelSearch("");
    setLoadingKec(true);
    setErrKec(false);
    setHydrated((h) => ({ ...h, kab: true, kec: true, kel: true }));
  };
  const selectKec = (k: WilayahItem) => {
    setKecId(k.id);
    setKecSearch(getName(k));
    setShowKec(false);
    setKelId("");
    setKelSearch("");
    setLoadingKel(true);
    setErrKel(false);
    setHydrated((h) => ({ ...h, kec: true, kel: true }));
  };
  const selectKel = (k: WilayahItem) => {
    setKelId(k.id);
    setKelSearch(getName(k));
    setShowKel(false);
    setHydrated((h) => ({ ...h, kel: true }));
  };

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {/* Provinsi */}
      <div ref={provRef} className="relative">
        <label className="text-[11px] font-bold text-brand-black/60 mb-1 block">Provinsi</label>
        <div className="relative">
          <input
            type="text"
            value={provSearch}
            onChange={(e) => {
              setProvSearch(e.target.value);
              setShowProv(true);
            }}
            onFocus={() => setShowProv(true)}
            placeholder={loadingProv ? "Memuat..." : "Ketik atau pilih provinsi..."}
            disabled={loadingProv || parentLoading}
            className={inputClass}
          />
          <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-brand-black/40" />
        </div>
        {errProv && (
          <div className="absolute right-8 top-2.5 z-10 flex items-center">
            <button type="button" onClick={() => { setLoadingProv(true); setErrProv(false); setRetryProv(r => r + 1); }} className="text-[10px] font-bold text-red-500 hover:underline">Gagal. Coba lagi</button>
          </div>
        )}
        {showProv && filteredProv.length > 0 && !errProv && (
          <ul className={dropdownClass}>
            {filteredProv.map((p) => (
              <li
                key={p.id}
                onClick={() => selectProv(p)}
                className="cursor-pointer px-3 py-2 text-sm hover:bg-brand-orange/10"
              >
                {getName(p)}
              </li>
            ))}
          </ul>
        )}
        {loadingProv && !errProv && <Loader2 className="absolute right-8 top-3 h-4 w-4 animate-spin text-brand-orange" />}
      </div>

      {/* Kabupaten */}
      <div ref={kabRef} className="relative">
        <label className="text-[11px] font-bold text-brand-black/60 mb-1 block">Kabupaten/Kota</label>
        <div className="relative">
          <input
            type="text"
            value={kabSearch}
            onChange={(e) => {
              setKabSearch(e.target.value);
              setShowKab(true);
            }}
            onFocus={() => setShowKab(true)}
            placeholder={!provId ? "Pilih provinsi dulu" : loadingKab ? "Memuat..." : "Ketik atau pilih kab/kota..."}
            disabled={!provId || loadingKab || parentLoading}
            className={inputClass}
          />
          <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-brand-black/40" />
        </div>
        {errKab && (
          <div className="absolute right-8 top-2.5 z-10 flex items-center">
            <button type="button" onClick={() => { setLoadingKab(true); setErrKab(false); setRetryKab(r => r + 1); }} className="text-[10px] font-bold text-red-500 hover:underline">Gagal. Coba lagi</button>
          </div>
        )}
        {showKab && filteredKab.length > 0 && !errKab && (
          <ul className={dropdownClass}>
            {filteredKab.map((k) => (
              <li
                key={k.id}
                onClick={() => selectKab(k)}
                className="cursor-pointer px-3 py-2 text-sm hover:bg-brand-orange/10"
              >
                {getName(k)}
              </li>
            ))}
          </ul>
        )}
        {loadingKab && !errKab && <Loader2 className="absolute right-8 top-3 h-4 w-4 animate-spin text-brand-orange" />}
      </div>

      {/* Kecamatan */}
      <div ref={kecRef} className="relative">
        <label className="text-[11px] font-bold text-brand-black/60 mb-1 block">Kecamatan</label>
        <div className="relative">
          <input
            type="text"
            value={kecSearch}
            onChange={(e) => {
              setKecSearch(e.target.value);
              setShowKec(true);
            }}
            onFocus={() => setShowKec(true)}
            placeholder={!kabId ? "Pilih kab/kota dulu" : loadingKec ? "Memuat..." : "Ketik atau pilih kecamatan..."}
            disabled={!kabId || loadingKec || parentLoading}
            className={inputClass}
          />
          <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-brand-black/40" />
        </div>
        {errKec && (
          <div className="absolute right-8 top-2.5 z-10 flex items-center">
            <button type="button" onClick={() => { setLoadingKec(true); setErrKec(false); setRetryKec(r => r + 1); }} className="text-[10px] font-bold text-red-500 hover:underline">Gagal. Coba lagi</button>
          </div>
        )}
        {showKec && filteredKec.length > 0 && !errKec && (
          <ul className={dropdownClass}>
            {filteredKec.map((k) => (
              <li
                key={k.id}
                onClick={() => selectKec(k)}
                className="cursor-pointer px-3 py-2 text-sm hover:bg-brand-orange/10"
              >
                {getName(k)}
              </li>
            ))}
          </ul>
        )}
        {loadingKec && !errKec && <Loader2 className="absolute right-8 top-3 h-4 w-4 animate-spin text-brand-orange" />}
      </div>

      {/* Kelurahan */}
      <div ref={kelRef} className="relative">
        <label className="text-[11px] font-bold text-brand-black/60 mb-1 block">Kelurahan/Desa</label>
        <div className="relative">
          <input
            type="text"
            value={kelSearch}
            onChange={(e) => {
              setKelSearch(e.target.value);
              setShowKel(true);
            }}
            onFocus={() => setShowKel(true)}
            placeholder={!kecId ? "Pilih kecamatan dulu" : loadingKel ? "Memuat..." : "Ketik atau pilih kelurahan..."}
            disabled={!kecId || loadingKel || parentLoading}
            className={inputClass}
          />
          <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-brand-black/40" />
        </div>
        {errKel && (
          <div className="absolute right-8 top-2.5 z-10 flex items-center">
            <button type="button" onClick={() => { setLoadingKel(true); setErrKel(false); setRetryKel(r => r + 1); }} className="text-[10px] font-bold text-red-500 hover:underline">Gagal. Coba lagi</button>
          </div>
        )}
        {showKel && filteredKel.length > 0 && !errKel && (
          <ul className={dropdownClass}>
            {filteredKel.map((k) => (
              <li
                key={k.id}
                onClick={() => selectKel(k)}
                className="cursor-pointer px-3 py-2 text-sm hover:bg-brand-orange/10"
              >
                {getName(k)}
              </li>
            ))}
          </ul>
        )}
        {loadingKel && !errKel && <Loader2 className="absolute right-8 top-3 h-4 w-4 animate-spin text-brand-orange" />}
      </div>

      {/* Kode Pos — auto-filled from API */}
      <div>
        <label className="text-[11px] font-bold text-brand-black/60 mb-1 block">Kode Pos</label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={5}
          value={kodePos}
          onChange={(e) => setKodePos(e.target.value.replace(/\D/g, "").slice(0, 5))}
          placeholder="Kode Pos (5 digit)"
          className={inputClass}
        />
      </div>
    </div>
  );
}
               