import { NextResponse } from "next/server";

import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    sessionCode?: string;
    studentName?: string;
    authUserId?: string;
  };

  const sessionCode = body.sessionCode?.trim().toUpperCase();
  const studentName = body.studentName?.trim();

  if (!sessionCode || !studentName) {
    return NextResponse.json({ ok: false, error: "missing-fields" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient() ?? await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({
      ok: true,
      sessionCode,
      studentName,
      studentToken: crypto.randomUUID(),
    });
  }

  const worksheetResult = await supabase
    .from("worksheets")
    .select("id, session_code")
    .eq("session_code", sessionCode)
    .maybeSingle<{ id: string; session_code: string }>();

  if (!worksheetResult.data?.id) {
    return NextResponse.json({ ok: false, error: "invalid-session" }, { status: 404 });
  }

  const worksheetId = worksheetResult.data.id;
  const authUser = await supabase.auth.getUser();
  const authUserId = authUser.data.user?.id ?? body.authUserId;
  type SubmissionRow = { id: string; student_token: string; student_name: string; auth_user_id?: string | null; group_id?: string | null };

  let existingSubmission: { data: SubmissionRow | null; error: unknown } = { data: null, error: null };

  if (authUserId) {
    existingSubmission = await supabase
      .from("submissions")
      .select("id, student_token, student_name, auth_user_id, group_id")
      .eq("worksheet_id", worksheetId)
      .eq("auth_user_id", authUserId)
      .maybeSingle<SubmissionRow>();
  }

  if (!existingSubmission.data) {
    existingSubmission = await supabase
      .from("submissions")
      .select("id, student_token, student_name, auth_user_id, group_id")
      .eq("worksheet_id", worksheetId)
      .eq("student_name", studentName)
      .maybeSingle<SubmissionRow>();
  }

  if (existingSubmission.data?.student_token) {
    if (authUserId && existingSubmission.data.auth_user_id !== authUserId) {
      await supabase
        .from("submissions")
        .update({ auth_user_id: authUserId })
        .eq("id", existingSubmission.data.id);
    }

    return NextResponse.json({
      ok: true,
      sessionCode,
      studentName,
      studentToken: existingSubmission.data.student_token,
      submissionId: existingSubmission.data.id,
      authUserId,
      groupId: existingSubmission.data.group_id ?? null,
    });
  }

  const studentToken = crypto.randomUUID();
  const submissionResult = await supabase
    .from("submissions")
    .insert({
      worksheet_id: worksheetId,
      student_name: studentName,
      student_token: studentToken,
      auth_user_id: authUserId,
      answers: {},
      is_submitted: false,
      is_gallery_visible: false,
    })
    .select("id, group_id")
    .single<{ id: string; group_id?: string | null }>();

  if (submissionResult.error || !submissionResult.data?.id) {
    return NextResponse.json({ ok: false, error: "insert-failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    sessionCode,
    studentName,
    studentToken,
    submissionId: submissionResult.data.id,
    authUserId,
    groupId: submissionResult.data.group_id ?? null,
  });
}
