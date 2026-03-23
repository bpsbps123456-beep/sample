import "server-only";

import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { encodeFutureTimerTimestamp, encodePausedTimerTimestamp } from "@/lib/timer-state";
import type { ClassroomSyncAction } from "@/lib/types/classroom-actions";

type MutationClient = NonNullable<
  Awaited<ReturnType<typeof createSupabaseServerClient>> | ReturnType<typeof createSupabaseAdminClient>
>;

async function findOrCreateSubmissionId(
  supabase: MutationClient,
  worksheetId: string,
  studentName: string,
  studentToken?: string,
  authUserId?: string,
) {
  const existing = authUserId
    ? await supabase
        .from("submissions")
        .select("id, auth_user_id")
        .eq("worksheet_id", worksheetId)
        .eq("auth_user_id", authUserId)
        .limit(1)
        .maybeSingle<{ id: string; auth_user_id?: string | null }>()
    : studentToken
      ? await supabase
          .from("submissions")
          .select("id, auth_user_id")
          .eq("worksheet_id", worksheetId)
          .eq("student_token", studentToken)
          .limit(1)
          .maybeSingle<{ id: string; auth_user_id?: string | null }>()
      : await supabase
          .from("submissions")
          .select("id, auth_user_id")
          .eq("worksheet_id", worksheetId)
          .eq("student_name", studentName)
          .limit(1)
          .maybeSingle<{ id: string; auth_user_id?: string | null }>();

  if (existing.data?.id) {
    if (authUserId && existing.data.auth_user_id !== authUserId) {
      await supabase
        .from("submissions")
        .update({ auth_user_id: authUserId })
        .eq("id", existing.data.id);
    }
    return existing.data.id;
  }

  const created = await supabase
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
    .select("id")
    .single<{ id: string }>();

  if (created.error) return null;
  return created.data?.id ?? null;
}

