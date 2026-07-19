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
    <div className="my-6 border border-hairline-strong rounded-md overflow-hidden">
      <div className="flex border-b border-hairline-strong bg-surface-soft overflow-x-auto">
        {tabs.map((tab, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              i === active
                ? "text-ink border-b-2 border-m-blue bg-surface"
                : "text-muted hover:text-ink hover:bg-surface/50"
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>
      <div className="p-4 bg-surface">
        <div dangerouslySetInnerHTML={{ __html: tabs[active].content }} />
      </div>
    </div>
  );
}
