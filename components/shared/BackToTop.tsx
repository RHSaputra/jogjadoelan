"use client";

import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";
import { usePathname } from "next/dist/client/components/navigation";

export function BackToTop() {
  const [show, setShow] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    function handleScroll() {
      setShow(window.scrollY > 300);
    }

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  if (!show || pathname.includes("/chat")) return null;

  return (
    <button
      onClick={scrollToTop}
      aria-label="Kembali ke atas"
      className="fixed bottom-24 right-4 z-50 flex h-8 w-8 items-center justify-center rounded-full border border-brand-brass/40 bg-brand-black text-brand-brass shadow-[0_8px_25px_rgba(0,0,0,0.35)] backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:bg-brand-rust hover:text-white md:bottom-6 md:h-12 md:w-12"
    >
      <ChevronUp className="h-5 w-5" />
    </button>
  );
}