export default function SessionLoading() {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* Nav skeleton */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/97">
        <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6">
          <div className="animate-pulse space-y-1.5">
            <div className="h-2.5 w-16 rounded-full bg-slate-200" />
            <div className="h-4 w-40 rounded-full bg-slate-200" />
          </div>
        </div>
        <div className="h-0.5 bg-slate-100" />
      </div>

      {/* Content skeleton */}
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="animate-pulse grid gap-5 lg:grid-cols-[1fr_280px]">
          <div className="space-y-3">
            <div className="h-48 rounded-xl bg-slate-200" />
            <div className="h-40 rounded-xl bg-slate-200" />
          </div>
          <div className="space-y-3">
            <div className="h-64 rounded-xl bg-slate-200" />
          </div>
        </div>
      </div>
    </main>
  );
}
