"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollProgress from "@/components/ScrollProgress";
import MStripe from "@/components/MStripe";
import SearchDialog from "@/components/SearchDialog";
import type { SearchEntry } from "@/lib/content";

export default function Shell({
  children,
  searchIndex,
}: {
  children: React.ReactNode;
  searchIndex: SearchEntry[];
}) {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape" && searchOpen) {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [searchOpen]);

  return (
    <>
      <ScrollProgress />
      <Navbar onSearch={() => setSearchOpen(true)} />
      <div className="m-stripe" />
      <main className="relative z-10 min-h-screen pt-16">{children}</main>
      <Footer />
      <SearchDialog
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        pages={searchIndex}
      />
    </>
  );
}
