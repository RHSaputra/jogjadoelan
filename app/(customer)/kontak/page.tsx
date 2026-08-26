"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useMemo, type FormEvent } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Send,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/api/keys";
import { api } from "@/lib/api/fetcher";
import { ADMIN_INFO as ADMIN_INFO_DEFAULT } from "@/lib/constants";

export default function KontakPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: qk.settings.section("kontak"),
    queryFn: () => api.get<{ kontak?: { waUtama?: string; email?: string; hpUtama?: string } }>("/api/settings", { query: { keys: "kontak" } }),
    staleTime: 5 * 60 * 1000,
  });

  const ADMIN_INFO = useMemo(() => {
    const k = data?.kontak;
    return {
      ...ADMIN_INFO_DEFAULT,
      waNumber: k?.waUtama || ADMIN_INFO_DEFAULT.waNumber,
      email: k?.email || ADMIN_INFO_DEFAULT.email,
      noHp: k?.hpUtama || ADMIN_INFO_DEFAULT.noHp,
    };
  }, [data]);

  useEffect(() => {
    const sync = () => {
      void qc.invalidateQueries({ queryKey: qk.settings.section("kontak") });
    };
    window.addEventListener("jogjadoelan_kontak_changed", sync);
    window.addEventListener("jogjadoelan_toko_changed", sync);
    return () => {
      window.removeEventListener("jogjadoelan_kontak_changed", sync);
      window.removeEventListener("jogjadoelan_toko_changed", sync);
    };
  }, [qc]);
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [pesan, setPesan] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!nama.trim() || !email.trim() || !pesan.trim()) return;

    const text =
      `Halo Jogjadoelan,%0A%0A` +
      `Nama: ${nama}%0A` +
      `Email: ${email}%0A%0A` +
      `${pesan}`;

    window.open(
      `https://wa.me/${ADMIN_INFO.waNumber}?text=${text}`,
      "_blank"
    );

    setSent(true);

    setTimeout(() => {
      setNama("");
      setEmail("");
      setPesan("");
      setSent(false);
    }, 2500);
  }

  return (
    <div className="min-h-screen bg-brand-cream-light pb-12">
      
      {/* HEADER */}
      <div className="sticky top-0 z-20 border-b border-brand-cream bg-white shadow-sm">
        <div className="container mx-auto flex items-center gap-3 px-4 py-3">
          
          <Link
            href="/akun"
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <h1 className="flex-1 text-lg font-black text-brand-black">
            Kontak Kami
          </h1>

        </div>
      </div>

      {/* CONTENT */}
      <div className="container mx-auto max-w-2xl space-y-4 px-4 py-5">

        {/* CONTACT CARDS */}
        <div className="grid grid-cols-3 gap-2">

          {/* WHATSAPP */}
          <a
            href={`https://wa.me/${ADMIN_INFO.waNumber}`}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center gap-2 rounded-2xl border border-brand-cream bg-white p-4 shadow-sm transition hover:border-brand-orange"
          >
            <Image
              src="/icons/whatsapp.png"
              alt="WhatsApp"
              width={50}
              height={50}
              className="object-contain"
            />

            <p className="text-[11px] font-black text-brand-black">
              WhatsApp
            </p>
          </a>

          {/* TELEPON */}
          <a
            href={`tel:+62${ADMIN_INFO.waNumber.slice(2)}`}
            className="flex flex-col items-center gap-2 rounded-2xl border border-brand-cream bg-white p-4 shadow-sm transition hover:border-brand-orange"
          >
            <Image
              src="/icons/phone.png"
              alt="Telepon"
              width={50}
              height={50}
              className="object-contain"
            />

            <p className="text-[11px] font-black text-brand-black">
              Telepon
            </p>
          </a>

          {/* EMAIL */}
          <a
            href="mailto:jogjadoelantechforlocal.id@gmail.com"
            className="flex flex-col items-center gap-2 rounded-2xl border border-brand-cream bg-white p-4 shadow-sm transition hover:border-brand-orange"
          >
            <Image
              src="/icons/email.png"
              alt="Email"
              width={50}
              height={50}
              className="object-contain"
            />

            <p className="text-[11px] font-black text-brand-black">
              Email
            </p>
          </a>

        </div>

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-2xl border border-brand-cream bg-white p-5 shadow-sm"
        >
          <h3 className="text-sm font-black text-brand-black">
            Kirim Pesan
          </h3>

          {/* NAMA */}
          <div>
            <label className="text-[11px] font-bold text-brand-black/70">
              Nama
            </label>

            <input
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-orange"
            />
          </div>

          {/* EMAIL */}
          <div>
            <label className="text-[11px] font-bold text-brand-black/70">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-orange"
            />
          </div>

          {/* PESAN */}
          <div>
            <label className="text-[11px] font-bold text-brand-black/70">
              Pesan
            </label>

            <textarea
              value={pesan}
              onChange={(e) => setPesan(e.target.value)}
              required
              rows={4}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-orange"
            />
          </div>

          {/* BUTTON */}
          {sent ? (
            <div className="flex items-center justify-center gap-2 rounded-md bg-green-50 py-3 text-sm font-bold text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              Pesan terkirim ke WhatsApp
            </div>
          ) : (
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-md bg-brand-orange py-3 text-sm font-black text-white shadow transition hover:bg-brand-orange-dark"
            >
              <Send className="h-4 w-4" />
              Kirim via WhatsApp
            </button>
          )}
        </form>

      </div>
    </div>
  );
}