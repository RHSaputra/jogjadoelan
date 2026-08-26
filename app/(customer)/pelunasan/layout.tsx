"use client";

import { type ReactNode } from "react";
import { CustomOrderProvider } from "@/lib/custom-order-context";

export default function PelunasanLayout({ children }: { children: ReactNode }) {
  return <CustomOrderProvider>{children}</CustomOrderProvider>;
}
