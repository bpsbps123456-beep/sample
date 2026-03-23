export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* Nav skeleton */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/97">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="animate-pulse space-y-1.5">
            <div className="h-2.5 w-20 rounded-full bg-slate-200" />
            <div className="h-4 w-48 rounded-full bg-slate-200" />
          </div>
          <div className="animate-pulse flex gap-2">
            <div className="h-8 w-20 rounded-xl bg-slate-200" />
            <div className="h-8 w-16 rounded-xl bg-slate-200" />
          </div>
        </div>
      </div>

      {/* Dashboard skeleton */}
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div className="animate-pulse h-48 rounded-2xl bg-slate-200" />
            <div className="animate-pulse h-64 rounded-2xl bg-slate-200" />
          </div>
          <div className="space-y-4">
            <div className="animate-pulse h-40 rounded-2xl bg-slate-200" />
            <div className="animate-pulse h-40 rounded-2xl bg-slate-200" />
            <div className="animate-pulse h-56 rounded-2xl bg-slate-200" />
          </div>
        </div>
      </div>
    </main>
  );
}
