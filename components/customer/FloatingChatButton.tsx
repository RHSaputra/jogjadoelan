"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { useChatSupport } from "@/lib/chat-support-context";
import { useState } from "react";

export function FloatingChatButton() {
  const pathname = usePathname();
  const chat = useChatSupport();
  const [mounted] = useState(true);

  const unreadCount = mounted ? chat.unreadCount : 0;

  // Sembunyikan jika sudah di halaman chat
  if (pathname.includes("/chat")) return null;

  // Sembunyikan di area admin supaya tidak nyasar ke chat customer
  if (pathname.includes("/admin")) return null;

  return (
    <Link
      href="/chat"
      aria-label={unreadCount > 0 ? `Chat Admin (${unreadCount} pesan baru)` : "Chat Admin"}
      className="fixed bottom-44 right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-brand-orange text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-brand-orange-dark hover:shadow-xl md:bottom-36 md:h-14 md:w-14 animate-pulse-glow"
    >
      <MessageCircle className="h-6 w-6" />
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow ring-2 ring-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}