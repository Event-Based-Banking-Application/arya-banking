import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <div className="font-display text-[10px] uppercase tracking-[0.3em] text-primary mb-4">
          {"// 404.log"}
        </div>
        <h1 className="font-display text-4xl font-extrabold uppercase tracking-tighter leading-[0.95] mb-6">
          PAGE <span className="text-primary">NOT</span> FOUND
          <span className="text-primary animate-caret">_</span>
        </h1>
        <p className="text-muted-foreground text-sm md:text-base mb-8 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been
          moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-display text-[10px] uppercase tracking-widest border border-primary text-primary px-6 py-3 hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          Go Home →
        </Link>
      </div>
    </div>
  );
}
