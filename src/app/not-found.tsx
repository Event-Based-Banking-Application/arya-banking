import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <div className="section-label">404</div>
        <h1 className="text-4xl font-bold text-ink uppercase tracking-tight mb-4 mt-2">
          Page Not Found
        </h1>
        <p className="text-body mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been
          moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 border border-ink text-ink px-6 py-3 text-sm font-bold uppercase tracking-wider hover:bg-ink hover:text-canvas transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
