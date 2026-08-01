"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { useState } from "react";

const LINKS = [
  { href: "/", label: "Index", n: "01" },
  { href: "/docs/", label: "Docs", n: "02" },
];

export default function Navbar({ onSearch }: { onSearch?: () => void }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 px-4 md:px-8 py-4 flex justify-between items-center border-b border-border bg-background/80 backdrop-blur-md">
      <Link href="/" className="font-display font-extrabold text-lg tracking-tighter">
        ARYA<span className="text-primary">.BANKING</span>
      </Link>

      <div className="hidden sm:flex gap-6 md:gap-8 text-[10px] font-display uppercase tracking-widest">
        {LINKS.map((l) => {
          const isActive = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`hover:text-primary transition-colors ${isActive ? "text-primary" : ""}`}
            >
              [ {l.n} ] {l.label}
            </Link>
          );
        })}
        <button
          onClick={onSearch}
          className="flex items-center gap-2 border border-border px-2.5 py-1 hover:border-primary hover:text-primary transition-colors"
        >
          <Search size={11} />
          Search
          <kbd className="border border-border px-1 text-[9px] opacity-70">Ctrl K</kbd>
        </button>
      </div>

      <button
        onClick={() => setMenuOpen((prev) => !prev)}
        className="sm:hidden font-display text-xs uppercase tracking-widest hover:text-primary transition-colors"
        aria-label="Toggle menu"
      >
        {menuOpen ? "[ CLOSE ]" : "[ MENU ]"}
      </button>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 top-[57px] bg-black/40 sm:hidden"
            onClick={() => setMenuOpen(false)}
          />
          <div className="fixed right-0 top-[57px] w-64 border-l border-border bg-background p-6 sm:hidden flex flex-col gap-4 shadow-xl">
            {LINKS.map((l) => {
              const isActive = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className={`font-display text-sm uppercase tracking-widest hover:text-primary transition-colors ${
                    isActive ? "text-primary" : ""
                  }`}
                >
                  [ {l.n} ] {l.label}
                </Link>
              );
            })}
            <button
              onClick={() => {
                setMenuOpen(false);
                onSearch?.();
              }}
              className="font-display text-sm uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors text-left"
            >
              [ S ] Search
            </button>
          </div>
        </>
      )}
    </nav>
  );
}
