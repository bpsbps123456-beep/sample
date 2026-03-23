"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireTeacherSession } from "@/lib/auth";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeWorksheetComponents } from "@/lib/worksheet-editor";

function parseWorksheetComponents(rawComponents: string) {
  try {
    return JSON.parse(rawComponents) as unknown;
  } catch (error) {
    console.error("[worksheet-actions] invalid components payload", error);
    throw new Error("활동지 구성 데이터를 읽지 못했습니다. 다시 시도해 주세요.");
  }
}

async function syncWorksheetGroups(
  worksheetId: string,
  mode: "individual" | "group",
) {
  const supabase = createSupabaseAdminClient() ?? await createSupabaseServerClient();

  if (!supabase) {
    return;
  }

  if (mode === "group") {
    const existingGroups = await supabase
      .from("groups")
      .select("id")
      .eq("worksheet_id", worksheetId);

    if ((existingGroups.data ?? []).length === 0) {
      await supabase.from("groups").insert([
        { worksheet_id: worksheetId, name: "1모둠", icon: "🌊", display_order: 1 },
        { worksheet_id: worksheetId, name: "2모둠", icon: "🔥", display_order: 2 },
        { worksheet_id: worksheetId, name: "3모둠", icon: "⚡", display_order: 3 },
        { worksheet_id: worksheetId, name: "4모둠", icon: "🌿", display_order: 4 },
      ]);
    }

    return;
  }

  await supabase.from("groups").delete().eq("worksheet_id", worksheetId);
}

function generateSessionCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

async function createUniqueSessionCode() {
  const supabase = createSupabaseAdminClient() ?? await createSupabaseServerClient();

  if (!supabase) {
    return generateSessionCode();
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateSessionCode();
    const existing = await supabase
      .from("worksheets")
      .select("id")
      .eq("session_code", code)
      .maybeSingle<{ id: string }>();

    if (!existing.data) {
      return code;
    }
  }

  return `${Date.now().toString().slice(-6)}`;
}

function extractDrawingPaths(answers: Record<string, unknown> | null | undefined) {
  return Object.values(answers ?? {}).flatMap((value) => {
    if (typeof value !== "string") {
      return [];
    }

    const marker = "/storage/v1/object/public/drawings/";
    const index = value.indexOf(marker);
    if (index < 0) {
      return [];
    }

    return [decodeURIComponent(value.slice(index + marker.length))];
  });
}

async function deleteWorksheetDrawings(worksheetId: string) {
  const supabase = createSupabaseAdminClient() ?? (await createSupabaseServerClient());
  if (!supabase) {
    return;
  }

  const submissions = await supabase
    .from("submissions")
    .select("answers")
    .eq("worksheet_id", worksheetId)
    .returns<Array<{ answers: Record<string, unknown> | null }>>();

  const paths = (submissions.data ?? []).flatMap((submission) =>
    extractDrawingPaths(submission.answers),
  );

  if (paths.length > 0) {
    await supabase.storage.from("drawings").remove(paths);
  }
}

export async function createWorksheetAction(formData: FormData) {
  await requireTeacherSession();

  const supabase = createSupabaseAdminClient() ?? await createSupabaseServerClient();
  if (!supabase) {
    redirect("/teacher/worksheets/new");
  }

  const title = String(formData.get("title") ?? "").trim() || "새 수업";
  const description = String(formData.get("description") ?? "").trim();
  const learningGoal = String(formData.get("learningGoal") ?? "").trim();
  const mode = formData.get("mode") === "group" ? "group" : "individual";
  const rawComponents = String(formData.get("components") ?? "[]");

  const parsedComponents = parseWorksheetComponents(rawComponents);

  const components = normalizeWorksheetComponents(parsedComponents);
  const totalPages = Math.max(...components.map((component) => component.page), 1);
  const sessionCode = await createUniqueSessionCode();

  const createdWorksheet = await supabase
    .from("worksheets")
    .insert({
      title,
      description,
      learning_goal: learningGoal,
      components,
      session_code: sessionCode,
      is_active: false,
      gallery_open: false,
      gallery_anonymous: true,
      is_locked: false,
      timer_active: false,
      focus_mode: false,
      chat_active: false,
      chat_paused: false,
      session_mode: mode,
      current_page: 1,
    })
    .select("id")
    .single<{ id: string }>();

  const worksheetId = createdWorksheet.data?.id;

  if (!worksheetId) {
    console.error("[createWorksheet] insert failed:", createdWorksheet.error);
    redirect("/teacher/worksheets/new");
  }

  await syncWorksheetGroups(worksheetId, mode);

  redirect(`/teacher/dashboard/${worksheetId}?pages=${totalPages}`);
}

