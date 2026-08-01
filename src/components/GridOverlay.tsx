export function GridOverlay() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 pointer-events-none grid grid-cols-4 md:grid-cols-12 gap-0 px-4 md:px-8 z-0"
    >
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className={`border-r border-border h-full ${i === 0 ? "border-l" : ""} ${i > 0 && i < 11 ? "hidden md:block" : ""}`}
        />
      ))}
    </div>
  );
}
