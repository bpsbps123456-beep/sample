import "server-only";

import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { decodeTimerSeconds } from "@/lib/timer-state";
import type {
  ActiveVote,
  FontSizeMode,
  GalleryCard,
  Group,
  HelpRequest,
  PresenceStatus,
  StudentAnswerDetail,
  VoteSummary,
  VoteType,
  Worksheet,
  WorksheetComponent,
  WorksheetComponentType,
} from "@/lib/types/domain";

interface WorksheetRow {
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

interface GroupRow {
  id: string;
  name: string;
  icon: string;
  display_order?: number | null;
}

interface SubmissionRow {
  id: string;
  student_name: string;
  answers: Record<string, unknown> | null;
  is_submitted: boolean;
  is_gallery_visible: boolean;
  is_projected: boolean;
  group_id: string | null;
  chat_muted: boolean | null;
  writing_locked: boolean | null;
}

interface HelpRequestRow {
  id: string;
  question_id: string;
  created_at: string;
  submissions: { id: string; student_name: string } | { id: string; student_name: string }[] | null;
}

interface ChatMessageRow {
  id: string;
  sender_name: string;
  content: string;
  is_pinned: boolean;
  is_teacher: boolean;
  is_deleted: boolean;
  is_anonymous: boolean;
  is_highlighted: boolean | null;
  highlighted_at: string | null;
}

interface VoteRow {
  id: string;
  type: VoteType;
  question: string;
  options: unknown;
  is_result_public: boolean;
  is_active: boolean;
}

interface VoteResponseRow {
  response: unknown;
}

interface GalleryReactionRow {
  submission_id: string;
  emoji: string;
}

interface PresenceRow {
  submission_id: string | null;
  status: string;
  last_seen_at: string | null;
}

export interface WorksheetListItem {
  id: string;
  title: string;
  description: string;
  sessionCode: string;
  mode: "individual" | "group";
  currentPage: number;
  updatedAtLabel: string;
  isTemplate: boolean;
}

const EMPTY_VOTE_SUMMARY: VoteSummary = {
  id: "no-vote",
  type: "choice",
  question: "진행 중인 투표가 없습니다.",
  results: [],
  responseCount: 0,
  totalCount: 0,
  isActive: false,
  isResultPublic: false,
};

function isComponentType(value: string): value is WorksheetComponentType {
  return [
    "prompt",
    "short_text",
    "long_text",
    "drawing",
    "single_choice",
    "multi_choice",
    "divider",
    "ox",
  ].includes(value);
}

function parseComponents(input: unknown): WorksheetComponent[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.reduce<WorksheetComponent[]>((accumulator, item) => {
    if (!item || typeof item !== "object") {
      return accumulator;
    }

    const candidate = item as Record<string, unknown>;
    const type = typeof candidate.type === "string" ? candidate.type : "prompt";

    if (!isComponentType(type)) {
      return accumulator;
    }

    const FONT_SIZES: FontSizeMode[] = ["sm", "md", "lg"];
    const titleFontSize = FONT_SIZES.includes(candidate.titleFontSize as FontSizeMode)
      ? (candidate.titleFontSize as FontSizeMode)
      : undefined;
    const bodyFontSize = FONT_SIZES.includes(candidate.bodyFontSize as FontSizeMode)
      ? (candidate.bodyFontSize as FontSizeMode)
      : undefined;

    const base = {
      id: typeof candidate.id === "string" ? candidate.id : crypto.randomUUID(),
      type,
      page: typeof candidate.page === "number" ? candidate.page : 1,
      title:
        typeof candidate.title === "string"
          ? candidate.title
          : typeof candidate.label === "string"
            ? candidate.label
            : "질문",
      titleFontSize,
      description:
        typeof candidate.description === "string" ? candidate.description : undefined,
      bodyFontSize,
    };

    if (type === "prompt") {
      accumulator.push({
        ...base,
        type,
        body:
          typeof candidate.body === "string"
            ? candidate.body
            : typeof candidate.label === "string"
              ? candidate.label
              : "",
      });
      return accumulator;
    }

    if (type === "short_text" || type === "long_text") {
      accumulator.push({
        ...base,
        type,
        placeholder:
          typeof candidate.placeholder === "string" ? candidate.placeholder : undefined,
      });
      return accumulator;
    }

    if (type === "single_choice" || type === "multi_choice") {
      accumulator.push({
        ...base,
        type,
        options: Array.isArray(candidate.options)
          ? candidate.options.filter((option): option is string => typeof option === "string")
          : [],
      });
      return accumulator;
    }

    accumulator.push({ ...base, type });
    return accumulator;
  }, []);
}

function formatRelativeLabel(timestamp: string) {
  const diffSeconds = Math.max(
    0,
    Math.round((Date.now() - new Date(timestamp).getTime()) / 1000),
  );

  if (diffSeconds < 60) {
    return "방금 전";
  }

  const minutes = Math.round(diffSeconds / 60);
  return `${minutes}분 전`;
}

function normalizePresenceStatus(value: string | null | undefined): PresenceStatus {
  if (value === "submitted") {
    return "submitted";
  }
  if (value === "idle") {
    return "idle";
  }
  if (value === "offline") {
    return "offline";
  }
  return "online";
}

function normalizeVoteOptions(vote: VoteRow) {
  const options = Array.isArray(vote.options)
    ? vote.options.filter((option): option is string => typeof option === "string")
    : [];

  if (vote.type === "ox") {
    return options.length > 0 ? options : ["O", "X"];
  }

  if (vote.type === "slider") {
    return options.length > 0 ? options : ["1", "2", "3", "4", "5"];
  }

  return options;
}

function parseVoteResponse(response: unknown) {
  if (typeof response === "string" || typeof response === "number") {
    return response;
  }

  if (response && typeof response === "object") {
    const value = (response as Record<string, unknown>).value;
    if (typeof value === "string" || typeof value === "number") {
      return value;
    }
  }

  return null;
}

function buildVoteSummary(
  vote: VoteRow | null,
  responses: VoteResponseRow[],
  totalCount: number,
): VoteSummary {
  if (!vote) {
    return EMPTY_VOTE_SUMMARY;
  }

  const labels = normalizeVoteOptions(vote);
  const counts = new Map<string, number>(labels.map((label) => [label, 0]));

  for (const responseRow of responses) {
    const response = parseVoteResponse(responseRow.response);
    if (response === null) {
      continue;
    }

    const label = `${response}`;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  const results =
    labels.length > 0
      ? labels.map((label) => ({ label, value: counts.get(label) ?? 0 }))
      : Array.from(counts.entries()).map(([label, value]) => ({ label, value }));

  return {
    id: vote.id,
    type: vote.type,
    question: vote.question,
    results,
    responseCount: responses.length,
    totalCount,
    isActive: vote.is_active,
    isResultPublic: vote.is_result_public,
  };
}

function createActiveVote(vote: VoteRow | null): ActiveVote | null {
  if (!vote || !vote.is_active) {
    return null;
  }

  return {
    id: vote.id,
    type: vote.type,
    question: vote.question,
    options: normalizeVoteOptions(vote),
    isResultPublic: vote.is_result_public,
    isActive: vote.is_active,
  };
}

function isFilledAnswer(value: unknown) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return Boolean(value);
}

function buildQuestionPreview(
  answers: Record<string, unknown> | null,
  components: WorksheetComponent[],
  filterQuestionId: string | null,
) {
  const answerEntries = Object.entries(answers ?? {});
  const entriesToSearch = filterQuestionId
    ? answerEntries.filter(([componentId]) => componentId === filterQuestionId)
    : answerEntries;

  for (const [componentId, rawValue] of entriesToSearch) {
    if (!isFilledAnswer(rawValue)) {
      continue;
    }

    const component = components.find((item) => item.id === componentId);
    const questionTitle = component?.title ?? "질문";

    if (Array.isArray(rawValue)) {
      const text = rawValue.filter((value): value is string => typeof value === "string").join(", ");
      if (text) {
        return {
          excerpt: text,
          imageUrl: undefined,
          questionId: componentId,
          questionTitle,
        };
      }
      continue;
    }

    if (typeof rawValue === "string") {
      if (rawValue.startsWith("http://") || rawValue.startsWith("https://")) {
        return {
          excerpt: questionTitle,
          imageUrl: rawValue,
          questionId: componentId,
          questionTitle,
        };
      }

      return {
        excerpt: rawValue,
        imageUrl: undefined,
        questionId: componentId,
        questionTitle,
      };
    }
  }

  return {
    excerpt: "아직 공개할 답안이 없습니다.",
    imageUrl: undefined,
    questionId: filterQuestionId,
    questionTitle: filterQuestionId
      ? components.find((component) => component.id === filterQuestionId)?.title ?? "질문"
      : null,
  };
}

function buildWorksheetFromRows(input: {
  worksheet: WorksheetRow;
  groups: GroupRow[];
  submissions: SubmissionRow[];
  helpRequests: HelpRequestRow[];
  chatMessages: ChatMessageRow[];
  vote: VoteRow | null;
  voteResponses: VoteResponseRow[];
  reactions: GalleryReactionRow[];
  presence: PresenceRow[];
}): Worksheet {
  const components = parseComponents(input.worksheet.components);
  const componentMap = new Map(components.map((component) => [component.id, component]));
  const answerableComponents = components.filter(
    (component) => component.type !== "prompt" && component.type !== "divider",
  );
  const totalPages = Math.max(1, ...components.map((component) => component.page));
  const presenceMap = new Map<string, PresenceStatus>();
  const OFFLINE_THRESHOLD_MS = 120_000;
  const now = Date.now();

  for (const row of input.presence) {
    if (row.submission_id) {
      const isStale =
        row.last_seen_at !== null &&
        now - new Date(row.last_seen_at).getTime() > OFFLINE_THRESHOLD_MS;
      const status = isStale ? "offline" : normalizePresenceStatus(row.status);
      presenceMap.set(row.submission_id, status);
    }
  }

  const groups: Group[] = [...input.groups]
    .sort((left, right) => (left.display_order ?? 0) - (right.display_order ?? 0))
    .map((group) => ({
      id: group.id,
      name: group.name,
      icon: group.icon,
      count: input.submissions.filter((submission) => submission.group_id === group.id).length,
    }));

  const students = input.submissions.map((submission) => {
    const answerEntries = Object.values(submission.answers ?? {});
    const completedAnswers = answerEntries.filter(isFilledAnswer).length;
    const progress =
      answerableComponents.length > 0
        ? Math.round((completedAnswers / answerableComponents.length) * 100)
        : 0;
    const nextQuestion =
      answerableComponents.find((component) => !isFilledAnswer(submission.answers?.[component.id]))
        ?.title ?? "제출 준비";
    const status = submission.is_submitted
      ? "submitted"
      : presenceMap.get(submission.id) ?? "online";

    const answers: StudentAnswerDetail[] = Object.entries(submission.answers ?? {}).flatMap(
      ([componentId, rawValue]) => {
        const component = componentMap.get(componentId);
        if (!component) {
          return [];
        }

        const detail: StudentAnswerDetail = {
          componentId,
          questionTitle: component.title,
          componentType: component.type,
        };

        if (Array.isArray(rawValue)) {
          detail.choiceValues = rawValue.filter(
            (value): value is string => typeof value === "string",
          );
        } else if (typeof rawValue === "string") {
          if (rawValue.startsWith("http://") || rawValue.startsWith("https://")) {
            detail.imageUrl = rawValue;
          } else {
            detail.textValue = rawValue;
          }
        }

        return [detail];
      },
    );

    return {
      id: submission.id,
      studentName: submission.student_name,
      progress,
      submitted: submission.is_submitted,
      status,
      groupId: submission.group_id,
      currentQuestion: submission.is_submitted ? "제출 완료" : nextQuestion,
      answers,
      chatMuted: submission.chat_muted ?? false,
      writingLocked: submission.writing_locked ?? false,
    };
  });

  const helpRequests: HelpRequest[] = input.helpRequests.map((request) => {
    const submissionInfo = Array.isArray(request.submissions)
      ? request.submissions[0]
      : request.submissions;

    return {
      id: request.id,
      submissionId: submissionInfo?.id ?? "",
      studentName: submissionInfo?.student_name ?? "학생",
      questionLabel: request.question_id,
      createdAtLabel: formatRelativeLabel(request.created_at),
    };
  });

  const reactionMap = new Map<string, GalleryCard["reactions"]>();
  for (const submission of input.submissions) {
    reactionMap.set(submission.id, { thumbsUp: 0, heart: 0, wow: 0, laugh: 0 });
  }

  for (const reaction of input.reactions) {
    const entry = reactionMap.get(reaction.submission_id);
    if (!entry) {
      continue;
    }

    if (reaction.emoji === "👍") {
      entry.thumbsUp += 1;
    }
    if (reaction.emoji === "❤️") {
      entry.heart += 1;
    }
    if (reaction.emoji === "😮") {
      entry.wow += 1;
    }
    if (reaction.emoji === "😂") {
      entry.laugh += 1;
    }
  }

  const galleryCards: GalleryCard[] = input.submissions.map((submission, index) => {
    const preview = buildQuestionPreview(
      submission.answers,
      components,
      input.worksheet.gallery_filter_question,
    );

    return {
      id: submission.id,
      displayName: submission.student_name,
      anonymousLabel: `친구 ${index + 1}`,
      excerpt: preview.excerpt,
      imageUrl: preview.imageUrl,
      questionId: preview.questionId,
      questionTitle: preview.questionTitle,
      reactions: reactionMap.get(submission.id) ?? { thumbsUp: 0, heart: 0, wow: 0, laugh: 0 },
       visible: submission.is_gallery_visible,
      isProjected: submission.is_projected,
    };
  });

  const voteSummary = buildVoteSummary(input.vote, input.voteResponses, students.length);
  const activeVote = createActiveVote(input.vote);

  return {
    id: input.worksheet.id,
    sessionCode: input.worksheet.session_code,
    title: input.worksheet.title,
    subject: input.worksheet.title.split(" ")[0] || "수업",
    description: input.worksheet.description ?? "",
    learningGoal: input.worksheet.learning_goal ?? "",
    mode: input.worksheet.session_mode === "group" ? "group" : "individual",
    currentPage: input.worksheet.current_page ?? 1,
    totalPages,
    pageLockEnabled: input.worksheet.page_lock_enabled ?? true,
    isActive: input.worksheet.is_active,
    isLocked: input.worksheet.is_locked,
    sessionClosed: !input.worksheet.is_active && input.worksheet.is_locked,
    timerSecondsRemaining: decodeTimerSeconds(input.worksheet.timer_end_at, input.worksheet.timer_active),
    timerRunning: input.worksheet.timer_active,
    timerEndAt: input.worksheet.timer_end_at,
    chatEnabled: input.worksheet.chat_active,
    chatPaused: input.worksheet.chat_paused ?? false,
    focusMode: input.worksheet.focus_mode,
    galleryOpen: input.worksheet.gallery_open,
    galleryFilterQuestion: input.worksheet.gallery_filter_question,
    anonymousGallery: input.worksheet.gallery_anonymous,
    activeVote,
    activeVoteResultPublic: activeVote?.isResultPublic ?? voteSummary.isResultPublic ?? false,
    components,
    groups,
    students,
    helpRequests,
    chatMessages: [...input.chatMessages]
      .reverse()
      .filter((message) => !message.is_deleted)
      .map((message) => ({
        id: message.id,
        senderName: message.sender_name,
        content: message.content,
        isPinned: message.is_pinned,
        isTeacher: message.is_teacher,
        isAnonymous: message.is_anonymous,
        isHighlighted: message.is_highlighted ?? false,
        highlightedAt: message.highlighted_at,
      })),
    voteSummary,
    galleryCards,
    chatAnonymousMode: input.worksheet.chat_anonymous_mode ?? false,
    projectedType: input.worksheet.projected_type,
    projectedTargetId: input.worksheet.projected_target_id,
  };
}

async function fetchWorksheetByField(
  field: "id" | "session_code",
  value: string,
  options?: { trusted?: boolean },
): Promise<Worksheet | null> {
  const supabase =
    options?.trusted
      ? createSupabaseAdminClient() ?? (await createSupabaseServerClient())
      : await createSupabaseServerClient();

  if (!supabase) {
    console.error("[fetchWorksheet] no supabase client available, trusted:", options?.trusted);
    return null;
  }

  const worksheetQuery = await supabase
    .from("worksheets")
    .select(
      "id, title, description, components, session_code, is_active, gallery_open, gallery_filter_question, gallery_anonymous, is_locked, timer_end_at, timer_active, focus_mode, chat_active, chat_paused, chat_anonymous_mode, session_mode, current_page, page_lock_enabled, learning_goal, projected_type, projected_target_id",
    )
    .eq(field, value)
    .maybeSingle<WorksheetRow>();

  if (worksheetQuery.error || !worksheetQuery.data) {
    console.error("[fetchWorksheet] query failed for", field, "=", value, "error:", worksheetQuery.error);
    return null;
  }

  const worksheet = worksheetQuery.data;

  const start = Date.now();
  const [
    groupsResult,
    submissionsResult,
    helpResult,
    chatResult,
    voteResult,
    presenceResult,
  ] = await Promise.all([
    supabase
      .from("groups")
      .select("id, name, icon, display_order")
      .eq("worksheet_id", worksheet.id)
      .returns<GroupRow[]>(),
    supabase
      .from("submissions")
      .select("id, student_name, answers, is_submitted, is_gallery_visible, is_projected, group_id, chat_muted, writing_locked")
      .eq("worksheet_id", worksheet.id)
      .returns<SubmissionRow[]>(),
    supabase
      .from("help_requests")
      .select("id, question_id, created_at, submissions(id, student_name)")
      .eq("worksheet_id", worksheet.id)
      .is("resolved_at", null)
      .returns<HelpRequestRow[]>(),
    supabase
      .from("chat_messages")
      .select("id, sender_name, content, is_pinned, is_teacher, is_deleted, is_anonymous, is_highlighted, highlighted_at")
      .eq("worksheet_id", worksheet.id)
      .order("created_at", { ascending: false })
      .limit(200)
      .returns<ChatMessageRow[]>(),
    supabase
      .from("votes")
      .select("id, type, question, options, is_result_public, is_active")
      .eq("worksheet_id", worksheet.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<VoteRow>(),
    supabase
      .from("presence_sessions")
      .select("submission_id, status, last_seen_at")
      .eq("worksheet_id", worksheet.id)
      .returns<PresenceRow[]>(),
  ]);

  console.log("[fetchWorksheet] Basic queries finished. Duration:", Date.now() - start, "ms. Starting reactions/votes...");
  
  const mid = Date.now();
  const submissionIds = (submissionsResult.data ?? []).map((submission) => submission.id);
  const [reactionResult, voteResponsesResult] = await Promise.all([
    submissionIds.length > 0
      ? supabase
          .from("gallery_reactions")
          .select("submission_id, emoji")
          .in("submission_id", submissionIds)
          .returns<GalleryReactionRow[]>()
      : Promise.resolve({ data: [], error: null }),
    voteResult.data
      ? supabase
          .from("vote_responses")
          .select("response")
          .eq("vote_id", voteResult.data.id)
          .returns<VoteResponseRow[]>()
      : Promise.resolve({ data: [], error: null }),
  ]);

  console.log("[fetchWorksheet] Total duration:", Date.now() - start, "ms (Sub-queries:", Date.now() - mid, "ms)");

  return buildWorksheetFromRows({
    worksheet,
    groups: groupsResult.data ?? [],
    submissions: submissionsResult.data ?? [],
    helpRequests: helpResult.data ?? [],
    chatMessages: chatResult.data ?? [],
    vote: voteResult.data ?? null,
    voteResponses: voteResponsesResult.data ?? [],
    reactions: reactionResult.data ?? [],
    presence: presenceResult.data ?? [],
  });
}

export async function getWorksheetById(id: string, options?: { trusted?: boolean }) {
  return fetchWorksheetByField("id", id, options);
}

export async function getWorksheetBySessionCode(
  code: string,
  options?: { trusted?: boolean },
) {
  return fetchWorksheetByField("session_code", code, options);
}

export async function listWorksheets(
  options?: { trusted?: boolean },
): Promise<WorksheetListItem[]> {
  const supabase =
    options?.trusted
      ? createSupabaseAdminClient() ?? (await createSupabaseServerClient())
      : await createSupabaseServerClient();

  if (!supabase) {
    return [];
  }

  const result = await supabase
    .from("worksheets")
    .select("id, title, description, session_code, session_mode, current_page, created_at")
    .order("created_at", { ascending: false })
    .returns<
      Array<{
        id: string;
        title: string;
        description: string | null;
        session_code: string;
        session_mode: string;
        current_page: number | null;
        created_at: string;
      }>
    >();

  return (result.data ?? []).map((worksheet) => ({
    id: worksheet.id,
    title: worksheet.title,
    description: worksheet.description ?? "설명이 없습니다.",
    sessionCode: worksheet.session_code,
    mode: worksheet.session_mode === "group" ? "group" : "individual",
    currentPage: worksheet.current_page ?? 1,
    updatedAtLabel: formatRelativeLabel(worksheet.created_at),
    isTemplate: false,
  }));
}

export async function listTemplates(
  options?: { trusted?: boolean },
): Promise<WorksheetListItem[]> {
  const supabase =
    options?.trusted
      ? createSupabaseAdminClient() ?? (await createSupabaseServerClient())
      : await createSupabaseServerClient();

  if (!supabase) {
    return [];
  }

  const result = await supabase
    .from("worksheets")
    .select("id, title, description, session_code, session_mode, current_page, created_at")
    .order("created_at", { ascending: false })
    .limit(0)
    .returns<
      Array<{
        id: string;
        title: string;
        description: string | null;
        session_code: string;
        session_mode: string;
        current_page: number | null;
        created_at: string;
      }>
    >();

  return (result.data ?? []).map((worksheet) => ({
    id: worksheet.id,
    title: worksheet.title,
    description: worksheet.description ?? "설명이 없습니다.",
    sessionCode: worksheet.session_code,
    mode: worksheet.session_mode === "group" ? "group" : "individual",
    currentPage: worksheet.current_page ?? 1,
    updatedAtLabel: formatRelativeLabel(worksheet.created_at),
    isTemplate: true,
  }));
}
