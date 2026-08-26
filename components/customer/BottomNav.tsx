"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Home, Store, Palette, ShoppingBag, User } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";

const subscribeMounted = () => () => {};
const getMountedSnapshot = () => true;
const getServerSnapshot = () => false;

const ITEMS: Array<{ href: string; label: string; icon: typeof Home; withCart?: boolean }> = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/belanja", label: "Belanja", icon: Store },
  { href: "/custom", label: "Custom", icon: Palette },
  { href: "/keranjang", label: "Keranjang", icon: ShoppingBag, withCart: true },
  { href: "/akun", label: "Profil", icon: User },
];

const formatBadge = (n: number) => (n > 99 ? "99+" : String(n));

export function BottomNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  
  const cart = useCart();

  const mounted = useSyncExternalStore(
    subscribeMounted,
    getMountedSnapshot,
    getServerSnapshot,
  );

  // Guest tidak boleh melihat badge keranjang
  const cartQty = mounted && isAuthenticated
    ? cart.items.reduce((s, it) => s + (it.qty || 0), 0)
    : 0;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-brand-cream bg-white shadow-lg md:hidden">
      <div className="grid grid-cols-5">
        {ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          const showBadge = item.withCart && cartQty > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
                active
                  ? "text-brand-orange"
                  : "text-brand-black/60 hover:text-brand-orange"
              }`}
              aria-label={
                showBadge ? `${item.label} (${cartQty} barang)` : item.label
              }
            >
              <span className="relative">
                <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
                {showBadge && (
                  <span
                    className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-orange px-1 text-[9px] font-bold leading-none text-white shadow ring-2 ring-white"
                    aria-hidden
                  >
                    {formatBadge(cartQty)}
                  </span>
                )}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}