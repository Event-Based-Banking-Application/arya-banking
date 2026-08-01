"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Maximize2, Play, Pause, SkipBack, SkipForward, RotateCcw } from "lucide-react";

const THEME = "dark" as const;

const SEQ_STEP_MS = 1000;

function getConfig() {
  return {
    startOnLoad: false,
    theme: THEME,
    themeVariables: {
      primaryColor: "#23283a",
      primaryBorderColor: "#8aa1cd",
      primaryTextColor: "#f8fafc",
      lineColor: "#8aa1cd",
      secondaryColor: "#23283a",
      tertiaryColor: "#1a1f2c",
      mainBkg: "#23283a",
      nodeBorder: "#8aa1cd",
      clusterBkg: "#1a1f2c",
      clusterBorder: "#3a4a5e",
      edgeLabelBackground: "#23283a",
      nodeTextColor: "#f8fafc",
    },
  };
}

function cleanInlineSvg(svg: SVGSVGElement) {
  svg.removeAttribute("width");
  svg.removeAttribute("height");
  svg.removeAttribute("style");
  svg.setAttribute("style", "max-width:100%;width:100%;height:auto");
}

function prepareModalSvg(svg: SVGSVGElement) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.removeAttribute("width");
  clone.removeAttribute("height");
  clone.removeAttribute("style");
  clone.setAttribute("preserveAspectRatio", "xMidYMid meet");
  clone.setAttribute("style", "max-width:100%;max-height:100%;width:auto;height:auto");
  return clone;
}

function isSequenceChart(chart: string) {
  return /^\s*sequenceDiagram/i.test(chart);
}

