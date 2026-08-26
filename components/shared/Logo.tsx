"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SIZE_MAP = {
  sm: { box: "h-10 w-10", title: "text-lg", sub: "text-xs" },
  md: { box: "h-14 w-14", title: "text-2xl", sub: "text-sm" },
  lg: { box: "h-20 w-20", title: "text-4xl", sub: "text-base" },
};

type LogoProps = {
  size?: "sm" | "md" | "lg";
  withText?: boolean;
  className?: string;
};

const LOGO_YELLOW = "#F5C518";
const LOGO_BLUE = "#1F3F66";

export function Logo({ size = "md", withText = false, className }: LogoProps) {
  const s = SIZE_MAP[size];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Tentang Jogjadoelan"
          className={cn(
            "group inline-flex items-center gap-3 cursor-pointer rounded-xl",
            "transition-all duration-300 ease-out",
            "hover:scale-[1.03] active:scale-[0.97]",
            "hover:shadow-md",
            "focus:outline-none focus-visible:ring-0",
            className
          )}
        >
          {/* LOGO IMAGE */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-jogjadoelan.png"
            alt="Jogjadoelan"
            className={cn(
              s.box,
              "object-contain transition-all duration-300",
              "group-hover:rotate-1 group-hover:scale-105"
            )}
          />

          {/* WORDMARK */}
          {withText && (
            <span className="flex flex-col items-start leading-none">
              <span
                className={cn(
                  "font-bebas tracking-wider font-semibold transition-all duration-300",
                  s.title
                )}
                style={{ color: LOGO_BLUE }}
              >
                JOGJADOELAN
              </span>
              <span
                className={cn(
                  "font-sans tracking-[0.3em] text-brand-orange opacity-80",
                  s.sub
                )}
              >
                SEJAK 2019
              </span>
            </span>
          )}
        </button>
      </DialogTrigger>

      {/* POPUP */}
      <DialogContent
        className={cn(
          "sm:max-w-md border border-brand-brass/40",
          "bg-gradient-to-b from-[#1F3F66] to-[#0f223a]",
          "text-white shadow-2xl backdrop-blur-md",
          "animate-in fade-in zoom-in-95 duration-300"
        )}
      >
        <DialogHeader>
          <DialogTitle
            className="font-bebas text-2xl tracking-wider"
            style={{ color: LOGO_YELLOW }}
          >
            JOGJADOELAN
          </DialogTitle>
          <DialogDescription className="text-white/70 font-sans">
            Toko Helm Jadul Yogyakarta — Sejak 2019
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-2">
          {/* BIG LOGO */}
          <div
            className={cn(
              "rounded-2xl border border-brand-brass/40 p-6",
              "bg-white/5 backdrop-blur",
              "shadow-inner",
              "transition-all duration-500",
              "hover:scale-[1.02]"
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo-jogjadoelan.png"
              alt="Jogjadoelan"
              className="h-44 w-auto object-contain md:h-56 transition-transform duration-500 hover:scale-105"
            />
          </div>

          {/* TEXT */}
          <div className="text-center">
            <p
              className="font-bebas text-4xl tracking-wider"
              style={{ color: LOGO_YELLOW }}
            >
              JOGJADOELAN
            </p>
            <p className="mt-1 font-sans tracking-[0.4em] text-brand-orange">
              SEJAK 2019
            </p>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-white/80 font-sans">
              Koleksi helm vintage premium dari bogo klasik, cakil retro, hingga
              full-face racer untuk para rider klasik di Yogyakarta.
            </p>
          </div>

          {/* CTA BUTTON */}
          <DialogClose asChild>
            <Button
              asChild
              className={cn(
                "bg-brand-orange text-white font-sans",
                "hover:bg-brand-orange/90",
                "transition-all duration-300",
                "hover:scale-105 active:scale-95",
                "shadow-md hover:shadow-lg"
              )}
            >
              <Link href="/">Kunjungi Beranda</Link>
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}