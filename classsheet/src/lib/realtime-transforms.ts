import type {
  ActiveVote,
  ChatMessage,
  GalleryCard,
  PresenceStatus,
  StudentSubmissionSummary,
  VoteSummary,
  VoteType,
  WorksheetComponent,
} from "@/lib/types/domain";
import { decodeTimerSeconds } from "@/lib/timer-state";

// Row types matching Supabase DB columns — no server-only restriction
export interface WorksheetRow {
  id: string;
  title: string;
  description: string | null;
  components: unknown;
  session_code: string;
  is_active: boolean;
  gallery_open: boolean;
  gallery_filter_question: string | null;
  gallery_anonymous: boolean;
  is_locked: boolean;
  timer_end_at: string | null;
  timer_active: boolean;
  focus_mode: boolean;
  chat_active: boolean;
  chat_paused: boolean | null;
  chat_anonymous_mode: boolean | null;
  session_mode: string;
  current_page: number | null;
  page_lock_enabled: boolean | null;
  learning_goal: string | null;
  projected_type: string | null;
  projected_target_id: string | null;
}

export interface SubmissionRow {
  id: string;
  worksheet_id: string;
  student_name: string;
  answers: Record<string, unknown> | null;
  is_submitted: boolean;
  is_gallery_visible: boolean;
  is_projected: boolean;
  group_id: string | null;
  chat_muted: boolean | null;
  writing_locked: boolean | null;
}

export interface ChatMessageRow {
  id: string;
  worksheet_id: string;
  sender_name: string;
  content: string;
  is_pinned: boolean;
  is_teacher: boolean;
  is_deleted: boolean;
  is_anonymous: boolean;
  is_highlighted: boolean | null;
  highlighted_at: string | null;
}

export interface HelpRequestRow {
  id: string;
  worksheet_id: string;
  submission_id: string;
  question_id: string;
  created_at: string;
  resolved_at: string | null;
}

export interface VoteRow {
  id: string;
  worksheet_id: string;
  type: string;
  question: string;
  options: unknown;
  is_result_public: boolean;
  is_active: boolean;
}

export interface VoteResponseRow {
  vote_id: string;
  response: unknown; // JSONB — may be { value: string }, number, or string
}

/** Extract the display label from a Supabase JSONB vote response. */
export function extractVoteResponseValue(response: unknown): string {
  if (response == null) return "";
  if (typeof response === "object" && "value" in (response as Record<string, unknown>)) {
    return String((response as Record<string, unknown>).value);
  }
  return String(response);
}

export interface GalleryReactionRow {
  submission_id: string;
  emoji: string;
}

export interface GroupRow {
  id: string;
  name: string;
  icon: string;
  display_order?: number | null;
}

export interface PresenceRow {
  submission_id: string | null;
  status: string;
  last_seen_at: string | null;
}

// Helpers

function isFilledAnswer(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return Boolean(value);
}

function normalizeVoteOptions(type: string, options: unknown): string[] {
  const arr = Array.isArray(options)
    ? options.filter((o): o is string => typeof o === "string")
    : [];
  if (type === "ox") return arr.length > 0 ? arr : ["O", "X"];
  return arr;
}

const OFFLINE_THRESHOLD_MS = 120_000;

export function normalizePresenceStatus(value: string | null | undefined): PresenceStatus {
  if (value === "submitted") return "submitted";
  if (value === "idle") return "idle";
  if (value === "offline") return "offline";
  return "online";
}

export function presenceRowToStatus(row: PresenceRow): PresenceStatus {
  const isStale =
    row.last_seen_at !== null &&
    Date.now() - new Date(row.last_seen_at).getTime() > OFFLINE_THRESHOLD_MS;
  return isStale ? "offline" : normalizePresenceStatus(row.status);
}

// Transform functions

export function worksheetRowToPartialState(row: WorksheetRow) {
  const timerSecondsRemaining = decodeTimerSeconds(row.timer_end_at, row.timer_active);
  return {
    isActive: row.is_active,
    isLocked: row.is_locked,
    sessionClosed: !row.is_active && row.is_locked,
    timerSecondsRemaining,
    timerRunning: row.timer_active && timerSecondsRemaining > 0,
    focusMode: row.focus_mode,
    chatEnabled: row.chat_active,
    chatPaused: row.chat_paused ?? false,
    galleryOpen: row.gallery_open,
    galleryFilterQuestion: row.gallery_filter_question,
    anonymousGallery: row.gallery_anonymous,
    sessionMode: (row.session_mode === "group" ? "group" : "individual") as
      | "individual"
      | "group",
    currentPage: row.current_page ?? 1,
    pageLockEnabled: row.page_lock_enabled ?? true,
    chatAnonymousMode: row.chat_anonymous_mode ?? false,
    learningGoal: row.learning_goal ?? "",
    projectedType: row.projected_type,
    projectedTargetId: row.projected_target_id,
  };
}

