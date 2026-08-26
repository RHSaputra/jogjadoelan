"use client";

import { JENIS_HELM } from "@/lib/constants";

interface FilterBarProps {
  activeJenis: string;
  onJenisChange: (jenis: string) => void;
}

export function FilterBar({ activeJenis, onJenisChange }: FilterBarProps) {
  return (
    <div className="bg-brand-cream-light">
      
      <div className="px-4 py-3">
        
        {/* WRAPPER */}
        <div className="relative">

          {/* SCROLL AREA */}
          <div className="flex items-center gap-2 overflow-x-auto overflow-y-visible pb-2 pt-1 scrollbar-thin scrollbar-thumb-brand-orange/40 scrollbar-track-transparent">
            
            <span className="shrink-0 text-sm font-medium leading-none text-brand-black">
              Filter :
            </span>

            {JENIS_HELM.map((j) => (
              <button
                key={j.value}
                onClick={() => onJenisChange(j.value)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold leading-none shadow-sm transition-all duration-200 ${
                  activeJenis === j.value
                    ? "bg-brand-orange text-white shadow-md"
                    : "bg-white text-brand-black ring-1 ring-brand-cream hover:bg-brand-cream hover:shadow-sm"
                }`}
              >
                {j.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}