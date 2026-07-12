import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-hairline/50">
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-xs text-muted uppercase tracking-[1px]">
          &copy; {new Date().getFullYear()} Arya Banking Docs
        </p>

        <Link
          href="https://github.com/Event-Based-Banking-Application"
          target="_blank"
          className="text-xs text-muted hover:text-ink transition-colors uppercase tracking-[1px]"
        >
          GitHub
        </Link>
      </div>
    </footer>
  );
}