export function submissionRowToStudent(
  row: SubmissionRow,
  existing: StudentSubmissionSummary | undefined,
  answerableComponents: WorksheetComponent[],
): StudentSubmissionSummary {
  const answers = row.answers ?? {};
  const completedAnswers = Object.values(answers).filter(isFilledAnswer).length;
  const progress =
    answerableComponents.length > 0
      ? Math.round((completedAnswers / answerableComponents.length) * 100)
      : 0;
  const nextQuestion =
    answerableComponents.find((c) => !isFilledAnswer(answers[c.id]))?.title ?? "제출 준비";
  const status: PresenceStatus = row.is_submitted ? "submitted" : existing?.status ?? "online";

  const formattedAnswers = answerableComponents
    .map((c) => {
      const val = answers[c.id];
      if (!isFilledAnswer(val)) return null;
      const isDrawing = c.type === "drawing";
      const isChoice = c.type === "single_choice" || c.type === "multi_choice" || c.type === "ox";
      return {
        componentId: c.id,
        questionTitle: c.title,
        componentType: c.type,
        textValue: !isDrawing && !isChoice && typeof val === "string" ? val : undefined,
        choiceValues: isChoice
          ? Array.isArray(val)
            ? val.filter((v): v is string => typeof v === "string")
            : [String(val)]
          : undefined,
        imageUrl: isDrawing && typeof val === "string" ? val : undefined,
      };
    })
    .filter((a): a is NonNullable<typeof a> => a !== null);

  return {
    id: row.id,
    studentName: row.student_name,
    progress,
    submitted: row.is_submitted,
    status,
    groupId: row.group_id,
    currentQuestion: row.is_submitted ? "제출 완료" : nextQuestion,
    chatMuted: row.chat_muted ?? false,
    writingLocked: row.writing_locked ?? false,
    answers: formattedAnswers,
  };
}

export function chatMessageRowToMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    senderName: row.sender_name,
    content: row.content,
    isPinned: row.is_pinned,
    isTeacher: row.is_teacher,
    isAnonymous: row.is_anonymous,
    isHighlighted: row.is_highlighted ?? false,
    highlightedAt: row.highlighted_at,
  };
}

export function voteRowToActiveVote(row: VoteRow): ActiveVote | null {
  if (!row.is_active) return null;
  return {
    id: row.id,
    type: row.type as VoteType,
    question: row.question,
    options: normalizeVoteOptions(row.type, row.options),
    isResultPublic: row.is_result_public,
    isActive: true,
  };
}

export function voteRowToSummary(
  row: VoteRow,
  responseCount: number,
  totalCount: number,
): VoteSummary {
  const options = normalizeVoteOptions(row.type, row.options);
  return {
    id: row.id,
    type: row.type as VoteType,
    question: row.question,
    results: options.map((label) => ({ label, value: 0 })),
    responseCount,
    totalCount,
    isActive: row.is_active,
    isResultPublic: row.is_result_public,
  };
}

export function submissionRowToGalleryCard(
  row: SubmissionRow,
  components: WorksheetComponent[],
  filterQuestionId: string | null,
  anonymousLabel: string,
  existingReactions?: GalleryCard["reactions"],
  isProjected = row.is_projected,
): GalleryCard {
  const answers = row.answers ?? {};
  const answerEntries = Object.entries(answers);
  const entriesToSearch = filterQuestionId
    ? answerEntries.filter(([id]) => id === filterQuestionId)
    : answerEntries;

  let excerpt = "아직 공개할 답안이 없습니다.";
  let imageUrl: string | undefined = undefined;
  let questionId: string | null = filterQuestionId;
  let qTitle = filterQuestionId
    ? components.find((c) => c.id === filterQuestionId)?.title ?? "질문"
    : null;

  for (const [compId, val] of entriesToSearch) {
    if (!isFilledAnswer(val)) continue;

    const component = components.find((c) => c.id === compId);
    const title = component?.title ?? "질문";

    if (Array.isArray(val)) {
      const text = val.filter((v): v is string => typeof v === "string").join(", ");
      if (text) {
        excerpt = text;
        questionId = compId;
        qTitle = title;
        break;
      }
    } else if (typeof val === "string") {
      if (val.startsWith("http") && (val.includes("://") || val.includes("base64"))) {
        excerpt = title;
        imageUrl = val;
      } else {
        excerpt = val;
      }
      questionId = compId;
      qTitle = title;
      break;
    }
  }

  return {
    id: row.id,
    displayName: row.student_name,
    anonymousLabel,
    excerpt,
    imageUrl,
    questionId,
    questionTitle: qTitle,
    reactions: existingReactions ?? { thumbsUp: 0, heart: 0, wow: 0, laugh: 0 },
    visible: row.is_gallery_visible,
    isProjected,
  };
}

export function studentToGalleryCard(
  student: StudentSubmissionSummary,
  components: WorksheetComponent[],
  filterQuestionId: string | null,
  anonymousLabel: string,
  visible: boolean,
  existingReactions?: GalleryCard["reactions"],
  isProjected = false,
): GalleryCard {
  const answerDetails = student.answers ?? [];
  const entriesToSearch = filterQuestionId
    ? answerDetails.filter((a) => a.componentId === filterQuestionId)
    : answerDetails;

  let excerpt = "아직 공개할 답안이 없습니다.";
  let imageUrl: string | undefined = undefined;
  let questionId: string | null = filterQuestionId;
  let qTitle = filterQuestionId
    ? components.find((c) => c.id === filterQuestionId)?.title ?? "질문"
    : null;

  for (const detail of entriesToSearch) {
    if (detail.choiceValues && detail.choiceValues.length > 0) {
      excerpt = detail.choiceValues.join(", ");
      questionId = detail.componentId;
      qTitle = detail.questionTitle;
      break;
    } else if (detail.imageUrl) {
      excerpt = detail.questionTitle;
      imageUrl = detail.imageUrl;
      questionId = detail.componentId;
      qTitle = detail.questionTitle;
      break;
    } else if (detail.textValue) {
      excerpt = detail.textValue;
      questionId = detail.componentId;
      qTitle = detail.questionTitle;
      break;
    }
  }

  return {
    id: student.id,
    displayName: student.studentName,
    anonymousLabel,
    excerpt,
    imageUrl,
    questionId,
    questionTitle: qTitle,
    reactions: existingReactions ?? { thumbsUp: 0, heart: 0, wow: 0, laugh: 0 },
    visible,
    isProjected,
  };
}