async function findLatestVoteId(supabase: MutationClient, worksheetId: string) {
  const result = await supabase
    .from("votes")
    .select("id")
    .eq("worksheet_id", worksheetId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  return result.data?.id ?? null;
}

async function findActiveVoteId(supabase: MutationClient, worksheetId: string) {
  const result = await supabase
    .from("votes")
    .select("id")
    .eq("worksheet_id", worksheetId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  return result.data?.id ?? null;
}

async function closeActiveVotes(supabase: MutationClient, worksheetId: string) {
  await supabase
    .from("votes")
    .update({ is_active: false, ended_at: new Date().toISOString() })
    .eq("worksheet_id", worksheetId)
    .eq("is_active", true);
}

export async function applyClassroomMutation(
  worksheetId: string,
  action: ClassroomSyncAction,
  options?: { trustedTeacherMutation?: boolean; actorAuthUserId?: string },
) {
  const supabase =
    options?.trustedTeacherMutation
      ? createSupabaseAdminClient() ?? (await createSupabaseServerClient())
      : await createSupabaseServerClient();

  if (!supabase) {
    return { ok: true, mode: "fallback" as const };
  }

  try {
    switch (action.type) {
      case "register_student": {
        const submissionId = action.submissionId || await findOrCreateSubmissionId(
          supabase,
          worksheetId,
          action.studentName,
          action.studentToken,
          options?.actorAuthUserId,
        );

        if (submissionId) {
          await supabase.from("presence_sessions").upsert(
            {
              worksheet_id: worksheetId,
              submission_id: submissionId,
              student_name: action.studentName,
              status: "online",
              last_seen_at: new Date().toISOString(),
            },
            { onConflict: "worksheet_id,submission_id" },
          );
        }
        break;
      }
      case "sync_answers": {
        const submissionId = action.submissionId || await findOrCreateSubmissionId(
          supabase,
          worksheetId,
          action.studentName,
          action.studentToken,
          options?.actorAuthUserId,
        );

        if (submissionId) {
          await supabase
            .from("submissions")
            .update({ answers: action.answers, updated_at: new Date().toISOString() })
            .eq("id", submissionId);
        }
        break;
      }
      case "update_progress": {
        const submissionId = action.submissionId || await findOrCreateSubmissionId(
          supabase,
          worksheetId,
          action.studentName,
          action.studentToken,
          options?.actorAuthUserId,
        );

        if (submissionId) {
          await supabase.from("presence_sessions").upsert(
            {
              worksheet_id: worksheetId,
              submission_id: submissionId,
              student_name: action.studentName,
              status: "online",
              last_seen_at: new Date().toISOString(),
            },
            { onConflict: "worksheet_id,submission_id" },
          );
        }
        break;
      }
      case "submit_student": {
        const submissionId = action.submissionId || await findOrCreateSubmissionId(
          supabase,
          worksheetId,
          action.studentName,
          action.studentToken,
          options?.actorAuthUserId,
        );

        if (submissionId) {
          await supabase
            .from("submissions")
            .update({ is_submitted: true, submitted_at: new Date().toISOString() })
            .eq("id", submissionId);
          await supabase.from("presence_sessions").upsert(
            {
              worksheet_id: worksheetId,
              submission_id: submissionId,
              student_name: action.studentName,
              status: "submitted",
              last_seen_at: new Date().toISOString(),
            },
            { onConflict: "worksheet_id,submission_id" },
          );
        }
        break;
      }
      case "unsubmit_student": {
        const submissionId = action.submissionId || await findOrCreateSubmissionId(
          supabase,
          worksheetId,
          action.studentName,
          action.studentToken,
          options?.actorAuthUserId,
        );

        if (submissionId) {
          await supabase
            .from("submissions")
            .update({ is_submitted: false })
            .eq("id", submissionId);
          await supabase.from("presence_sessions").upsert(
            {
              worksheet_id: worksheetId,
              submission_id: submissionId,
              student_name: action.studentName,
              status: "active",
              last_seen_at: new Date().toISOString(),
            },
            { onConflict: "worksheet_id,submission_id" },
          );
        }
        break;
      }
      case "session_start": {
        await supabase
          .from("worksheets")
          .update({
            is_active: true,
            is_locked: false,
            current_page: 1,
          })
          .eq("id", worksheetId);
        break;
      }
      case "timer": {
        const seconds = Math.max(0, action.seconds ?? 0);
        const updates =
          action.command === "start"
              ? {
                  timer_active: true,
                  timer_end_at: encodeFutureTimerTimestamp(seconds),
                  is_locked: false,
                }
              : action.command === "pause"
                ? {
                    timer_active: false,
                    timer_end_at: encodePausedTimerTimestamp(seconds),
                  }
                : action.command === "reset"
                  ? {
                    timer_active: false,
                    timer_end_at: null,
                    is_locked: false,
                  }
                : {
                    timer_active: false,
                    timer_end_at: encodePausedTimerTimestamp(seconds),
                  };

        await supabase.from("worksheets").update(updates).eq("id", worksheetId);
        break;
      }
      case "timer_timeout_decision": {
        if (action.decision === "lock") {
          await supabase
            .from("worksheets")
            .update({
              is_locked: true,
              timer_active: false,
              timer_end_at: null,
            })
            .eq("id", worksheetId);
        } else {
          await supabase
            .from("worksheets")
            .update({
              is_locked: false,
              timer_active: true,
              timer_end_at: encodeFutureTimerTimestamp(action.seconds ?? 0),
            })
            .eq("id", worksheetId);
        }
        break;
      }
      case "focus": {
        await supabase
          .from("worksheets")
          .update({ focus_mode: action.enabled })
          .eq("id", worksheetId);
        break;
      }
      case "page": {
        await supabase
          .from("worksheets")
          .update({ current_page: action.page })
          .eq("id", worksheetId);
        break;
      }
      case "learning_goal_update": {
        await supabase
          .from("worksheets")
          .update({ learning_goal: action.learningGoal })
          .eq("id", worksheetId);
        break;
      }
      case "chat_toggle": {
        await supabase
          .from("worksheets")
          .update({ chat_active: action.enabled })
          .eq("id", worksheetId);
        break;
      }
      case "chat_pause": {
        await supabase
          .from("worksheets")
          .update({ chat_paused: action.paused })
          .eq("id", worksheetId);
        break;
      }
      case "chat_message": {
        const submissionId =
          !action.isTeacher && action.senderName
            ? await findOrCreateSubmissionId(
                supabase,
                worksheetId,
                action.senderName,
                action.studentToken,
                options?.actorAuthUserId,
              )
            : null;

        await supabase.from("chat_messages").insert({
          id: action.id,
          worksheet_id: worksheetId,
          submission_id: submissionId,
          sender_name: action.senderName,
          content: action.content,
          is_teacher: Boolean(action.isTeacher),
          is_anonymous: Boolean(action.isAnonymous),
        });
        break;
      }
      case "chat_pin": {
        await supabase
          .from("chat_messages")
          .update({ is_pinned: action.pinned })
          .eq("id", action.id);
        break;
      }
      case "chat_delete": {
        await supabase
          .from("chat_messages")
          .update({ is_deleted: true })
          .eq("id", action.id);
        break;
      }
      case "chat_clear": {
        await supabase
          .from("chat_messages")
          .delete()
          .eq("worksheet_id", worksheetId);
        break;
      }
      case "help_request": {
        const submissionId = await findOrCreateSubmissionId(
          supabase,
          worksheetId,
          action.studentName,
          action.studentToken,
          options?.actorAuthUserId,
        );

        if (submissionId) {
          const existing = await supabase
            .from("help_requests")
            .select("id")
            .eq("worksheet_id", worksheetId)
            .eq("submission_id", submissionId)
            .eq("question_id", action.questionLabel)
            .is("resolved_at", null)
            .limit(1)
            .maybeSingle<{ id: string }>();

          if (!existing.data?.id) {
            await supabase.from("help_requests").insert({
              worksheet_id: worksheetId,
              submission_id: submissionId,
              question_id: action.questionLabel,
            });
          }
        }
        break;
      }
      case "resolve_help": {
        await supabase
          .from("help_requests")
          .update({ resolved_at: new Date().toISOString() })
          .eq("id", action.id);
        break;
      }
      case "vote_open": {
        await closeActiveVotes(supabase, worksheetId);

        await supabase.from("votes").insert({
          worksheet_id: worksheetId,
          type: action.voteType,
          question: action.question,
          options: action.options,
          is_result_public: action.isResultPublic,
          is_active: true,
        });
        break;
      }
      case "vote_close": {
        const voteId = await findActiveVoteId(supabase, worksheetId);
        if (voteId) {
          await supabase
            .from("votes")
            .update({ is_active: false, ended_at: new Date().toISOString() })
            .eq("id", voteId);
        }
        break;
      }
      case "vote_cast": {
        const voteId = await findActiveVoteId(supabase, worksheetId);
        if (voteId && action.studentName) {
          const submissionId = await findOrCreateSubmissionId(
            supabase,
            worksheetId,
            action.studentName,
            action.studentToken,
            options?.actorAuthUserId,
          );

          if (submissionId) {
            await supabase.from("vote_responses").upsert(
              {
                vote_id: voteId,
                submission_id: submissionId,
                response:
                  typeof action.response === "number"
                    ? action.response
                    : { value: action.response },
              },
              { onConflict: "vote_id,submission_id" },
            );
          }
        }
        break;
      }
      case "gallery_toggle": {
        await supabase
          .from("worksheets")
          .update({ gallery_open: action.open })
          .eq("id", worksheetId);
        break;
      }
      case "gallery_anonymous": {
        await supabase
          .from("worksheets")
          .update({ gallery_anonymous: action.enabled })
          .eq("id", worksheetId);
        break;
      }
      case "gallery_filter": {
        await supabase
          .from("worksheets")
          .update({ gallery_filter_question: action.questionId })
          .eq("id", worksheetId);
        break;
      }
      case "gallery_card": {
        await supabase
          .from("submissions")
          .update({ is_gallery_visible: action.visible })
          .eq("id", action.submissionId);
        break;
      }
      case "gallery_project": {
        await supabase
          .from("submissions")
          .update({ is_projected: action.projected })
          .eq("id", action.submissionId);
        break;
      }
      case "reaction": {
        const reactorSubmissionId = action.studentName
          ? await findOrCreateSubmissionId(
              supabase,
              worksheetId,
              action.studentName,
              action.studentToken,
              options?.actorAuthUserId,
            )
          : null;

        if (reactorSubmissionId) {
          await supabase.from("gallery_reactions").upsert(
            {
              submission_id: action.submissionId,
              reactor_submission_id: reactorSubmissionId,
              emoji: action.emoji,
            },
            { onConflict: "submission_id,reactor_submission_id,emoji" },
          );
        }
        break;
      }
      case "session_mode": {
        await supabase
          .from("worksheets")
          .update({ session_mode: action.mode })
          .eq("id", worksheetId);
        break;
      }
      case "join_group": {
        if (action.studentName) {
          const submissionId = await findOrCreateSubmissionId(
            supabase,
            worksheetId,
            action.studentName,
            action.studentToken,
            options?.actorAuthUserId,
          );
          if (submissionId) {
            await supabase
              .from("submissions")
              .update({ group_id: action.groupId })
              .eq("id", submissionId);
          }
        }
        break;
      }
      case "assign_group": {
        await supabase
          .from("submissions")
          .update({ group_id: action.groupId })
          .eq("id", action.submissionId);
        break;
      }
      case "writing_lock": {
        await supabase
          .from("worksheets")
          .update({ is_locked: action.locked })
          .eq("id", worksheetId);
        break;
      }
      case "chat_mute": {
        await supabase
          .from("submissions")
          .update({ chat_muted: action.muted })
          .eq("id", action.submissionId);
        break;
      }
      case "student_lock": {
        await supabase
          .from("submissions")
          .update({ writing_locked: action.locked })
          .eq("id", action.submissionId);
        break;
      }
      case "chat_anonymous_mode": {
        await supabase
          .from("worksheets")
          .update({ chat_anonymous_mode: action.enabled })
          .eq("id", worksheetId);
        break;
      }
      case "vote_result_toggle": {
        const voteId = await findActiveVoteId(supabase, worksheetId);
        if (voteId) {
          await supabase
            .from("votes")
            .update({ is_result_public: action.isResultPublic })
            .eq("id", voteId);
        }
        break;
      }
      case "session_close": {
        const voteId = await findLatestVoteId(supabase, worksheetId);

        await supabase
          .from("worksheets")
          .update({
            is_active: false,
            is_locked: true,
            chat_active: false,
            timer_active: false,
            timer_end_at: null,
            focus_mode: false,
          })
          .eq("id", worksheetId);

        if (voteId) {
          await supabase
            .from("votes")
            .update({ is_active: false, ended_at: new Date().toISOString() })
            .eq("id", voteId);
        }

        await supabase.from("chat_messages").delete().eq("worksheet_id", worksheetId);
        break;
      }
      case "session_code_change": {
        await supabase
          .from("worksheets")
          .update({ session_code: action.newCode.trim().toUpperCase() })
          .eq("id", worksheetId);
        break;
      }
      case "set_projection": {
        await supabase
          .from("worksheets")
          .update({ 
            projected_type: action.projectedType,
            projected_target_id: action.targetId || null
          })
          .eq("id", worksheetId);
        break;
      }
      case "remove_student": {
        // 학생 관련 모든 데이터 삭제 (DB 제약 조건에 따라 순서 중요할 수 있음)
        await supabase.from("presence_sessions").delete().eq("submission_id", action.submissionId);
        await supabase.from("help_requests").delete().eq("submission_id", action.submissionId);
        await supabase.from("chat_messages").delete().eq("submission_id", action.submissionId);
        await supabase.from("vote_responses").delete().eq("submission_id", action.submissionId);
        await supabase.from("gallery_reactions").delete().eq("submission_id", action.submissionId);
        await supabase.from("gallery_reactions").delete().eq("reactor_submission_id", action.submissionId);
        
        // 최종적으로 submission 삭제
        await supabase.from("submissions").delete().eq("id", action.submissionId);
        break;
      }
      default:

        break;
    }

    return { ok: true as const, mode: "supabase" as const };
  } catch {
    return { ok: true as const, mode: "fallback" as const };
  }
}
