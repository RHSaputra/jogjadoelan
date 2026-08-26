"use client";

import { useState } from "react";

export function ProductGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const display = images.length > 0 ? images : ["", "", "", ""];
  const [active, setActive] = useState(0);

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray-300">
        {display[active] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={display[active]}
            alt={alt}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400">
            <span className="text-sm">Foto Produk</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {display.slice(0, 4).map((img, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            className={`relative h-16 w-16 overflow-hidden rounded-lg border-2 ${
              active === i ? "border-orange-500" : "border-transparent"
            } bg-gray-300`}
            aria-label={`Foto ${i + 1}`}
          >
            {img && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} alt={`${alt} ${i + 1}`} className="h-full w-full object-cover" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}