"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchDoc {
  slug: string;
  title: string;
  description: string;
  content: string;
}

export default function SearchDialog({
  open,
  onClose,
  pages,
}: {
  open: boolean;
  onClose: () => void;
  pages: SearchDoc[];
}) {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setActiveIdx(0);
    }
  }, [open]);

  const results = query.trim()
    ? pages
        .filter(
          (p) =>
            p.title.toLowerCase().includes(query.toLowerCase()) ||
            p.description.toLowerCase().includes(query.toLowerCase()) ||
            p.content.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 10)
    : [];

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && results[activeIdx]) {
        window.location.href = `/docs/${results[activeIdx].slug}/`;
        onClose();
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [results, activeIdx, onClose]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (open) onClose();
        else onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="search-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="search-dialog">
        <div className="flex items-center border-b border-hairline">
          <Search size={16} className="ml-4 text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search documentation..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            onKeyDown={handleKeyDown}
            className="search-input"
          />
          <button
            onClick={onClose}
            className="mr-3 text-muted hover:text-ink transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="search-results">
          {query.trim() && results.length === 0 && (
            <p className="text-center text-muted text-sm py-8">
              No results found for &ldquo;{query}&rdquo;
            </p>
          )}
          {results.map((page, idx) => (
            <Link
              key={page.slug}
              href={`/docs/${page.slug}/`}
              onClick={onClose}
              className={cn(
                "search-result-item",
                idx === activeIdx && "search-result-item--active"
              )}
              onMouseEnter={() => setActiveIdx(idx)}
            >
              <div className="search-result-title">{page.title}</div>
              {page.description && (
                <div className="search-result-desc">{page.description}</div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
