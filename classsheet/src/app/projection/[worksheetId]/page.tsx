import { notFound } from "next/navigation";
import { ClassroomBootstrap } from "@/components/classroom/classroom-bootstrap";
import { ClassroomRealtimeSync } from "@/components/classroom/classroom-realtime-sync";
import ProjectionView from "@/components/projection/projection-view";
import { requireTeacherSession } from "@/lib/auth";
import { getWorksheetById } from "@/lib/server/classroom";

interface ProjectionPageProps {
  params: Promise<{
    worksheetId: string;
  }>;
  searchParams?: Promise<{
    type?: string;
    targetId?: string;
  }>;
}

export default async function ProjectionPage({
  params,
  searchParams,
}: ProjectionPageProps) {
  await requireTeacherSession();

  const { worksheetId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const worksheet = await getWorksheetById(worksheetId, { trusted: true });

  if (!worksheet) {
    notFound();
  }

  return (
    <>
      <ClassroomBootstrap worksheet={worksheet} />
      <ClassroomRealtimeSync worksheetId={worksheet.id} />
      <ProjectionView 
        worksheetId={worksheet.id}
        initialType={resolvedSearchParams.type}
        initialTargetId={resolvedSearchParams.targetId}
        initialWorksheetData={worksheet}
      />
    </>
  );
}