export default function MermaidBlock({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [svgElement, setSvgElement] = useState<SVGSVGElement | null>(null);

  const isSeq = isSequenceChart(chart);
  const [seqTotal, setSeqTotal] = useState(0);
  const [seqIdx, setSeqIdx] = useState(0);
  const [seqPlaying, setSeqPlaying] = useState(false);
  const seqSvgRef = useRef<SVGSVGElement | null>(null);
  const seqIdxRef = useRef(0);
  const seqTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const seqStepTo = useCallback(
    (n: number) => {
      const svg = seqSvgRef.current;
      if (!svg || seqTotal === 0) return;
      const clamped = Math.max(0, Math.min(n, seqTotal));
      const anchors = svg.querySelectorAll<SVGElement>(
        'line[data-et="message"], path[data-et="message"], g[data-et="note"]',
      );
      svg.classList.toggle("seq-anim", clamped < seqTotal);
      anchors.forEach((a, i) => {
        const on = i < clamped;
        a.classList.toggle("seq-step-on", on);
        if (a.tagName !== "g") {
          const t = a.previousElementSibling;
          if (t && t.classList.contains("messageText")) {
            t.classList.toggle("seq-step-on", on);
          }
        }
      });
    },
    [seqTotal],
  );

  const stopPlay = useCallback(() => {
    setSeqPlaying(false);
    if (seqTimerRef.current) {
      clearInterval(seqTimerRef.current);
      seqTimerRef.current = null;
    }
  }, []);

  const seqTick = useCallback(() => {
    const next = seqIdxRef.current + 1;
    if (next > seqTotal) {
      stopPlay();
      return;
    }
    seqStepTo(next);
    seqIdxRef.current = next;
    setSeqIdx(next);
    if (next >= seqTotal) stopPlay();
  }, [seqTotal, seqStepTo, stopPlay]);

  const togglePlay = useCallback(() => {
    if (seqPlaying) {
      stopPlay();
      return;
    }
    if (seqIdxRef.current >= seqTotal) {
      seqIdxRef.current = 0;
      setSeqIdx(0);
      seqStepTo(0);
    }
    setSeqPlaying(true);
    seqTimerRef.current = setInterval(seqTick, SEQ_STEP_MS);
    seqTick();
  }, [seqPlaying, seqTotal, seqStepTo, seqTick, stopPlay]);

  const stepPrev = useCallback(() => {
    stopPlay();
    const n = Math.max(0, seqIdxRef.current - 1);
    seqStepTo(n);
    seqIdxRef.current = n;
    setSeqIdx(n);
  }, [seqStepTo, stopPlay]);

  const stepNext = useCallback(() => {
    stopPlay();
    const n = Math.min(seqTotal, seqIdxRef.current + 1);
    seqStepTo(n);
    seqIdxRef.current = n;
    setSeqIdx(n);
  }, [seqTotal, seqStepTo, stopPlay]);

  const reset = useCallback(() => {
    stopPlay();
    seqStepTo(0);
    seqIdxRef.current = 0;
    setSeqIdx(0);
  }, [seqStepTo, stopPlay]);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const { default: mermaid } = await import("mermaid");
        if (cancelled) return;
        mermaid.initialize(getConfig());
        if (!containerRef.current) return;
        containerRef.current.textContent = chart;
        await mermaid.run({ nodes: [containerRef.current] });
        if (cancelled) return;
        const svg = containerRef.current.querySelector("svg");
        if (!svg) throw new Error("No SVG rendered");
        cleanInlineSvg(svg);
        setSvgElement(prepareModalSvg(svg));

        if (isSeq) {
          stopPlay();
          seqSvgRef.current = svg;
          const total = svg.querySelectorAll(
            'line[data-et="message"], path[data-et="message"], g[data-et="note"]',
          ).length;
          setSeqTotal(total);
          seqIdxRef.current = total;
          setSeqIdx(total);
          svg.classList.remove("seq-anim");
        } else {
          seqSvgRef.current = null;
          setSeqTotal(0);
          setSeqIdx(0);
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
      stopPlay();
    };
  }, [chart, isSeq, stopPlay]);

  useEffect(() => {
    if (!open || !svgElement || !modalRef.current) return;
    modalRef.current.innerHTML = "";
    modalRef.current.appendChild(svgElement.cloneNode(true));
  }, [open, svgElement]);

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
      <div className="border border-destructive/50 bg-card p-4 text-sm text-muted-foreground my-4">
        <div className="text-xs text-destructive uppercase tracking-wider font-semibold mb-1">
          Diagram failed to render
        </div>
        <pre className="text-xs whitespace-pre-wrap font-mono text-foreground mt-2">{chart}</pre>
      </div>
    );
  }

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="my-8 flex justify-center overflow-x-auto py-6 px-4 border border-border bg-card min-h-[200px] cursor-pointer group relative"
      >
        <div ref={containerRef} className="mermaid w-full max-w-full pointer-events-none" />
        <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
          {isSeq && (
            <div
              className="flex items-center gap-1 bg-background/80 backdrop-blur-sm border border-border rounded px-1 py-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={reset}
                className="seq-ctl text-muted-foreground hover:text-primary transition-colors"
                aria-label="Restart"
                title="Restart"
              >
                <RotateCcw size={13} />
              </button>
              <button
                onClick={stepPrev}
                className="seq-ctl text-muted-foreground hover:text-primary transition-colors disabled:opacity-30 disabled:hover:text-muted-foreground"
                aria-label="Previous step"
                title="Previous step"
                disabled={seqIdx === 0}
              >
                <SkipBack size={13} />
              </button>
              <button
                onClick={togglePlay}
                className="seq-ctl text-primary hover:text-primary/80 transition-colors disabled:opacity-30 disabled:hover:text-primary"
                aria-label={seqPlaying ? "Pause" : "Play"}
                title={seqPlaying ? "Pause" : "Play"}
                disabled={seqTotal === 0}
              >
                {seqPlaying ? <Pause size={13} /> : <Play size={13} />}
              </button>
              <button
                onClick={stepNext}
                className="seq-ctl text-muted-foreground hover:text-primary transition-colors disabled:opacity-30 disabled:hover:text-muted-foreground"
                aria-label="Next step"
                title="Next step"
                disabled={seqIdx >= seqTotal}
              >
                <SkipForward size={13} />
              </button>
              <span className="seq-counter font-mono text-[10px] text-muted-foreground px-1">
                {seqIdx}/{seqTotal}
              </span>
            </div>
          )}
          <div className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            <Maximize2 size={16} />
          </div>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            className="relative bg-card border border-border flex items-center justify-center overflow-auto p-6"
            style={{ width: "85vw", height: "80vh" }}
          >
            <button
              onClick={close}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors z-10"
              aria-label="Close"
            >
              <X size={24} />
            </button>
            <div ref={modalRef} className="flex items-center justify-center w-full h-full" />
          </div>
        </div>
      )}
    </>
  );
}
