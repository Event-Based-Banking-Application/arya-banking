"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { TocItem } from "@/lib/content";

export default function Toc({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px" }
    );

    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <aside className="hidden xl:block fixed top-16 right-0 w-56 h-[calc(100vh-4rem)] overflow-y-auto pl-6 z-40 bg-canvas">
      <div className="py-4">
        <div className="text-[0.65rem] uppercase tracking-[0.12em] text-muted font-semibold mb-3">
          On This Page
        </div>
        <nav>
          {items.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={cn(
                "toc-link",
                item.level === 3 && "toc-link--h3",
                activeId === item.id && "toc-link--active"
              )}
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById(item.id);
                if (el) {
                  el.scrollIntoView({ behavior: "smooth" });
                }
              }}
            >
              {item.text}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
}
