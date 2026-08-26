"use client";

import { Minus, Plus } from "lucide-react";

interface QuantityCounterProps {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}

export function QuantityCounter({
  value,
  onChange,
  min = 1,
  max = 999,
}: QuantityCounterProps) {
  return (
    <div className="inline-flex items-center overflow-hidden rounded-md border border-gray-300 bg-white">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="flex h-8 w-8 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40"
        aria-label="Kurangi"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="flex h-8 w-10 items-center justify-center border-x border-gray-300 text-sm font-medium">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="flex h-8 w-8 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40"
        aria-label="Tambah"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}