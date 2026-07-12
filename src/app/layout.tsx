import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Shell from "@/components/Shell";
import { getSearchIndex } from "@/lib/content";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s | Arya Banking Docs",
    default: "Arya Banking Docs",
  },
  description:
    "Documentation for the Arya Banking event-driven microservices platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const searchIndex = getSearchIndex();

  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Shell searchIndex={searchIndex}>{children}</Shell>
      </body>
    </html>
  );
}
