export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";

import { duplicateWorksheetAction } from "@/app/actions/worksheets";
import { InlineSessionCodeEdit } from "@/components/dashboard/inline-session-code-edit";
import { WorksheetActionsMenu } from "@/components/dashboard/worksheet-actions-menu";
import { getTeacherSessionRole, requireTeacherSession } from "@/lib/auth";
import { listTemplates, listWorksheets } from "@/lib/server/classroom";

export default async function TeacherWorksheetsPage() {
  await requireTeacherSession();
  const role = await getTeacherSessionRole();
  const isDemo = role === "demo";
  const [worksheets, templates] = isDemo
    ? [[], []]
    : await Promise.all([
        listWorksheets({ trusted: true }),
        listTemplates({ trusted: true }),
      ]);

  return (
    <main className="min-h-screen bg-[#f8f9fb]">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">수업 관리</p>
            <h1 className="text-xl font-black tracking-tight text-slate-950">수업 목록</h1>
          </div>
          <Link
            href="/teacher/worksheets/new"
            className="flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-950/20 transition-all hover:bg-slate-800 hover:-translate-y-0.5"
          >
            <span className="text-base leading-none">+</span> 새 수업 만들기
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-6 py-8 space-y-5">

        {/* ── Empty state ── */}
        {worksheets.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">📋</div>
            <p className="mt-5 text-lg font-black text-slate-800">아직 만든 수업이 없어요</p>
            <p className="mt-2 text-sm font-medium text-slate-400">새 수업을 만들어 바로 시작해 보세요.</p>
            <Link
              href="/teacher/worksheets/new"
              className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-slate-950/20 hover:bg-slate-800 transition-all"
            >
              + 새 수업 만들기
            </Link>
          </div>
        )}

        {/* ── Worksheet list ── */}
        {worksheets.length > 0 && (
          <div className="space-y-3">
            {worksheets.map((worksheet) => (
              <div
                key={worksheet.id}
                className="group flex items-center gap-5 rounded-2xl border border-slate-200/80 bg-white px-6 py-5 shadow-sm transition-all hover:border-slate-300/60 hover:shadow-md"
              >
                {/* Left accent */}
                <div className="hidden h-10 w-1 shrink-0 rounded-full bg-teal-500/30 group-hover:bg-teal-500 transition-colors sm:block" />

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                      {worksheet.mode === "group" ? "모둠" : "개인"}
                    </span>
                    <InlineSessionCodeEdit
                      worksheetId={worksheet.id}
                      initialCode={worksheet.sessionCode}
                    />
                    <span className="text-[11px] font-medium text-slate-400">
                      {worksheet.currentPage}페이지
                    </span>
                  </div>
                  <h2 className="truncate text-[17px] font-black tracking-tight text-slate-950">
                    {worksheet.title}
                  </h2>
                  {worksheet.description ? (
                    <p className="mt-0.5 text-sm text-slate-400 line-clamp-1">{worksheet.description}</p>
                  ) : null}
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/teacher/dashboard/${worksheet.id}`}
                    className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-slate-700"
                  >
                    대시보드
                  </Link>
                  <Link
                    href={`/teacher/worksheets/${worksheet.id}/edit`}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50"
                  >
                    수정
                  </Link>
                  <WorksheetActionsMenu
                    worksheetId={worksheet.id}
                    sessionCode={worksheet.sessionCode}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Templates ── */}
        {templates.length > 0 && (
          <section className="pt-2">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">저장된 템플릿</p>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {templates.map((template) => (
                <div key={template.id} className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white px-6 py-5 shadow-sm">
                  <div className="min-w-0 flex-1">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-700">
                      ★ 템플릿
                    </span>
                    <h3 className="mt-2 truncate text-base font-black text-slate-950">{template.title}</h3>
                    {template.description ? (
                      <p className="mt-0.5 text-sm text-slate-400 line-clamp-1">{template.description}</p>
                    ) : null}
                  </div>
                  <form action={duplicateWorksheetAction} className="shrink-0">
                    <input type="hidden" name="worksheetId" value={template.id} />
                    <input type="hidden" name="fromTemplate" value="true" />
                    <button
                      type="submit"
                      className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-bold text-teal-700 transition-all hover:bg-teal-100"
                    >
                      사용하기
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </main>
  );
}
