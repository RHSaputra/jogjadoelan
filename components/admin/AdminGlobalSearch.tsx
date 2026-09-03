"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { Search, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/use-debounce";

interface SearchResult {
  category: string;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

export function AdminGlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [settledQuery, setSettledQuery] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Gunakan delay 300ms
  const debouncedQuery = useDebounce(query, 300);

  // Derived: sedang fetching bila query aktif belum ter-settle oleh respons terakhir
  const isLoading = debouncedQuery !== "" && settledQuery !== debouncedQuery;

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch API
  useEffect(() => {
    if (!debouncedQuery) return;

    let isMounted = true;

    fetch(`/api/admin/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Search failed");
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setResults(data);
          setSelectedIndex(-1); // Reset selection
        }
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        if (isMounted) setSettledQuery(debouncedQuery);
      });

    return () => {
      isMounted = false;
    };
  }, [debouncedQuery]);

  // Group by category for rendering
  const groupedResults = results.reduce<Record<string, SearchResult[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  // Handle Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        const item = results[selectedIndex];
        handleSelect(item);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleSelect = (item: SearchResult) => {
    setIsOpen(false);
    router.push(item.href);
    // Optional: reset query atau biarkan saja
    // setQuery("");
  };

  return (
    <div className="relative w-64 md:w-80" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            if (!next) {
              setResults([]);
              setSettledQuery(null);
            }
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Cari pesanan, produk, pelanggan..."
          className="w-full rounded-xl border border-slate-200 bg-slate-100 py-2 pl-9 pr-8 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#FF6B1A] focus:bg-white focus:ring-2 focus:ring-orange-500/15 transition-all"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-[#FF6B1A]" />
          </div>
        )}
      </div>

      {isOpen && query && (
        <div className="absolute left-0 top-full mt-2 w-[calc(100vw-2rem)] md:w-[400px] max-h-[70vh] overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-xl z-50">
          {!isLoading && results.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-500">
              Tidak ada hasil untuk &quot;{query}&quot;
            </div>
          ) : (
            <div className="py-2">
              {Object.entries(groupedResults).map(([category, items]) => {
                // Determine flat index ranges for items to support selection
                return (
                  <div key={category} className="mb-2 last:mb-0">
                    <div className="bg-gray-50 px-3 py-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      {category}
                    </div>
                    {items.map((item) => {
                      const globalIndex = results.indexOf(item);
                      const isSelected = globalIndex === selectedIndex;
                      return (
                        <div
                          key={item.id}
                          className={`cursor-pointer px-4 py-2 transition-colors ${
                            isSelected ? "bg-orange-50" : "hover:bg-gray-50"
                          }`}
                          onClick={() => handleSelect(item)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-gray-800 line-clamp-1">
                              {item.title}
                            </span>
                            {item.subtitle && (
                              <span className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                                {item.subtitle}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
