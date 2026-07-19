"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ArrowRight } from "lucide-react";
import type { SearchEntry } from "@/lib/content";

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part)
      ? <mark key={i} className="bg-m-blue-light/30 text-ink rounded-none">{part}</mark>
      : part
  );
}

export default function SearchDialog({
  open,
  onClose,
  pages,
}: {
  open: boolean;
  onClose: () => void;
  pages: SearchEntry[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  const results = query
    ? pages.filter((p) => {
        const q = query.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q)
        );
      })
    : [];

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && results[selected]) {
        e.preventDefault();
        router.push(`/docs/${results[selected].slug}/`);
        onClose();
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [results, selected, onClose, router]
  );

  useEffect(() => {
    const el = listRef.current?.children[selected] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  if (!open) return null;

  return (
    <div
      className="search-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={handleKeyDown}
    >
      <div className="search-dialog">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-hairline">
          <Search size={16} className="text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search documentation..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search-input border-none p-0 text-sm"
          />
          <kbd className="text-[10px] text-muted border border-hairline px-1.5 py-0.5 hidden sm:inline">
            ESC
          </kbd>
        </div>

        {query && (
          <div ref={listRef} className="search-results">
            {results.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted">
                No results found for &quot;{query}&quot;
              </div>
            ) : (
              results.map((page, idx) => (
                <Link
                  key={page.slug}
                  href={`/docs/${page.slug}/`}
                  onClick={onClose}
                  className={`search-result-item ${idx === selected ? "search-result-item--active" : ""}`}
                >
                  <div className="search-result-title">
                    {highlightMatch(page.title, query)}
                  </div>
                  {page.description && (
                    <div className="search-result-desc">
                      {highlightMatch(page.description, query)}
                    </div>
                  )}
                  <div className="flex items-center gap-1 mt-1 text-[10px] uppercase tracking-wider text-m-blue-light font-semibold">
                    <ArrowRight size={10} /> View page
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
