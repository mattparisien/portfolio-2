"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY!;
const LIMIT = 24;

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
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [loading, setLoading] = useState(true);
  const debouncedQuery = useDebounce(query, 400);
  const abortRef = useRef<AbortController | null>(null);

  const fetchGifs = useCallback(async (q: string) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const endpoint = q.trim()
        ? `https://api.giphy.com/v1/gifs/search?api_key=${API_KEY}&q=${encodeURIComponent(q)}&limit=${LIMIT}&rating=r`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${API_KEY}&limit=${LIMIT}&rating=r`;
      const res = await fetch(endpoint, { signal: ctrl.signal });
      const json = await res.json();
      setGifs(json.data ?? []);
    } catch (e) {
      if ((e as Error).name !== "AbortError") console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGifs(debouncedQuery);
  }, [debouncedQuery, fetchGifs]);

  return (
    <div className="flex flex-col gap-2">
      {/* Search bar */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GIFs…"
          autoFocus
          className="w-full px-3 py-2 pr-8 text-sm rounded-xl border border-gray-200 bg-white outline-none focus:border-gray-400 transition-colors"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* GIF grid */}
      <div className="overflow-y-auto" style={{ maxHeight: 380 }}>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
      >
        {loading
          ? Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg bg-gray-100 animate-pulse"
                style={{ aspectRatio: "1" }}
              />
            ))
          : gifs.map((gif) => {
              const thumb = gif.images.fixed_height_small;
              return (
                <button
                  key={gif.id}
                  title={gif.title}
                  onClick={() => onSelect(gif.id, gif.images.original.url)}
                  className="rounded-lg overflow-hidden hover:opacity-80 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-black"
                  style={{ aspectRatio: `${thumb.width}/${thumb.height}` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumb.url}
                    alt={gif.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </button>
              );
            })}
        {!loading && gifs.length === 0 && (
          <p className="col-span-3 text-center text-xs text-gray-400 py-6">No GIFs found</p>
        )}
      </div>
      </div>

      {/* Brand */}
      <p className="text-center text-[10px] text-gray-300 mt-1 select-none">Powered by GIPHY</p>
    </div>
  );
}
