"use client";

import { useClassroomStore } from "@/lib/store/classroom-store";

export function ProjectionVoteDisplay() {
  const voteSummary = useClassroomStore((state) => state.voteSummary);

  if (!voteSummary.question) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/6 p-10 text-center text-slate-400">
        진행 중인 투표가 없습니다.
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/6 p-10">
      <div className="text-sm uppercase tracking-[0.24em] text-slate-500">투표 결과</div>
      <div className="mt-3 text-4xl font-semibold">{voteSummary.question}</div>
      {!(voteSummary.isResultPublic ?? true) ? (
        <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 py-16 text-center">
          <div className="text-5xl">🔒</div>
          <div className="mt-4 text-xl text-slate-400">교사가 결과를 공개하면 표시됩니다</div>
        </div>
      ) : (
        <div className="mt-8 grid gap-4">
          {voteSummary.results.map((result) => (
            <div key={result.label}>
              <div className="mb-2 flex items-center justify-between text-lg text-slate-200">
                <span>{result.label}</span>
                <span className="font-bold">{result.value}</span>
              </div>
              <div className="h-4 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-4 rounded-full bg-teal-400 transition-all duration-500"
                  style={{
                    width: `${voteSummary.responseCount > 0
                      ? (result.value / voteSummary.responseCount) * 100
                      : 0}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      {voteSummary.responseCount > 0 ? (
        <div className="mt-4 text-sm text-slate-500">총 {voteSummary.responseCount}명 응답</div>
      ) : null}
    </section>
  );
}
