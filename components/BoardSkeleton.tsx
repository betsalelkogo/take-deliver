export default function BoardSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <span className="sr-only">טוען חבילות…</span>
      {[0, 1].map((section) => (
        <section
          key={section}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
        >
          <div className="flex items-center gap-2 border-b border-slate-200 bg-brand-50 px-3 py-3 sm:px-4">
            <div className="h-5 w-28 rounded-md bg-brand-200/80 motion-safe:animate-pulse" />
            <div className="h-5 w-14 rounded-full bg-white motion-safe:animate-pulse" />
          </div>
          <div className="space-y-2 px-3 py-3 sm:px-4">
            <div className="h-4 w-24 rounded bg-slate-200 motion-safe:animate-pulse" />
            <div className="h-[4.5rem] rounded-lg bg-slate-100 motion-safe:animate-pulse" />
            <div className="h-[4.5rem] rounded-lg bg-slate-100 motion-safe:animate-pulse" />
          </div>
        </section>
      ))}
    </div>
  );
}
