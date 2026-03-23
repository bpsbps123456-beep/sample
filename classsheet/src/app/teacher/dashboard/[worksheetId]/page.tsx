export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { notFound } from "next/navigation";

import { logoutTeacherAction } from "@/app/actions/auth";
import { deleteWorksheetAction } from "@/app/actions/worksheets";
import { ClassroomBootstrap } from "@/components/classroom/classroom-bootstrap";
import { ClassroomRealtimeSync } from "@/components/classroom/classroom-realtime-sync";
import { SessionCodeBadge } from "@/components/dashboard/session-code-badge";
import { TeacherDashboardNavbar } from "@/components/dashboard/teacher-dashboard-navbar";
import { TeacherDashboardPreview } from "@/components/dashboard/teacher-dashboard-preview";
import { requireTeacherSession } from "@/lib/auth";
import { getWorksheetById } from "@/lib/server/classroom";

interface TeacherDashboardPageProps {
  params: Promise<{
    worksheetId: string;
  }>;
}

export default async function TeacherDashboardPage({ params }: TeacherDashboardPageProps) {
  await requireTeacherSession();

  const { worksheetId } = await params;
  const worksheet = await getWorksheetById(worksheetId, { trusted: true });

  if (!worksheet) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <TeacherDashboardNavbar
        worksheetId={worksheet.id}
        initialTitle={worksheet.title}
        initialSessionCode={worksheet.sessionCode}
      />

      {/* Content */}
      <div className="space-y-3 px-3 py-3">
        <ClassroomBootstrap worksheet={worksheet} />
        <ClassroomRealtimeSync worksheetId={worksheet.id} />
        <TeacherDashboardPreview />
      </div>
    </main>
  );
}
