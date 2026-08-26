"use client";

import { type ReactNode } from "react";
import { KomplainProvider } from "@/lib/komplain-context";

export default function RefundLayout({ children }: { children: ReactNode }) {
  return <KomplainProvider>{children}</KomplainProvider>;
}
