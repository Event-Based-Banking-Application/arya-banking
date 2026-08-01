"use client";

import { useState } from "react";

interface Tab {
  name: string;
  content: string;
}

export default function Tabs({ tabs: raw }: { tabs: string }) {
  const tabs: Tab[] = JSON.parse(decodeURIComponent(raw));
  const [active, setActive] = useState(0);

  if (tabs.length === 0) return null;

  return (
    <div className="my-6 border border-border overflow-hidden">
      <div className="flex border-b border-border bg-card overflow-x-auto">
        {tabs.map((tab, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`px-4 py-2 font-display text-[11px] uppercase tracking-wider whitespace-nowrap transition-colors ${
              i === active
                ? "text-primary border-b-2 border-primary bg-background"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>
      <div className="p-4 bg-background">
        <div dangerouslySetInnerHTML={{ __html: tabs[active].content }} />
      </div>
    </div>
  );
}
