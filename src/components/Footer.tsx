import Link from "next/link";

export default function Footer() {
  return (
    <footer className="px-4 md:px-8 py-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-3 text-[9px] font-display text-muted-foreground opacity-60 uppercase tracking-[0.2em]">
      <span>© {new Date().getFullYear()} Arya Banking Docs</span>
      <Link
        href="https://github.com/Event-Based-Banking-Application"
        target="_blank"
        rel="noreferrer"
        className="hover:text-primary transition-colors"
      >
        GitHub
      </Link>
      <span>Spring · Kafka · Event_Driven</span>
    </footer>
  );
}
