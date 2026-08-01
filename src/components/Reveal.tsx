"use client";

import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";

type Direction = "up" | "left" | "right" | "scale" | "fade";

export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
  from = "up",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
  from?: Direction;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    if (typeof IntersectionObserver === "undefined") {
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style: CSSProperties = { transitionDelay: `${delay}ms` };

  return (
    <Tag
      ref={ref as never}
      style={style}
      data-from={from}
      className={`reveal-on-scroll ${shown ? "reveal-visible" : ""} ${className}`}
    >
      {children}
    </Tag>
  );
}
