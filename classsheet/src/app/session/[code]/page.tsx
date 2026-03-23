import { notFound } from "next/navigation";

import { ClassroomBootstrap } from "@/components/classroom/classroom-bootstrap";
import { ClassroomRealtimeSync } from "@/components/classroom/classroom-realtime-sync";
import { StudentWorkspace } from "@/components/student/student-workspace";
import { getWorksheetBySessionCode } from "@/lib/server/classroom";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface StudentSessionPageProps {
  params: Promise<{
    code: string;
  }>;
}

export default async function StudentSessionPage({ params }: StudentSessionPageProps) {
  const { code } = await params;
  const worksheet = await getWorksheetBySessionCode(code, { trusted: true });

  if (!worksheet) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <ClassroomBootstrap worksheet={worksheet} />
      <ClassroomRealtimeSync worksheetId={worksheet.id} />
      <StudentWorkspace />
    </main>
  );
}
