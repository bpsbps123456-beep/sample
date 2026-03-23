export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { notFound } from "next/navigation";

import { SessionSummaryCard } from "@/components/dashboard/session-summary-card";
import { requireTeacherSession } from "@/lib/auth";
import { getWorksheetById } from "@/lib/server/classroom";

interface TeacherSummaryPageProps {
  params: Promise<{
    worksheetId: string;
  }>;
}

export default async function TeacherSummaryPage({ params }: TeacherSummaryPageProps) {
  await requireTeacherSession();

  const { worksheetId } = await params;
  const worksheet = await getWorksheetById(worksheetId, { trusted: true });

  if (!worksheet) {
    notFound();
  }

  const submittedCount = worksheet.students.filter((s) => s.submitted).length;
  const visibleGalleryCount = worksheet.galleryCards.filter((card) => card.visible).length;

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Sticky nav */}
      <nav className="sticky top-0 z-10 border-b border-slate-200 bg-white/97 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3">
          <div className="min-w-0 flex-1">
            <div className="muted-label">수업 요약</div>
            <h1 className="truncate text-base font-bold leading-tight text-slate-950">{worksheet.title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-bold tracking-[0.1em] text-white">
              {worksheet.sessionCode}
            </span>
            <Link
              href={`/teacher/dashboard/${worksheet.id}`}
              className="action-secondary rounded-xl px-3 py-1.5 text-xs font-semibold"
            >
              ← 대시보드
            </Link>
            <Link
              href={`/projection/${worksheet.id}`}
              className="action-primary rounded-xl px-3 py-1.5 text-xs font-semibold"
            >
              수업 화면 보기
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl space-y-4 px-6 py-5">

        {/* Stats */}
        <SessionSummaryCard
          students={worksheet.students}
          helpRequestCount={worksheet.helpRequests.length}
          chatMessageCount={worksheet.chatMessages.length}
          visibleGalleryCount={visibleGalleryCount}
          title="전체 요약"
        />

        {/* Detail */}
        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">

          {/* Student list */}
          <div className="surface rounded-2xl p-5">
            <div className="muted-label">학생별 결과</div>
            <div className="mt-1 text-sm text-slate-500">
              {worksheet.students.length}명 참여 · {submittedCount}명 제출
            </div>
            {worksheet.students.length === 0 ? (
              <div className="mt-4 rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                참여한 학생이 없습니다.
              </div>
            ) : (
              <div className="mt-4 grid gap-2 xl:grid-cols-2">
                {worksheet.students.map((student) => (
                  <div key={student.id} className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-900">{student.studentName}</div>
                        <div className="mt-0.5 truncate text-xs text-slate-400">{student.currentQuestion}</div>
                      </div>
                      <div
                        className={`shrink-0 rounded-lg px-3 py-1 text-xs font-semibold ${
                          student.submitted
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {student.submitted ? "제출 완료" : `${student.progress}%`}
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          student.submitted ? "bg-emerald-500" : "bg-teal-300"
                        }`}
                        style={{ width: `${student.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ops summary */}
          <div className="surface-strong rounded-2xl p-5 text-white">
            <div className="muted-label">운영 기록</div>
            <div className="mt-4 grid gap-3 xl:grid-cols-3">
              <div className="rounded-xl bg-white/8 p-5">
                <div className="text-sm text-slate-400">도움 요청</div>
                <div className="mt-1 text-2xl font-semibold">
                  {worksheet.helpRequests.length}
                  <span className="ml-1.5 text-base font-normal text-slate-400">건</span>
                </div>
              </div>
              <div className="rounded-xl bg-white/8 p-5">
                <div className="text-sm text-slate-400">공유된 활동지</div>
                <div className="mt-1 text-2xl font-semibold">
                  {visibleGalleryCount}
                  <span className="ml-1.5 text-base font-normal text-slate-400">개</span>
                </div>
              </div>
              <div className="rounded-xl bg-white/8 p-5">
                <div className="text-sm text-slate-400">채팅 메시지</div>
                <div className="mt-1 text-2xl font-semibold">
                  {worksheet.chatMessages.length}
                  <span className="ml-1.5 text-base font-normal text-slate-400">개</span>
                </div>
              </div>
              <div className="rounded-xl border border-teal-300/40 bg-teal-300/10 p-5 xl:col-span-3">
                <div className="text-sm text-teal-300">최종 제출률</div>
                <div className="mt-1 text-3xl font-bold text-teal-300">
                  {worksheet.students.length > 0
                    ? Math.round((submittedCount / worksheet.students.length) * 100)
                    : 0}%
                </div>
                <div className="mt-2 text-xs text-slate-400">{submittedCount} / {worksheet.students.length}명 제출</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
