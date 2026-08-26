import { Header } from "@/components/customer/Header";
import { Footer } from "@/components/customer/Footer";
import { BottomNav } from "@/components/customer/BottomNav";
import { BackToTop } from "@/components/shared/BackToTop";
import { FloatingChatButton } from "@/components/customer/FloatingChatButton";
import { CustomerProviders } from "./CustomerProviders";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CustomerProviders>
      <div className="flex min-h-screen flex-col">
        <Header />

        <main className="flex-1">{children}</main>

        <div className="bg-brand-black md:pb-0">
          <Footer />
        </div>

        <BottomNav />

        <BackToTop />

        <FloatingChatButton />
      </div>
    </CustomerProviders>
  );
}