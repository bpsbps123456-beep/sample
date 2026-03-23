import type { StudentSubmissionSummary } from "@/lib/types/domain";

interface SessionSummaryCardProps {
  students: StudentSubmissionSummary[];
  helpRequestCount: number;
  chatMessageCount: number;
  visibleGalleryCount: number;
  title?: string;
  compact?: boolean;
}

export function SessionSummaryCard({
  students,
  helpRequestCount,
  chatMessageCount,
  visibleGalleryCount,
  title = "요약",
  compact = false,
}: SessionSummaryCardProps) {
  const submittedCount = students.filter((student) => student.submitted).length;
  const averageProgress =
    students.length > 0
      ? Math.round(
          students.reduce((total, student) => total + student.progress, 0) / students.length,
        )
      : 0;
  const completionRate = students.length > 0 ? Math.round((submittedCount / students.length) * 100) : 0;

  const inner = (
    <>
      <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">{title}</div>
      <div className={`mt-4 grid gap-3 ${compact ? "grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
        <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">제출</div>
          <div className="mt-1.5 text-2xl font-bold text-slate-950">{submittedCount}</div>
          <div className="mt-0.5 text-xs text-slate-400">{students.length}명 중</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">평균 진행률</div>
          <div className="mt-1.5 text-2xl font-bold text-slate-950">{averageProgress}%</div>
          <div className="mt-0.5 text-xs text-slate-400">전체 학생</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">도움 요청</div>
          <div className="mt-1.5 text-2xl font-bold text-slate-950">{helpRequestCount}</div>
          <div className="mt-0.5 text-xs text-slate-400">건</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">채팅</div>
          <div className="mt-1.5 text-2xl font-bold text-slate-950">{chatMessageCount}</div>
          <div className="mt-0.5 text-xs text-slate-400">메시지</div>
        </div>
      </div>

      <div className={`mt-3 grid gap-3 ${compact ? "grid-cols-3" : "sm:grid-cols-3"}`}>
        <div className="rounded-xl bg-amber-50 px-4 py-4 ring-1 ring-amber-100">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-500">미제출</div>
          <div className="mt-1.5 text-xl font-bold text-slate-950">{Math.max(students.length - submittedCount, 0)}명</div>
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">공유된 활동지</div>
          <div className="mt-1.5 text-xl font-bold text-slate-950">{visibleGalleryCount}개</div>
        </div>
        <div className="rounded-xl bg-teal-500/10 px-4 py-4 ring-1 ring-teal-500/25">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">완료율</div>
          <div className="mt-1.5 text-xl font-bold text-teal-700">{completionRate}%</div>
        </div>
      </div>
    </>
  );

  return compact ? (
    <div>{inner}</div>
  ) : (
    <section className="surface rounded-2xl p-5">{inner}</section>
  );
}
