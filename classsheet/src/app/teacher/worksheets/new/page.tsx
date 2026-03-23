export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";

import { createWorksheetAction, duplicateWorksheetAction } from "@/app/actions/worksheets";
import { WorksheetEditorForm } from "@/components/worksheet/worksheet-editor-form";
import { requireTeacherSession } from "@/lib/auth";
import { listTemplates } from "@/lib/server/classroom";

export default async function NewWorksheetPage() {
  await requireTeacherSession();
  const templates = await listTemplates({ trusted: true });

  return (
    <main className="min-h-screen bg-[#fcfdfe] relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(20,184,166,0.06),transparent)] pointer-events-none" />
      <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <nav className="sticky top-0 z-20 border-b border-slate-200/50 bg-white/70 backdrop-blur-xl">
        <div className="flex w-full items-center gap-6 px-4 py-4">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-600">Workspace Editor</div>
            <h1 className="text-xl font-black tracking-tight text-slate-950">새 수업 만들기</h1>
          </div>
          <Link
            href="/teacher/worksheets"
            className="group flex items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition-all hover:border-teal-500/30 hover:bg-slate-50 hover:text-slate-900"
          >
            <span className="transition-transform group-hover:-translate-x-1">←</span> 목록으로
          </Link>
        </div>
      </nav>

      <div className="relative z-10 w-full space-y-0 px-0 py-0">
        {templates.length > 0 ? (
          <section className="bg-white/40 backdrop-blur-md border border-slate-200/60 rounded-[32px] p-8 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-teal-600/70 mb-2">Kickstart</div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">템플릿으로 시작하기</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {templates.map((template) => (
                <form key={template.id} action={duplicateWorksheetAction}>
                  <input type="hidden" name="worksheetId" value={template.id} />
                  <input type="hidden" name="fromTemplate" value="true" />
                  <button
                    type="submit"
                    className="group w-full rounded-2xl border border-slate-100 bg-white p-6 text-left shadow-sm transition-all hover:border-teal-500/20 hover:shadow-xl hover:shadow-teal-600/10 hover:-translate-y-1"
                  >
                    <div className="text-lg font-black text-slate-950 group-hover:text-teal-600 transition-colors">{template.title}</div>
                    {template.description ? (
                      <div className="mt-2 text-sm text-slate-500 font-medium line-clamp-2">{template.description}</div>
                    ) : (
                      <div className="mt-2 text-xs text-slate-300 font-bold italic uppercase tracking-wider">No description</div>
                    )}
                    <div className="mt-4 flex items-center text-xs font-black text-teal-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                      Use Template →
                    </div>
                  </button>
                </form>
              ))}
            </div>
          </section>
        ) : null}
        
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
          <WorksheetEditorForm action={createWorksheetAction} />
        </div>
      </div>
    </main>
  );
}
