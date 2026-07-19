"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocSection, DocPage, DocNode } from "@/lib/content";

function SidebarNode({
  node,
  activeSlug,
  depth = 0,
}: {
  node: DocNode;
  activeSlug: string;
  depth?: number;
}) {
  const isActive =
    (node.type === "page" && node.slug === activeSlug) ||
    (node.type === "section" &&
      (node.slug === activeSlug || activeSlug.startsWith(node.slug + "/")));

  const [expanded, setExpanded] = useState(isActive);

  useEffect(() => {
    if (isActive) setExpanded(true);
  }, [isActive]);

  if (node.type === "page") {
    return (
      <Link
        href={`/docs/${node.slug}/`}
        className={cn(
          "sidebar-link",
          node.slug === activeSlug && "sidebar-link--active"
        )}
        style={{ paddingLeft: `${0.75 + depth * 0.75}rem` }}
      >
        {node.title}
      </Link>
    );
  }

  const hasChildren = node.children.length > 0;
  const sectionHref = `/docs/${node.slug}/`;

  return (
    <div>
      <div
        className="sidebar-section-title"
        style={{ paddingLeft: `${0.75 + depth * 0.75}rem` }}
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
      >
        <ChevronDown
          size={12}
          className={cn(
            "transition-transform shrink-0",
            expanded ? "rotate-0" : "-rotate-90"
          )}
        />
        <Link
          href={sectionHref}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "flex-1 text-inherit no-underline",
            isActive && "text-m-blue-light"
          )}
        >
          {node.title}
        </Link>
      </div>
      {hasChildren && expanded && (
        <div>
          {node.children
            .sort((a, b) => a.weight - b.weight)
            .map((child) => (
              <SidebarNode
                key={child.slug}
                node={child}
                activeSlug={activeSlug}
                depth={depth + 1}
              />
            ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ tree }: { tree: DocSection }) {
  const pathname = usePathname();
  const activeSlug = pathname
    .replace(/^\/docs\//, "")
    .replace(/\/$/, "");

  return (
    <aside className="hidden lg:block fixed top-16 left-0 w-64 h-[calc(100vh-4rem)] overflow-y-auto border-r border-hairline/50 z-40 bg-canvas">
      <div className="py-4">
        <div className="px-3 pb-3 mb-2 border-b border-hairline/50">
          <Link
            href="/docs/"
            className={cn(
              "sidebar-link",
              pathname === "/docs/" && "sidebar-link--active"
            )}
          >
            Overview
          </Link>
        </div>
        {tree.children
          .sort((a, b) => a.weight - b.weight)
          .map((child) => (
            <SidebarNode
              key={child.slug}
              node={child}
              activeSlug={activeSlug}
            />
          ))}
      </div>
    </aside>
  );
}
