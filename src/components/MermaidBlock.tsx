"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Maximize2 } from "lucide-react";

export default function MermaidBlock({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [svgHtml, setSvgHtml] = useState<string | null>(null);

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

        const scaled = svg
          .replace(/width="[^"]*"/, "")
          .replace(/height="[^"]*"/, "")
          .replace("<svg ", '<svg style="max-width:100%;width:100%;height:auto" ');

        ref.current.innerHTML = scaled;
        setSvgHtml(scaled);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to render diagram");
        }
      }
    }

    render();
    return () => { cancelled = true; };
  }, [chart]);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, close]);

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
    <>
      <div
        ref={containerRef}
        onClick={() => setOpen(true)}
        className="my-8 flex justify-center overflow-x-auto py-6 px-4 border border-hairline-strong bg-surface-soft min-h-[200px] cursor-pointer group relative"
      >
        <div ref={ref} className="w-full max-w-full pointer-events-none" />
        <div className="absolute top-2 right-2 text-muted opacity-0 group-hover:opacity-100 transition-opacity">
          <Maximize2 size={16} />
        </div>
      </div>

      {open && svgHtml && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 md:p-10"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="relative max-w-[95vw] max-h-[90vh] w-full h-full flex items-center justify-center">
            <button
              onClick={close}
              className="absolute -top-10 right-0 text-muted hover:text-ink transition-colors z-10"
              aria-label="Close"
            >
              <X size={24} />
            </button>
            <div
              className="w-full h-full flex items-center justify-center overflow-auto"
              dangerouslySetInnerHTML={{
                __html: svgHtml.replace(
                  "<svg ",
                  '<svg style="max-width:100%;max-height:100%;width:auto;height:auto" '
                ),
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
