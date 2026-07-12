"use client";

import { useState } from "react";
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

  return (
    <>
      <ScrollProgress />
      <Navbar onSearch={() => setSearchOpen(true)} />
      <div className="m-stripe" />
      <main className="relative z-10 min-h-screen">{children}</main>
      <Footer />
      <SearchDialog
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        pages={searchIndex}
      />
    </>
  );
}
