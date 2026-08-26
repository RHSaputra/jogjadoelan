import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Bebas_Neue } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const bebas = Bebas_Neue({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-bebas",
  display: "swap",
});

import { Toaster } from "sonner";
import { Providers } from "./providers";
import TokoConfigInjector from "@/components/customer/TokoConfigInjector";

export const metadata: Metadata = {
  title: "Jogjadoelan — Toko Helm Jadul Yogyakarta",
  description:
    "Pelopor helm jadul autentik dari kota gudeg. Bogo, Retro, Cakil, dan custom helm sesuai selera.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${jakarta.variable} ${bebas.variable}`}>
      <body className="antialiased">
        <Providers>
          {/* Injector Konfigurasi Global Toko ditaruh paling atas dari children */}
          <TokoConfigInjector />
          {children}
        </Providers>
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}