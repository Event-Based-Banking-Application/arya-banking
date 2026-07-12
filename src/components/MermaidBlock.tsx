"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Maximize2 } from "lucide-react";

function createStyledSvg(svgString: string, style: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, "text/html");
    const svgElement = doc.querySelector("svg");
    if (!svgElement) throw new Error("No <svg> element found");

    svgElement.removeAttribute("width");
    svgElement.removeAttribute("height");
    svgElement.removeAttribute("style");
    svgElement.setAttribute("style", style);

    return svgElement.outerHTML;
  } catch (e) {
    console.error("createStyledSvg error:", e);
    return svgString;
  }
}

function svgToBlobUrl(svgHtml: string): string {
  const blob = new Blob([svgHtml], { type: "image/svg+xml" });
  return URL.createObjectURL(blob);
}

export default function MermaidBlock({ chart }: { chart: string }) {
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [inlineBlobUrl, setInlineBlobUrl] = useState<string | null>(null);
  const [modalBlobUrl, setModalBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let inlineUrl: string | null = null;
    let modalUrl: string | null = null;

    async function render() {
      try {
        const { default: mermaid } = await import("mermaid");
        if (cancelled) return;

        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          themeVariables: {
            primaryColor: "#0066b1",
            primaryBorderColor: "#1c69d4",
            primaryTextColor: "#ffffff",
            lineColor: "#3c3c3c",
            secondaryColor: "#1a1a1a",
            tertiaryColor: "#0d0d0d",
            mainBkg: "#1a1a1a",
            nodeBorder: "#0066b1",
            nodeTextColor: "#ffffff",
            nodeFill: "#1a1a1a",
            clusterBkg: "#0d0d0d",
            clusterBorder: "#262626",
            edgeLabelBackground: "#1a1a1a",
            edgeLabelColor: "#ffffff",
            fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
            fontSize: "16px",
          },
        });

        const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        if (cancelled) return;

        const inlineStyled = createStyledSvg(svg, "max-width:100%;width:100%;height:auto");
        const modalStyled = createStyledSvg(svg, "max-width:85vw;max-height:80vh;width:auto;height:auto");

        inlineUrl = svgToBlobUrl(inlineStyled);
        modalUrl = svgToBlobUrl(modalStyled);

        if (!cancelled) {
          setInlineBlobUrl(inlineUrl);
          setModalBlobUrl(modalUrl);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to render diagram");
        }
      }
    }

    render();
    return () => {
      cancelled = true;
      if (inlineUrl) URL.revokeObjectURL(inlineUrl);
      if (modalUrl) URL.revokeObjectURL(modalUrl);
    };
  }, [chart]);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
    };
  }, [open]);

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
        {inlineBlobUrl && (
          <img
            src={inlineBlobUrl}
            alt="Mermaid diagram"
            className="w-full max-w-full h-auto"
          />
        )}
        <div className="absolute top-2 right-2 text-muted opacity-0 group-hover:opacity-100 transition-opacity">
          <Maximize2 size={16} />
        </div>
      </div>

      {open && modalBlobUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
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
            <img
              src={modalBlobUrl}
              alt="Mermaid diagram"
              className="max-w-[85vw] max-h-[80vh] w-auto h-auto"
            />
          </div>
        </div>
      )}
    </>
  );
}