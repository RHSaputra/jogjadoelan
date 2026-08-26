"use client";

import { type ReactNode } from "react";
import { CustomOrderProvider } from "@/lib/custom-order-context";
import { KomplainProvider } from "@/lib/komplain-context";

export default function ChatLayout({ children }: { children: ReactNode }) {
  return (
    <CustomOrderProvider>
      <KomplainProvider>{children}</KomplainProvider>
    </CustomOrderProvider>
  );
}
