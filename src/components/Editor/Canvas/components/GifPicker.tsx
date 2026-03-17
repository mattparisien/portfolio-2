"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY!;
const LIMIT = 24;

type Tab = "gifs" | "stickers";

interface GiphyImage {
  url: string;
  width: string;
  height: string;
}

interface GiphyGif {
  id: string;
  title: string;
  images: {
    fixed_height_small: GiphyImage;
    fixed_width: GiphyImage;
    original: GiphyImage;
  };
}

interface GifPickerProps {
  onSelect: (id: string, url: string) => void;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function GifPicker({ onSelect }: GifPickerProps) {
  const [tab, setTab] = useState<Tab>("gifs");
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const debouncedQuery = useDebounce(query, 400);
  const abortRef = useRef<AbortController | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const fetchGifs = useCallback(async (q: string, t: Tab) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(false);
    try {
      const type = t === "stickers" ? "stickers" : "gifs";
      const endpoint = q.trim()
        ? `https://api.giphy.com/v1/${type}/search?api_key=${API_KEY}&q=${encodeURIComponent(q)}&limit=${LIMIT}&rating=g`
        : `https://api.giphy.com/v1/${type}/trending?api_key=${API_KEY}&limit=${LIMIT}&rating=g`;
      const res = await fetch(endpoint, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setGifs(json.data ?? []);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        console.error(e);
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGifs(debouncedQuery, tab);
  }, [debouncedQuery, tab, fetchGifs]);

  const switchTab = (t: Tab) => {
    if (t === tab) return;
    setTab(t);
    setQuery("");
  };

  const placeholder = tab === "stickers" ? "Search Stickers…" : "Search GIFs…";

  return (
    <div className="flex flex-col gap-2">
      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-gray-100">
        {(["gifs", "stickers"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            style={{
              background: tab === t ? "#fff" : "transparent",
              color: tab === t ? "#000" : "#888",
              boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}
          >
            {t === "gifs" ? "GIFs" : "Stickers"}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="relative">
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-8 text-sm rounded-xl border border-gray-200 bg-white outline-none focus:border-gray-400 transition-colors"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {/* Grid — CSS masonry via columns */}
      <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
        {loading ? (
          <div style={{ columns: 3, columnGap: 8 }}>
            {[80, 110, 60, 100, 75, 90, 120, 65, 95].map((h, i) => (
              <div
                key={i}
                className="rounded-lg bg-gray-100 animate-pulse mb-2 break-inside-avoid"
                style={{ height: h, display: "block" }}
              />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-gray-500">Couldn&apos;t load GIFs. Check your connection.</p>
            <button
              onClick={() => fetchGifs(debouncedQuery, tab)}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : gifs.length === 0 ? (
          <p className="text-center text-sm text-gray-500 py-8">
            {debouncedQuery.trim()
              ? `No GIFs found for \u201c${debouncedQuery}\u201d. Try a different search.`
              : tab === "stickers" ? "No trending stickers available." : "No trending GIFs available."}
          </p>
        ) : (
          <div style={{ columns: 3, columnGap: 8 }}>
            {gifs.map((gif) => {
              const thumb = gif.images.fixed_height_small;
              return (
                <button
                  key={gif.id}
                  title={gif.title}
                  onClick={() => onSelect(gif.id, gif.images.original.url)}
                  className="rounded-lg overflow-hidden hover:opacity-80 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-black mb-2 break-inside-avoid w-full cursor-pointer"
                  style={{ display: "block" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumb.url}
                    alt={gif.title}
                    width={Number(thumb.width)}
                    height={Number(thumb.height)}
                    loading="lazy"
                    className="w-full h-auto block"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Brand */}
      <p className="text-center text-sm text-gray-500 mt-1 select-none">Powered by GIPHY</p>
    </div>
  );
}
