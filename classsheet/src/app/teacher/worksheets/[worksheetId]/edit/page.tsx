export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { notFound } from "next/navigation";

import { updateWorksheetAction } from "@/app/actions/worksheets";
import { WorksheetEditorForm } from "@/components/worksheet/worksheet-editor-form";
import { requireTeacherSession } from "@/lib/auth";
import { getWorksheetById } from "@/lib/server/classroom";
import { createDraftFromWorksheet } from "@/lib/worksheet-editor";

interface EditWorksheetPageProps {
  params: Promise<{
    worksheetId: string;
  }>;
}

export default async function EditWorksheetPage({ params }: EditWorksheetPageProps) {
  await requireTeacherSession();

  const { worksheetId } = await params;
  const worksheet = await getWorksheetById(worksheetId, { trusted: true });

  if (!worksheet) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#fcfdfe] relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(20,184,166,0.06),transparent)] pointer-events-none" />
      <div className="absolute top-[20%] left-[-5%] w-[30%] h-[30%] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <nav className="sticky top-0 z-20 border-b border-slate-200/50 bg-white/70 backdrop-blur-xl">
        <div className="flex w-full items-center gap-6 px-4 py-4">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-600">Workspace Editor</div>
            <h1 className="truncate text-xl font-black tracking-tight text-slate-950">{worksheet.title}</h1>
          </div>
          <Link
            href="/teacher/worksheets"
            className="group flex items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition-all hover:border-teal-500/30 hover:bg-slate-50 hover:text-slate-900"
          >
            <span className="transition-transform group-hover:-translate-x-1">←</span> 목록으로
          </Link>
        </div>
      </nav>

      <div className="relative z-10 w-full px-0 py-0 animate-in fade-in slide-in-from-bottom-6 duration-700">
        <WorksheetEditorForm
          action={updateWorksheetAction}
          initialDraft={createDraftFromWorksheet(worksheet)}
          worksheetId={worksheet.id}
        />
      </div>
    </main>
  );
}
