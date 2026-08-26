import Link from "next/link";
import { Construction, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <section className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-2xl rounded-2xl border-2 border-brand-krem bg-white p-10 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-krem text-brand-orange">
            <Construction className="h-8 w-8" />
          </div>
        </div>
        <h1 className="mb-3 font-bebas text-4xl tracking-wider text-brand-black">
          {title.toUpperCase()}
        </h1>
        <p className="mb-6 text-brand-black/70">{description}</p>
        <Button asChild variant="outline" className="border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Beranda
          </Link>
        </Button>
      </div>
    </section>
  );
}