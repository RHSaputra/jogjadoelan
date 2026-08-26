import Link from "next/link";
import {
  ArrowLeft,
  Award,
  Heart,
  Users,
  MapPin,
  Phone,
  Instagram,
  ShieldCheck,
  Star,
  Palette,
  Clock3,
  Sparkles,
  Bike,
  Coffee,
} from "lucide-react";
import { InstagramReelsSection } from "@/components/customer/InstagramReelsSection";

const JOGJADOELAN_REELS = [
  {
    id: "reel-1",
    thumbnail: "/images/hero/carousel.png",
    instagramUrl: "https://www.instagram.com/reel/C8a123bcXYZ",
    likes: "1.2k",
    comments: "45",
    views: "15k",
    caption: "Restorasi Helm Vintage Vespa 1970an. Back to classic! 🛵✨ #jogjadoelan #helmvintage"
  },
  {
    id: "reel-2",
    thumbnail: "/images/hero/carousel2.png",
    instagramUrl: "https://www.instagram.com/reel/C8b456deUVW",
    likes: "850",
    comments: "32",
    views: "10k",
    caption: "Custom paint helm dengan sentuhan glitter emas & aksen retro. 🎨🔥 #customhelmet #vintage"
  },
  {
    id: "reel-3",
    thumbnail: "/images/hero/carousel3.png",
    instagramUrl: "https://www.instagram.com/reel/C8c789fgRST",
    likes: "2.1k",
    comments: "89",
    views: "25k",
    caption: "Sunmori Jogja vibes bersama teman-teman vintage helm culture. Rute Merapi! 🌋💨 #sunmori #jogja"
  }
];
export default function TentangPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-brand-cream-light pb-16">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 border-b border-brand-cream bg-white/95 shadow-sm backdrop-blur">
        <div className="container mx-auto flex items-center gap-3 px-4 py-3">
          <Link
            href="/akun"
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <h1 className="flex-1 text-lg font-black text-brand-black">
            Tentang Kami
          </h1>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl space-y-6 px-4 py-6">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-[2rem] border border-brand-brass/20 bg-gradient-to-br from-[#120d0a] via-[#1f1712] to-[#6e431f] p-7 text-white shadow-[0_25px_80px_rgba(0,0,0,0.35)] md:p-10">
          {/* texture */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "22px 22px",
            }}
          />

          {/* blur */}
          <div className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-brand-orange/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-brand-orange/20 blur-3xl" />

          {/* watermark */}
          <div className="pointer-events-none absolute -right-16 bottom-0 opacity-[0.08]">
            <Bike className="h-72 w-72" />
          </div>

          <div className="relative z-10 grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            {/* LEFT */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] backdrop-blur-md">
                <Clock3 className="h-3 w-3" />
                Est. 2019 · Vintage Helmet Culture
              </div>

              <h2 className="mt-5 font-bebas text-5xl leading-none tracking-tight sm:text-7xl">
                TENTANG
                <span className="block text-brand-orange">
                  JOGJADOELAN
                </span>
              </h2>

              <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base">
                Berawal dari kecintaan terhadap budaya riding klasik dan dunia
                retro vintage, Jogjadoelan hadir sebagai workshop helm yang
                menghadirkan karakter, gaya, dan pengalaman berkendara yang
                lebih personal untuk para rider Indonesia.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="https://www.instagram.com/jogjadoelan"
                  target="_self"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-black text-brand-black shadow-lg transition hover:scale-[1.03]"
                >
                  <Instagram className="h-4 w-4" />
                  Follow Instagram
                </a>

                <Link
                  href="/custom"
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-2.5 text-xs font-black text-white backdrop-blur-md transition hover:bg-white/20"
                >
                  <Palette className="h-4 w-4" />
                  Lihat Custom Helm
                </Link>
              </div>
            </div>

            {/* RIGHT */}
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/20 p-6 backdrop-blur-md">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />

              <div className="relative grid gap-4">
                {[
                  {
                    icon: Sparkles,
                    title: "Vintage Workshop",
                    desc: "Nuansa klasik dengan sentuhan modern premium.",
                  },
                  {
                    icon: ShieldCheck,
                    title: "Original Style",
                    desc: "Karakter helm dibuat tetap autentik dan unik.",
                  },
                  {
                    icon: Coffee,
                    title: "Rider Culture",
                    desc: "Bukan sekadar helm, tapi bagian dari perjalanan.",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brand-orange/30 bg-brand-orange/10 text-brand-orange">
                      <item.icon className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="font-bebas text-xl tracking-wide text-white">
                        {item.title}
                      </p>

                      <p className="text-xs leading-relaxed text-white/70">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: Award, label: "5+ Tahun", desc: "Pengalaman" },
            { icon: Users, label: "10rb+", desc: "Pelanggan" },
            { icon: Palette, label: "100+", desc: "Model Vintage" },
            { icon: Heart, label: "98%", desc: "Kepuasan" },
          ].map((s, i) => (
            <div
              key={i}
              className="group relative overflow-hidden rounded-3xl border border-brand-brass/20 bg-white p-5 text-center shadow-[0_10px_35px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(0,0,0,0.12)]"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-orange to-brand-orange-dark" />

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-brand-orange/20 bg-brand-orange/10 text-brand-orange transition group-hover:scale-105">
                <s.icon className="h-7 w-7" />
              </div>

              <p className="mt-3 font-bebas text-3xl text-brand-black">
                {s.label}
              </p>

              <p className="text-[11px] uppercase tracking-[0.18em] text-brand-black/50">
                {s.desc}
              </p>
            </div>
          ))}
        </section>

        {/* STORY TIMELINE */}
        <section className="overflow-hidden rounded-[2rem] border border-brand-brass/20 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.05)]">
          <div className="border-b border-brand-cream bg-gradient-to-r from-brand-cream-light to-white px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange">
                <Heart className="h-5 w-5" />
              </div>

              <div>
                <p className="font-bebas text-2xl tracking-wide text-brand-black">
                  CERITA KAMI
                </p>

                <p className="text-xs uppercase tracking-[0.2em] text-brand-black/50">
                  Vintage Rider Journey
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-6 md:grid-cols-2">
            <div className="space-y-4">
              {[
                {
                  year: "2019",
                  title: "Awal Perjalanan",
                  desc: "Dimulai dari kecintaan terhadap helm retro dan budaya riding klasik di Yogyakarta.",
                },
                {
                  year: "2021",
                  title: "Custom Workshop",
                  desc: "Mulai menghadirkan layanan custom helm dengan karakter dan gaya yang lebih personal.",
                },
                {
                  year: "SEKARANG",
                  title: "Vintage Culture",
                  desc: "Menjadi bagian dari komunitas rider yang menyukai gaya vintage dan perjalanan penuh cerita.",
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-15 w-15 items-center justify-center rounded-full bg-brand-black font-bebas text-sm tracking-wider text-brand-orange shadow-lg">
                      {item.year}
                    </div>

                    {i !== 2 && (
                      <div className="mt-2 h-16 w-px bg-brand-brass/30" />
                    )}
                  </div>

                  <div className="pb-6">
                    <h4 className="font-bebas text-2xl tracking-wide text-brand-black">
                      {item.title}
                    </h4>

                    <p className="mt-1 text-sm leading-relaxed text-brand-black/70">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="relative overflow-hidden rounded-[2rem] border border-brand-brass/20 bg-gradient-to-br from-brand-black via-[#1d1713] to-brand-orange-dark p-6 text-white">
              <div className="absolute inset-0 opacity-[0.05] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:20px_20px]" />

              <div className="relative z-10">
                <span className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-white/70">
                  Jogjadoelan Philosophy
                </span>

                <h3 className="mt-4 font-bebas text-4xl leading-none tracking-wide text-white">
                  BUKAN SEKADAR HELM
                </h3>

                <p className="mt-4 text-sm leading-relaxed text-white/75">
                  Kami percaya helm bukan hanya perlengkapan riding, tetapi
                  bagian dari identitas, karakter, dan cerita perjalanan setiap
                  rider.
                </p>

                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                  <p className="font-bebas text-xl tracking-wide text-brand-orange">
                    VINTAGE · CULTURE · EXPERIENCE
                  </p>

                  <p className="mt-2 text-xs leading-relaxed text-white/70">
                    Setiap produk dan custom dibuat untuk menghadirkan nuansa
                    klasik yang tetap relevan untuk rider modern masa kini.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* REELS */}
        <InstagramReelsSection reels={JOGJADOELAN_REELS} />

        {/* VISI MISI */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="relative overflow-hidden rounded-[2rem] border border-brand-brass/20 bg-gradient-to-br from-brand-black via-[#1c1510] to-[#6d4320] p-6 text-white shadow-xl">
            <div className="absolute inset-0 opacity-[0.05] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:20px_20px]" />

            <div className="relative z-10">
              <div className="flex h-15 w-15 items-center justify-center rounded-full border border-white/10 bg-white/10 text-brand-orange">
                <Star className="h-6 w-6" />
              </div>

              <p className="mt-5 font-bebas text-4xl tracking-wide">
                VISI
              </p>

              <p className="mt-4 text-sm leading-relaxed text-white/80">
                Menjadi workshop helm vintage dan custom culture lokal yang
                menghadirkan gaya klasik berkualitas untuk rider Indonesia.
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-brand-brass/20 bg-white p-6 shadow-xl">
            <div className="flex h-15 w-15 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange">
              <ShieldCheck className="h-6 w-6" />
            </div>

            <p className="mt-5 font-bebas text-4xl tracking-wide text-brand-black">
              MISI
            </p>

            <div className="mt-5 space-y-3">
              {[
                "Menghadirkan helm vintage dengan kualitas terbaik.",
                "Menyediakan layanan custom yang personal dan fleksibel.",
                "Membangun komunitas rider dengan budaya klasik modern.",
              ].map((m, i) => (
                <div
                  key={i}
                  className="flex gap-3 rounded-2xl border border-brand-cream bg-brand-cream-light/50 p-3"
                >
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-orange text-white">
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </div>

                  <p className="text-sm leading-relaxed text-brand-black/75">
                    {m}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden rounded-[2rem] border border-brand-brass/20 bg-gradient-to-br from-brand-black via-[#1a1410] to-[#5b3619] p-6 text-white shadow-[0_20px_60px_rgba(0,0,0,0.25)] md:p-8">
          <div className="absolute inset-0 opacity-[0.05] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:22px_22px]" />

          <div className="relative z-10 grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <span className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-white/70">
                Workshop & Consultation
              </span>

              <h3 className="mt-4 font-bebas text-4xl leading-none tracking-wide text-white md:text-5xl">
                KUNJUNGI WORKSHOP KAMI
              </h3>

              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/75">
                Datang langsung untuk melihat koleksi helm vintage, konsultasi
                custom, dan menikmati suasana workshop retro khas Jogjadoelan.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-brand-orange" />

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">
                      Lokasi
                    </p>

                    <p className="text-sm text-white/85">
                      Yogyakarta
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-brand-orange" />

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">
                      Kontak
                    </p>

                    <p className="text-sm text-white/85">
                      WA / Instagram
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <Instagram className="h-5 w-5 text-brand-orange" />

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">
                      Instagram
                    </p>

                    <p className="text-sm text-white/85">
                      @jogjadoelan
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

