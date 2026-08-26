"use client";

import Image from "next/image";
import { Heart, MessageCircle, Play, Instagram } from "lucide-react";

export interface ReelItem {
  id: string;
  thumbnail: string;
  instagramUrl: string;
  likes: string;
  comments: string;
  views: string;
  caption: string;
}

interface InstagramReelsSectionProps {
  reels: ReelItem[];
}

export function InstagramReelsSection({ reels }: InstagramReelsSectionProps) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-brand-brass/20 bg-white p-6 shadow-[0_10px_40px_rgba(0,0,0,0.05)] md:p-8">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Instagram className="h-5 w-5 text-brand-orange" />
            <h3 className="font-bebas text-2xl tracking-wide text-brand-black">
              INSTAGRAM REELS
            </h3>
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-brand-black/50">
            Intip keseruan workshop & konten riding kami
          </p>
        </div>

        <a
          href="https://www.instagram.com/jogjadoelan"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-orange/20 bg-brand-orange/10 px-5 py-2 text-xs font-black text-brand-orange transition hover:bg-brand-orange hover:text-white"
        >
          <Instagram className="h-4 w-4" />
          Lihat Semua Reels
        </a>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
        {reels.map((reel) => (
          <a
            key={reel.id}
            href={reel.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative aspect-[9/16] overflow-hidden rounded-2xl bg-brand-black shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
          >
            <Image
              src={reel.thumbnail}
              alt={reel.caption}
              fill
              className="object-cover transition duration-500 group-hover:scale-105 group-hover:opacity-75"
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
            />

            {/* Hover Overlay */}
            <div className="absolute inset-0 flex flex-col justify-between bg-black/40 p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <div className="flex justify-end">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
                  <Play className="h-4 w-4 fill-white text-white" />
                </div>
              </div>

              <div className="space-y-3">
                <p className="line-clamp-2 text-xs leading-relaxed text-white">
                  {reel.caption}
                </p>

                <div className="flex items-center gap-4 text-xs font-bold text-white">
                  <div className="flex items-center gap-1">
                    <Heart className="h-4 w-4 fill-white" />
                    <span>{reel.likes}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="h-4 w-4 fill-white" />
                    <span>{reel.comments}</span>
                  </div>
                  <div className="ml-auto text-[10px] text-white/80">
                    {reel.views} views
                  </div>
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
