"use client";

import { useEffect, useRef, useState } from "react";

export default function MermaidBlock({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const { default: mermaid } = await import("mermaid");
        if (cancelled) return;

        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            primaryColor: "#0066b1",
            primaryBorderColor: "#1c69d4",
            primaryTextColor: "#ffffff",
            lineColor: "#3c3c3c",
            secondaryColor: "#1a1a1a",
            tertiaryColor: "#0d0d0d",
            mainBkg: "#1a1a1a",
            nodeBorder: "#0066b1",
            clusterBkg: "#0d0d0d",
            clusterBorder: "#262626",
            edgeLabelBackground: "#1a1a1a",
            nodeTextColor: "#ffffff",
          },
        });

        const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        if (cancelled || !ref.current) return;

        ref.current.innerHTML = svg;
        const svgEl = ref.current.querySelector("svg");
        if (svgEl) {
          svgEl.removeAttribute("width");
          svgEl.removeAttribute("height");
          svgEl.style.maxWidth = "100%";
          svgEl.style.width = "100%";
          svgEl.style.height = "auto";
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to render diagram");
        }
      }
    }

    render();
    return () => { cancelled = true; };
  }, [chart]);

  if (error) {
    return (
      <div className="border border-m-red/50 bg-surface-soft p-4 text-sm text-muted my-4">
        <div className="text-xs text-m-red uppercase tracking-wider font-semibold mb-1">
          Diagram failed to render
        </div>
        <pre className="text-xs whitespace-pre-wrap font-mono text-body mt-2">
          {chart}
        </pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-8 flex justify-center overflow-x-auto py-6 px-4 border border-hairline-strong bg-surface-soft min-h-[200px]"
    >
      <div ref={ref} className="w-full max-w-full" />
    </div>
  );
}
