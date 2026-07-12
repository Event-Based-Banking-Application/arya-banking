"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Maximize2 } from "lucide-react";

function styleSvgInline(svg: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, "image/svg+xml");
    const parseError = doc.querySelector("parsererror");
    if (parseError) throw new Error(parseError.textContent || "SVG parse error");

    const svgElement = doc.querySelector("svg");
    if (!svgElement) throw new Error("No <svg> element found");

    svgElement.removeAttribute("width");
    svgElement.removeAttribute("height");
    svgElement.removeAttribute("style");
    svgElement.setAttribute("style", "max-width:100%;width:100%;height:auto");

    const serializer = new XMLSerializer();
    return serializer.serializeToString(svgElement);
  } catch {
    // Fallback: simple string replace if DOM parsing fails
    return svg
      .replace(/\s+style="[^"]*"/g, "")
      .replace(/\s+width="[^"]*"/g, "")
      .replace(/\s+height="[^"]*"/g, "")
      .replace("<svg", '<svg style="max-width:100%;width:100%;height:auto"');
  }
}

export default function MermaidBlock({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [rawSvg, setRawSvg] = useState<string | null>(null);
  const [modalSvg, setModalSvg] = useState<string | null>(null);

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

        setRawSvg(svg);

        const inlineSvg = styleSvgInline(svg);
        ref.current.innerHTML = inlineSvg;

        // Modal version - keep raw, CSS handles sizing
        setModalSvg(svg);
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
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
    };
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
        onClick={() => setOpen(true)}
        className="my-8 flex justify-center overflow-x-auto py-6 px-4 border border-hairline-strong bg-surface-soft min-h-[200px] cursor-pointer group relative"
      >
        <div ref={ref} className="w-full max-w-full pointer-events-none" />
        <div className="absolute top-2 right-2 text-muted opacity-0 group-hover:opacity-100 transition-opacity">
          <Maximize2 size={16} />
        </div>
      </div>

      {open && modalSvg && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            className="relative bg-surface-soft border border-hairline-strong flex items-center justify-center overflow-auto p-6"
            style={{ width: "85vw", height: "80vh" }}
          >
            <button
              onClick={close}
              className="absolute top-3 right-3 text-muted hover:text-ink transition-colors z-10"
              aria-label="Close"
            >
              <X size={24} />
            </button>
            <div
              className="mermaid-modal flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: modalSvg }}
            />
          </div>
        </div>
      )}
    </>
  );
}