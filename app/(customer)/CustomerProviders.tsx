"use client";

import { type ReactNode } from "react";
import { NotifikasiProvider } from "@/lib/notifikasi-context";
import { CartProvider } from "@/lib/cart-context";
import { ChatSupportProvider } from "@/lib/chat-support-context";
import { OrderJobsMounter } from "@/components/customer/OrderJobsMounter";

export function CustomerProviders({ children }: { children: ReactNode }) {
  return (
    <NotifikasiProvider>
      <CartProvider>
        <ChatSupportProvider>
          <OrderJobsMounter />
          {children}
        </ChatSupportProvider>
      </CartProvider>
    </NotifikasiProvider>
  );
}

export default CustomerProviders;