export async function updateWorksheetAction(formData: FormData) {
  await requireTeacherSession();

  const supabase = createSupabaseAdminClient() ?? await createSupabaseServerClient();
  if (!supabase) {
    redirect("/teacher/worksheets");
  }

  const worksheetId = String(formData.get("worksheetId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim() || "수업";
  const description = String(formData.get("description") ?? "").trim();
  const learningGoal = String(formData.get("learningGoal") ?? "").trim();
  const mode = formData.get("mode") === "group" ? "group" : "individual";
  const rawComponents = String(formData.get("components") ?? "[]");
  const newSessionCode = String(formData.get("sessionCode") ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);

  if (!worksheetId) {
    redirect("/teacher/worksheets");
  }

  const parsedComponents = parseWorksheetComponents(rawComponents);

  const components = normalizeWorksheetComponents(parsedComponents);

  const updatePayload: Record<string, unknown> = {
    title,
    description,
    learning_goal: learningGoal,
    components,
    session_mode: mode,
  };
  if (newSessionCode) updatePayload.session_code = newSessionCode;

  const start = Date.now();
  console.log("[updateWorksheet] Payload generated, updating DB...", worksheetId);
  const { error: updateError } = await supabase
    .from("worksheets")
    .update(updatePayload)
    .eq("id", worksheetId);

  if (updateError) {
    console.error("[updateWorksheet] DB update failed:", updateError, "Duration:", Date.now() - start, "ms");
    // Not redirecting for now to let the user see the error if possible, or we could redirect back to edit with error param
    return;
  }

  const dbDone = Date.now();
  console.log("[updateWorksheet] DB update success, syncing groups. Took:", dbDone - start, "ms");
  await syncWorksheetGroups(worksheetId, mode);

  const groupsDone = Date.now();
  console.log("[updateWorksheet] Groups sync success. Took:", groupsDone - dbDone, "ms Total:", groupsDone - start, "ms");

  revalidatePath("/teacher/worksheets");
  revalidatePath(`/teacher/dashboard/${worksheetId}`);
  revalidatePath(`/teacher/worksheets/${worksheetId}/edit`);

  const intent = String(formData.get("_intent") ?? "").trim();
  console.log("[updateWorksheet] Done, redirecting... Intent:", intent);
  if (intent === "stay") {
    redirect(`/teacher/worksheets/${worksheetId}/edit`);
  } else {
    redirect(`/teacher/dashboard/${worksheetId}`);
  }
}

export async function deleteWorksheetAction(formData: FormData) {
  await requireTeacherSession();

  const supabase = createSupabaseAdminClient() ?? await createSupabaseServerClient();
  if (!supabase) {
    redirect("/teacher/worksheets");
  }

  const worksheetId = String(formData.get("worksheetId") ?? "").trim();

  if (!worksheetId) {
    redirect("/teacher/worksheets");
  }

  await deleteWorksheetDrawings(worksheetId);
  await supabase.from("worksheets").delete().eq("id", worksheetId);

  redirect("/teacher/worksheets");
}

export async function duplicateWorksheetAction(formData: FormData) {
  await requireTeacherSession();

  const supabase = createSupabaseAdminClient() ?? await createSupabaseServerClient();
  if (!supabase) {
    redirect("/teacher/worksheets");
  }

  const worksheetId = String(formData.get("worksheetId") ?? "").trim();
  const isFromTemplate = formData.get("fromTemplate") === "true";

  if (!worksheetId) {
    redirect("/teacher/worksheets");
  }

  const source = await supabase
    .from("worksheets")
    .select("title, description, learning_goal, components, session_mode")
    .eq("id", worksheetId)
    .maybeSingle<{
      title: string;
      description: string | null;
      learning_goal: string | null;
      components: unknown;
      session_mode: "individual" | "group";
    }>();

  if (!source.data) {
    redirect("/teacher/worksheets");
  }

  const sessionCode = await createUniqueSessionCode();
  const components = normalizeWorksheetComponents(source.data.components);

  const createdWorksheet = await supabase
    .from("worksheets")
    .insert({
      title: isFromTemplate ? source.data.title : `${source.data.title} 사본`,
      description: source.data.description ?? "",
      learning_goal: source.data.learning_goal ?? "",
      components,
      session_code: sessionCode,
      is_active: false,
      gallery_open: false,
      gallery_anonymous: true,
      is_locked: false,
      timer_active: false,
      focus_mode: false,
      chat_active: false,
      chat_paused: false,
      session_mode: source.data.session_mode,
      current_page: 1,
    })
    .select("id")
    .single<{ id: string }>();

  if (createdWorksheet.data?.id) {
    await syncWorksheetGroups(createdWorksheet.data.id, source.data.session_mode);
    if (isFromTemplate) {
      redirect(`/teacher/worksheets/${createdWorksheet.data.id}/edit`);
    }
    redirect(`/teacher/worksheets/${createdWorksheet.data.id}/edit`);
  }

  redirect("/teacher/worksheets");
}

export async function saveAsTemplateAction(formData: FormData) {
  await requireTeacherSession();

  const supabase = createSupabaseAdminClient() ?? await createSupabaseServerClient();
  if (!supabase) {
    redirect("/teacher/worksheets");
  }

  const worksheetId = String(formData.get("worksheetId") ?? "").trim();

  if (!worksheetId) {
    redirect("/teacher/worksheets");
  }

  const source = await supabase
    .from("worksheets")
    .select("title, description, learning_goal, components, session_mode")
    .eq("id", worksheetId)
    .maybeSingle<{
      title: string;
      description: string | null;
      learning_goal: string | null;
      components: unknown;
      session_mode: "individual" | "group";
    }>();

  if (!source.data) {
    redirect("/teacher/worksheets");
  }

  const sessionCode = await createUniqueSessionCode();
  const components = normalizeWorksheetComponents(source.data.components);

  await supabase.from("worksheets").insert({
    title: source.data.title,
    description: source.data.description ?? "",
    learning_goal: source.data.learning_goal ?? "",
    components,
    session_code: sessionCode,
    is_active: false,
    gallery_open: false,
    gallery_anonymous: true,
    is_locked: false,
    timer_active: false,
    focus_mode: false,
    chat_active: false,
    chat_paused: false,
    session_mode: source.data.session_mode,
    current_page: 1,
  });

  redirect("/teacher/worksheets");
}

export async function updateSessionCodeAction(formData: FormData) {
  await requireTeacherSession();

  const supabase = createSupabaseAdminClient() ?? await createSupabaseServerClient();
  if (!supabase) {
    redirect("/teacher/worksheets");
  }

  const worksheetId = String(formData.get("worksheetId") ?? "").trim();
  const sessionCode = String(formData.get("sessionCode") ?? "").trim().toUpperCase();

  if (!worksheetId || !sessionCode) {
    redirect("/teacher/worksheets");
  }

  const existing = await supabase
    .from("worksheets")
    .select("id")
    .eq("session_code", sessionCode)
    .neq("id", worksheetId)
    .maybeSingle<{ id: string }>();

  if (existing.data) {
    redirect("/teacher/worksheets?error=code_exists");
  }

  await supabase
    .from("worksheets")
    .update({ session_code: sessionCode })
    .eq("id", worksheetId);

  revalidatePath("/teacher/worksheets");
  redirect("/teacher/worksheets");
}
