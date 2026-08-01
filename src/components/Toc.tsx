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
    <aside className="hidden xl:block fixed top-16 right-0 w-56 h-[calc(100vh-4rem)] overflow-y-auto pl-6 z-40 bg-background/95 backdrop-blur-sm">
      <div className="py-4">
        <div className="font-display text-[9px] uppercase tracking-[0.25em] text-muted-foreground mb-3">
          // On_This_Page
        </div>
        <nav>
          {items.map((item, i) => (
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
              <span className="text-primary/50 text-[9px] mr-1">
                {String(i + 1).padStart(2, "0")}
              </span>
              {item.text}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
}
