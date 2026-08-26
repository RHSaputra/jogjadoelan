"use client";

import { type ReactNode } from "react";
import { CustomOrderProvider } from "@/lib/custom-order-context";

export default function CustomLayout({ children }: { children: ReactNode }) {
  return <CustomOrderProvider>{children}</CustomOrderProvider>;
}
