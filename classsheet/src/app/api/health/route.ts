import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const admin = createSupabaseAdminClient();

  if (!admin) {
    return NextResponse.json({ error: "no admin client" });
  }

  if (action === "test-insert") {
    const sessionCode = "TEST" + Math.random().toString(36).substring(2, 4).toUpperCase();
    const insertResult = await admin
      .from("worksheets")
      .insert({
        title: "Health Check Test",
        description: "",
        learning_goal: "",
        components: [],
        session_code: sessionCode,
        is_active: false,
        gallery_open: false,
        gallery_anonymous: true,
        is_locked: false,
        timer_active: false,
        focus_mode: false,
        chat_active: false,
        chat_paused: false,
        session_mode: "individual",
        current_page: 1,
        page_lock_enabled: true,
      })
      .select("id")
      .single<{ id: string }>();

    if (insertResult.error) {
      return NextResponse.json({ action: "test-insert", ok: false, error: insertResult.error });
    }

    const worksheetId = insertResult.data?.id;

    // Now try to read it back
    const readResult = await admin
      .from("worksheets")
      .select("id, title, session_code")
      .eq("id", worksheetId)
      .maybeSingle();

    // Clean up
    await admin.from("worksheets").delete().eq("id", worksheetId);

    return NextResponse.json({
      action: "test-insert",
      ok: true,
      insertedId: worksheetId,
      readBack: readResult.data,
      readError: readResult.error,
    });
  }

  if (action === "test-fetch") {
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "missing id param" });
    }

    // Replicate exactly what getWorksheetById does
    const worksheetQuery = await admin
      .from("worksheets")
      .select(
        "id, title, description, components, session_code, is_active, gallery_open, gallery_filter_question, gallery_anonymous, is_locked, timer_end_at, timer_active, focus_mode, chat_active, chat_paused, session_mode, current_page, page_lock_enabled, learning_goal",
      )
      .eq("id", id)
      .maybeSingle();

    return NextResponse.json({
      action: "test-fetch",
      worksheetId: id,
      found: !!worksheetQuery.data,
      data: worksheetQuery.data ? { id: worksheetQuery.data.id, title: worksheetQuery.data.title } : null,
      error: worksheetQuery.error,
    });
  }

  // Default: list worksheets
  const result = await admin.from("worksheets").select("id, title, session_code, created_at").order("created_at", { ascending: false }).limit(5);

  return NextResponse.json({
    supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    serviceRoleKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10) ?? null,
    adminClient: true,
    worksheets: result.data,
    worksheetsError: result.error,
  });
}
