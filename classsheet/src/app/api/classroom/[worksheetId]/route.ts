import { NextResponse } from "next/server";

import { TEACHER_SESSION_COOKIE } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applyClassroomMutation } from "@/lib/server/classroom-mutations";
import type { ClassroomSyncAction } from "@/lib/types/classroom-actions";

const teacherOnlyActionTypes = new Set<ClassroomSyncAction["type"]>([
  "session_start",
  "timer",
  "timer_timeout_decision",
  "focus",
  "page",
  "page_lock",
  "learning_goal_update",
  "chat_toggle",
  "chat_pause",
  "chat_pin",
  "chat_delete",
  "chat_clear",
  "set_projection",
  "vote_open",
  "vote_close",
  "gallery_toggle",
  "gallery_anonymous",
  "gallery_filter",
  "gallery_card",
  "gallery_project",
  "session_mode",
  "assign_group",
  "session_close",
  "session_code_change",
  "writing_lock",
  "chat_mute",
  "student_lock",
  "chat_anonymous_mode",
  "vote_result_toggle",
]);

export async function POST(
  request: Request,
  context: { params: Promise<{ worksheetId: string }> },
) {
  const { worksheetId } = await context.params;
  const action = (await request.json()) as ClassroomSyncAction;

  if (teacherOnlyActionTypes.has(action.type)) {
    const cookieHeader = request.headers.get("cookie") ?? "";
    const hasTeacherCookie = cookieHeader.includes(`${TEACHER_SESSION_COOKIE}=active`);

    if (!hasTeacherCookie) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  const studentSupabase = await createSupabaseServerClient();
  const authUser = studentSupabase ? await studentSupabase.auth.getUser() : null;
  const actorAuthUserId = authUser?.data.user?.id;

  // Always use trusted (admin) client so RLS doesn't block legitimate server-side mutations
  const result = await applyClassroomMutation(worksheetId, action, {
    trustedTeacherMutation: true,
    actorAuthUserId,
  });
  return NextResponse.json(result);
}
