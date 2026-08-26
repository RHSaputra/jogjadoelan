"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  Search,
  ShoppingCart,
  Bell,
  User,
  Menu,
  MessageCircle,
} from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { useNotifikasi } from "@/lib/notifikasi-context";
import { useChatSupport } from "@/lib/chat-support-context";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Beranda", href: "/" },
  { label: "Belanja", href: "/belanja" },
  { label: "Custom Helm", href: "/custom" },
  { label: "Pesanan Saya", href: "/pesanan" },
];

const formatBadge = (n: number) => (n > 99 ? "99+" : String(n));

/** Pure helper — deteksi route aktif */
const isActiveRoute = (pathname: string, href: string) => {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
};

const subscribeMounted = () => () => {};
const getMountedSnapshot = () => true;
const getServerSnapshot = () => false;

export function Header() {
  const { isAuthenticated } = useAuth();
  const cart = useCart();
  const notif = useNotifikasi();
  const chat = useChatSupport();
  const pathname = usePathname();
  const router = useRouter();

  const mounted = useSyncExternalStore(
    subscribeMounted,
    getMountedSnapshot,
    getServerSnapshot,
  );

  // STATE BARU: Teks dinamis dari Admin
  const [headerText, setHeaderText] = useState("Toko Helm Jadul Yogyakarta - Free ongkir Yogyakarta order min Rp 500rb");

  useEffect(() => {
    fetch("/api/settings?keys=header_text")
      .then((r) => r.json())
      .then((j) => {
        const t = j?.data?.header_text as string | null;
        if (t) setHeaderText(t);
      })
      .catch(() => {});
  }, []);

  // Guest tidak boleh melihat badge keranjang — count = 0 untuk guest
  const cartQty = mounted && isAuthenticated
    ? cart.items.reduce((s, it) => s + (it.qty || 0), 0)
    : 0;
  const notifQty = mounted ? notif.unreadCount : 0;
  const chatQty = mounted ? chat.unreadCount : 0;

  /** Active flags — pre-computed biar JSX clean */
  const notifActive = isActiveRoute(pathname, "/notifikasi");
  const chatActive = isActiveRoute(pathname, "/chat");
  const cartActive = isActiveRoute(pathname, "/keranjang");
  const akunActive = isActiveRoute(pathname, "/akun");

  /** Class shared untuk icon buttons */
  const iconBtnClass = (active: boolean) =>
    cn(
      "relative transition-all duration-200",
      active
        ? "bg-brand-orange/15 text-brand-orange ring-1 ring-brand-orange/30 hover:bg-brand-orange/20 hover:text-brand-orange"
        : "text-foreground hover:bg-brand-orange/10 hover:text-brand-orange"
    );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/80">
      {/* === TOP STRIP === */}
      <div className="hidden border-b border-border/50 bg-brand-krem/40 md:block">
        <div className="container mx-auto flex h-8 items-center justify-between px-4 text-xs text-muted-foreground">
          {/* TEKS DI SINI SEKARANG DINAMIS! */}
          <span className="font-semibold text-brand-black/70">
            {headerText}
          </span>
          <div className="flex items-center gap-4 font-bold">
            <Link
              href="/lokasi"
              className="transition-colors hover:text-brand-orange"
            >
              Lokasi Toko
            </Link>
            <Link
              href="/bantuan"
              className="transition-colors hover:text-brand-orange"
            >
              Bantuan
            </Link>
          </div>
        </div>
      </div>

      {/* === MAIN BAR === */}
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">

        {/* LEFT SIDE MOBILE */}
        <div className="flex items-center gap-3">
          {/* Logo mobile */}
          <Logo size="md" className="sm:hidden" />

          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" aria-label="Buka menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>

            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle>
                  <Logo withText size="md" />
                </SheetTitle>
              </SheetHeader>

              <nav className="mt-6 flex flex-col gap-1">
                {NAV_LINKS.map((link) => {
                  const active = isActiveRoute(pathname, link.href);

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "relative rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-brand-orange/10 text-brand-orange"
                          : "text-foreground hover:bg-brand-krem hover:text-brand-orange"
                      )}
                    >
                      {link.label}

                      {active && (
                        <span className="absolute bottom-1 left-3 right-3 h-0.5 rounded-full bg-brand-orange" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        {/* Logo desktop */}
        <Logo size="md" withText className="hidden sm:flex" />

        {/* Search desktop */}
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const q = String(fd.get("q") ?? "").trim();
            if (!q) return;
            router.push(`/cari?q=${encodeURIComponent(q)}`);
            e.currentTarget.reset();
          }}
          className="relative hidden flex-1 max-w-2xl md:block"
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            type="search"
            placeholder="Cari helm bogo, retro, cakil..."
            className="pl-10 pr-4"
          />
        </form>

        {/* === NAV DESKTOP — DENGAN UNDERLINE ACTIVE === */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => {
            const active = isActiveRoute(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative px-3 py-2 text-sm font-medium transition-colors duration-200",
                  active
                    ? "text-brand-orange"
                    : "text-foreground hover:text-brand-orange"
                )}
              >
                {link.label}

                {/* Underline animasi: full saat active, scale-0 default, scale-100 saat hover */}
                <span
                  className={cn(
                    "absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-brand-orange transition-transform duration-300 origin-left",
                    active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  )}
                />
              </Link>
            );
          })}
        </nav>

        {/* === ICON BUTTONS — HOVER ORANGE + ACTIVE HIGHLIGHT === */}
        <div className="flex items-center gap-1">
          {/* Notifikasi */}
          <Button
            variant="ghost"
            size="icon"
            asChild
            className={iconBtnClass(notifActive)}
          >
            <Link
              href="/notifikasi"
              aria-label={
                notifQty > 0
                  ? `Notifikasi (${notifQty} belum dibaca)`
                  : "Notifikasi"
              }
              className="relative"
            >
              <Bell className="h-5 w-5" />
              {notifQty > 0 && (
                <Badge
                  className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-orange px-1 text-[10px] font-bold leading-none text-white shadow ring-2 ring-white"
                  aria-hidden
                >
                  {formatBadge(notifQty)}
                </Badge>
              )}
              {notifActive && (
                <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-brand-orange" />
              )}
            </Link>
          </Button>

          {/* Chat */}
          <Button
            variant="ghost"
            size="icon"
            asChild
            className={iconBtnClass(chatActive)}
          >
            <Link
              href="/chat"
              aria-label={
                chatQty > 0
                  ? `Chat Admin (${chatQty} pesan baru)`
                  : "Chat Admin"
              }
              className="relative"
            >
              <MessageCircle className="h-5 w-5" />
              {chatQty > 0 && (
                <Badge
                  className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-orange px-1 text-[10px] font-bold leading-none text-white shadow ring-2 ring-white"
                  aria-hidden
                >
                  {formatBadge(chatQty)}
                </Badge>
              )}
              {chatActive && (
                <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-brand-orange" />
              )}
            </Link>
          </Button>

          {/* Keranjang */}
          <Button
            variant="ghost"
            size="icon"
            asChild
            className={iconBtnClass(cartActive)}
          >
            <Link
              href="/keranjang"
              aria-label={
                cartQty > 0 ? `Keranjang (${cartQty} barang)` : "Keranjang"
              }
              className="relative"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartQty > 0 && (
                <Badge
                  className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-orange px-1 text-[10px] font-bold leading-none text-white shadow ring-2 ring-white"
                  aria-hidden
                >
                  {formatBadge(cartQty)}
                </Badge>
              )}
              {cartActive && (
                <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-brand-orange" />
              )}
            </Link>
          </Button>

          {/* Akun */}
          <Button
            variant="ghost"
            size="icon"
            asChild
            className={cn(iconBtnClass(akunActive), "hidden sm:inline-flex")}
          >
            <Link href="/akun" aria-label="Akun" className="relative">
              <User className="h-5 w-5" />
              {akunActive && (
                <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-brand-orange" />
              )}
            </Link>
          </Button>
        </div>
      </div>

      {/* === SEARCH MOBILE === */}
      <div className="border-t border-border bg-white px-4 py-2 md:hidden">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const q = String(fd.get("q") ?? "").trim();
            if (!q) return;
            router.push(`/cari?q=${encodeURIComponent(q)}`);
            e.currentTarget.reset();
          }}
          className="relative"
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            type="search"
            placeholder="Cari helm jadul..."
            className="pl-10 pr-4"
          />
        </form>
      </div>
    </header>
  );
}