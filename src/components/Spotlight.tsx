"use client";

import { useRef, type ReactNode, type MouseEvent, type ElementType } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  [key: string]: unknown;
};

export function Spotlight({
  className = "",
  as: Tag = "div",
  ...rest
}: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const onMove = (e: MouseEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <Tag
      ref={ref}
      onMouseMove={onMove}
      className={`spotlight ${className}`}
      {...rest}
    />
  );
}
