"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Search, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const links = [
  { href: "/", label: "Home" },
  { href: "/docs/", label: "Docs" },
];

export default function Navbar({ onSearch }: { onSearch?: () => void }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? "bg-canvas/90 backdrop-blur-xl border-b border-hairline/50"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-bold text-ink tracking-widest uppercase"
        >
          <BookOpen size={18} className="text-m-blue-light" />
          Arya Banking
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-xs uppercase tracking-[1.5px] transition-colors ${
                pathname === link.href
                  ? "text-ink"
                  : "text-muted hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={onSearch}
            className="flex items-center gap-2 text-xs text-muted hover:text-ink transition-colors border border-hairline px-3 py-1.5"
          >
            <Search size={14} />
            <span className="uppercase tracking-[1px]">Search</span>
            <kbd className="text-[10px] text-muted border border-hairline px-1 ml-1">
              Ctrl+K
            </kbd>
          </button>
        </div>

        <div className="md:hidden flex items-center gap-3">
          <button
            onClick={onSearch}
            className="text-muted hover:text-ink transition-colors"
            aria-label="Search"
          >
            <Search size={18} />
          </button>
          <button
            className="text-muted hover:text-ink transition-colors"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-canvas/95 backdrop-blur-xl border-t border-hairline/50 overflow-hidden"
          >
            <div className="px-6 py-4 flex flex-col gap-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`px-4 py-3 text-xs uppercase tracking-[1.5px] transition-colors ${
                    pathname === link.href
                      ? "text-ink bg-surface-card"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
