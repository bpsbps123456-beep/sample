export default function WorksheetsLoading() {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* Nav skeleton */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/97">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="animate-pulse space-y-1.5">
            <div className="h-2.5 w-16 rounded-full bg-slate-200" />
            <div className="h-4 w-28 rounded-full bg-slate-200" />
          </div>
          <div className="animate-pulse h-9 w-32 rounded-xl bg-slate-200" />
        </div>
      </div>

      {/* List skeleton */}
      <div className="mx-auto max-w-7xl space-y-3 px-6 py-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="animate-pulse h-32 rounded-2xl bg-slate-200" />
        ))}
      </div>
    </main>
  );
}
