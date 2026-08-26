"use client";

import { type ReactNode } from "react";
import { KomplainProvider } from "@/lib/komplain-context";

export default function TukarLayout({ children }: { children: ReactNode }) {
  return <KomplainProvider>{children}</KomplainProvider>;
}
