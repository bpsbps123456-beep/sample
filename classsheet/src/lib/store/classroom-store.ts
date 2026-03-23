"use client";

import { create } from "zustand";

import type { ClassroomSyncAction } from "@/lib/types/classroom-actions";
import type {
  ActiveVote,
  ChatMessage,
  GalleryCard,
  Group,
  HelpRequest,
  StudentSubmissionSummary,
  VoteType,
  VoteSummary,
  Worksheet,
  WorksheetComponent,
} from "@/lib/types/domain";
import type {
  ChatMessageRow,
  GalleryReactionRow,
  GroupRow,
  HelpRequestRow,
  PresenceRow,
  SubmissionRow,
  VoteRow,
  WorksheetRow,
} from "@/lib/realtime-transforms";
import {
  presenceRowToStatus,
  submissionRowToStudent,
  submissionRowToGalleryCard,
  studentToGalleryCard,
  voteRowToActiveVote,
  voteRowToSummary,
  worksheetRowToPartialState,
} from "@/lib/realtime-transforms";

type ReactionKind = "thumbsUp" | "heart" | "wow" | "laugh";

const EMOJI_BY_REACTION: Record<ReactionKind, "👍" | "❤️" | "😮" | "😂"> = {
  thumbsUp: "👍",
  heart: "❤️",
  wow: "😮",
  laugh: "😂",
};

interface ClassroomState {
  worksheetId: string;
  sessionCode: string;
  worksheetTitle: string;
  subject: string;
  description: string;
  learningGoal: string;
  currentPage: number;
  totalPages: number;
  isActive: boolean;
  isLocked: boolean;
  timerSecondsRemaining: number;
  timerRunning: boolean;
  focusMode: boolean;
  chatEnabled: boolean;
  chatPaused: boolean;
  galleryOpen: boolean;
  galleryFilterQuestion: string | null;
  anonymousGallery: boolean;
  sessionMode: "individual" | "group";
  sessionClosed: boolean;
  students: StudentSubmissionSummary[];
  helpRequests: HelpRequest[];
  chatMessages: ChatMessage[];
  voteSummary: VoteSummary;
  activeVote: ActiveVote | null;
  galleryCards: GalleryCard[];
  groups: Group[];
  components: WorksheetComponent[];
  initializeFromWorksheet: (worksheet: Worksheet) => void;
  registerStudent: (studentName: string, studentToken?: string) => void;
  syncAnswers: (
    studentName: string,
    answers: Record<string, string | string[]>,
    studentToken?: string,
  ) => void;
  updateStudentProgress: (
    studentName: string,
    progress: number,
    currentQuestion: string,
    studentToken?: string,
  ) => void;
  submitStudent: (studentName: string, studentToken?: string) => void;
  unsubmitStudent: (studentName: string, studentToken?: string) => void;
  startSession: () => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  setTimer: (seconds: number) => void;
  decideTimerTimeout: (decision: "lock" | "extend", seconds?: number) => void;
  toggleFocusMode: () => void;
  setCurrentPage: (page: number) => void;
  updateLearningGoal: (learningGoal: string) => void;
  toggleChat: () => void;
  toggleChatPaused: () => void;
  sendChatMessage: (
    senderName: string,
    content: string,
    isTeacher?: boolean,
    studentToken?: string,
  ) => void;
  toggleChatPinned: (id: string) => void;
  deleteChatMessage: (id: string) => void;
  clearChat: () => void;
  addHelpRequest: (studentName: string, questionLabel: string, studentToken?: string) => void;
  resolveHelpRequest: (id: string) => void;
  openVote: (type: VoteType) => void;
  closeVote: () => void;
  toggleVoteResultPublic: () => void;
  resetVote: () => void;
  castVote: (response: string | number, studentName?: string, studentToken?: string) => void;
  toggleGalleryOpen: () => void;
  toggleAnonymousGallery: () => void;
  setGalleryFilterQuestion: (questionId: string | null) => void;
  toggleGalleryCard: (id: string) => void;
  toggleGalleryProject: (id: string) => void;
  addReaction: (
    id: string,
    kind: ReactionKind,
    studentName?: string,
    studentToken?: string,
  ) => void;
  setSessionMode: (mode: "individual" | "group") => void;
  joinGroup: (groupId: string, studentName?: string, studentToken?: string) => void;
  assignStudentGroup: (submissionId: string, groupId: string) => void;
  chatAnonymousMode: boolean;
  toggleWritingLock: () => void;
  muteStudent: (submissionId: string, muted: boolean) => void;
  lockStudent: (submissionId: string, locked: boolean) => void;
  toggleChatAnonymousMode: () => void;
  changeSessionCode: (newCode: string) => void;
  closeSession: () => void;
  removeStudent: (submissionId: string) => void;
  handleWorksheetUpdate: (row: WorksheetRow) => void;
  handleSubmissionUpsert: (row: SubmissionRow) => void;
  handleSubmissionDelete: (id: string) => void;
  handleChatInsert: (row: ChatMessageRow) => void;
  handleChatUpdate: (row: ChatMessageRow) => void;
  handleChatDelete: (id: string) => void;
  handleHelpInsert: (row: HelpRequestRow) => void;
  handleHelpDelete: (id: string) => void;
  handleVoteUpsert: (row: VoteRow) => void;
  handleVoteResponseInsert: (voteId: string, response: string) => void;
  handleVoteResponseDelete: (voteId: string, response: string) => void;
  handleReactionInsert: (row: GalleryReactionRow) => void;
  handleGroupUpsert: (row: GroupRow) => void;
  handlePresenceUpsert: (row: PresenceRow) => void;
  projectedType?: string | null;
  projectedTargetId?: string | null;
  setProjection: (type: string | null, targetId?: string | null) => void;
  showChat: boolean;
  showTimer: boolean;
  showVote: boolean;
  toggleShowChat: () => void;
  toggleShowTimer: () => void;
  toggleShowVote: () => void;
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

let timerHandle: number | null = null;

function clearTimerHandle() {
  if (typeof window === "undefined") {
    timerHandle = null;
    return;
  }

  if (timerHandle) {
    window.clearInterval(timerHandle);
    timerHandle = null;
  }
}

/**
 * timer_end_at 절대 시각 기준으로 남은 시간을 계산해 매 틱마다 보정합니다.
 * timerEndAt이 없으면 단순 카운트다운 방식으로 fallback합니다.
 */
function startLocalTimer(
  setter: (updater: Partial<ClassroomState> | ((state: ClassroomState) => Partial<ClassroomState>)) => void,
  timerEndAt?: string | null,
) {
  clearTimerHandle();

  if (typeof window === "undefined") {
    return;
  }

  timerHandle = window.setInterval(() => {
    setter((state) => {
      // timer_end_at 절대 시각이 있으면 그것 기준으로 보정 계산
      const remaining = timerEndAt
        ? Math.max(0, Math.round((new Date(timerEndAt).getTime() - Date.now()) / 1000))
        : Math.max(0, state.timerSecondsRemaining - 1);

      if (remaining <= 0) {
        clearTimerHandle();
        return {
          timerSecondsRemaining: 0,
          timerRunning: false,
        };
      }

      return {
        timerSecondsRemaining: remaining,
      };
    });
  }, 1000);
}

function defaultVoteConfig(type: VoteType) {
  switch (type) {
    case "ox":
      return {
        question: "이 활동에서 가장 중요한 개념을 이해했나요?",
        options: ["O", "X"],
      };
    case "slider":
      return {
        question: "오늘 수업 이해도를 1부터 5까지 골라 주세요.",
        options: ["1", "2", "3", "4", "5"],
      };
    case "wordcloud":
      return {
        question: "오늘 수업을 한 단어로 표현해 주세요.",
        options: [],
      };
    case "choice":
    default:
      return {
        question: "오늘 가장 도움이 된 활동은 무엇이었나요?",
        options: ["설명 듣기", "실습 활동", "친구와 토론"],
      };
  }
}

function emptySnapshot() {
  return {
    worksheetId: "",
    sessionCode: "",
    worksheetTitle: "",
    subject: "",
    description: "",
    learningGoal: "",
    currentPage: 1,
    totalPages: 1,
    isActive: false,
    isLocked: false,
    timerSecondsRemaining: 0,
    timerRunning: false,
    focusMode: false,
    chatEnabled: false,
    chatPaused: false,
    galleryOpen: false,
    galleryFilterQuestion: null,
    anonymousGallery: true,
    sessionMode: "individual" as const,
    sessionClosed: false,
    students: [] as StudentSubmissionSummary[],
    helpRequests: [] as HelpRequest[],
    chatMessages: [] as ChatMessage[],
    voteSummary: EMPTY_VOTE_SUMMARY,
    activeVote: null as ActiveVote | null,
    galleryCards: [] as GalleryCard[],
    groups: [] as Group[],
    components: [] as WorksheetComponent[],
    chatAnonymousMode: false,
    projectedType: null,
    projectedTargetId: null,
    showChat: true,
    showTimer: false,
    showVote: false,
  };
}

function createClassroomSnapshot(worksheet: Worksheet) {
  return {
    worksheetId: worksheet.id,
    sessionCode: worksheet.sessionCode,
    worksheetTitle: worksheet.title,
    subject: worksheet.subject,
    description: worksheet.description,
    learningGoal: worksheet.learningGoal,
    currentPage: worksheet.currentPage,
    totalPages: worksheet.totalPages,
    isActive: worksheet.isActive,
    isLocked: worksheet.isLocked,
    timerSecondsRemaining: worksheet.timerSecondsRemaining,
    timerRunning: worksheet.timerRunning && worksheet.timerSecondsRemaining > 0,
    focusMode: worksheet.focusMode,
    chatEnabled: worksheet.chatEnabled,
    chatPaused: worksheet.chatPaused ?? false,
    galleryOpen: worksheet.galleryOpen,
    galleryFilterQuestion: worksheet.galleryFilterQuestion,
    anonymousGallery: worksheet.anonymousGallery,
    sessionMode: worksheet.mode,
    sessionClosed: worksheet.sessionClosed,
    students: worksheet.students,
    helpRequests: worksheet.helpRequests,
    chatMessages: worksheet.chatMessages,
    voteSummary: worksheet.voteSummary,
    activeVote: worksheet.activeVote,
    galleryCards: worksheet.galleryCards,
    groups: worksheet.groups,
    components: worksheet.components,
    chatAnonymousMode: worksheet.chatAnonymousMode ?? false,
    projectedType: worksheet.projectedType,
    projectedTargetId: worksheet.projectedTargetId,
  };
}

function ensureStudent(
  students: StudentSubmissionSummary[],
  studentName: string,
): StudentSubmissionSummary[] {
  if (students.some((student) => student.studentName === studentName)) {
    return students;
  }

  return [
    {
      id: `student-${studentName}`,
      studentName,
      progress: 0,
      submitted: false,
      status: "online",
      currentQuestion: "입장 완료",
    },
    ...students,
  ];
}

function syncClassroomAction(worksheetId: string, action: ClassroomSyncAction) {
  if (typeof window === "undefined" || !worksheetId) {
    return;
  }

  void fetch(`/api/classroom/${worksheetId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(action),
  }).catch(() => undefined);
}

export const useClassroomStore = create<ClassroomState>((set, get) => ({
  ...emptySnapshot(),
  initializeFromWorksheet: (worksheet) => {
    clearTimerHandle();
    const snapshot = createClassroomSnapshot(worksheet);
    set(snapshot);

    if (snapshot.timerRunning) {
      startLocalTimer(set, worksheet.timerEndAt);
    }
  },
  registerStudent: (studentName, studentToken) => {
    set((state) => ({
      students: ensureStudent(state.students, studentName).map<StudentSubmissionSummary>((student) =>
        student.studentName === studentName
          ? {
              ...student,
              status: student.submitted
                ? ("submitted" as StudentSubmissionSummary["status"])
                : ("online" as StudentSubmissionSummary["status"]),
            }
          : student,
      ),
    }));
    const submissionId = get().students.find((s) => s.studentName === studentName)?.id;
    syncClassroomAction(get().worksheetId, { type: "register_student", studentName, studentToken, submissionId });
  },
  syncAnswers: (studentName, answers, studentToken) => {
    const submissionId = get().students.find((s) => s.studentName === studentName)?.id;
    syncClassroomAction(get().worksheetId, {
      type: "sync_answers",
      studentName,
      studentToken,
      submissionId,
      answers,
    });
  },
  updateStudentProgress: (studentName, progress, currentQuestion, studentToken) => {
    set((state) => ({
      students: ensureStudent(state.students, studentName).map<StudentSubmissionSummary>((student) =>
        student.studentName === studentName
          ? {
              ...student,
              progress,
              currentQuestion,
              status: student.submitted
                ? ("submitted" as StudentSubmissionSummary["status"])
                : ("online" as StudentSubmissionSummary["status"]),
            }
          : student,
      ),
    }));
    const submissionId = get().students.find((s) => s.studentName === studentName)?.id;
    syncClassroomAction(get().worksheetId, {
      type: "update_progress",
      studentName,
      studentToken,
      submissionId,
      progress,
      currentQuestion,
    });
  },
  submitStudent: (studentName, studentToken) => {
    set((state) => ({
      students: ensureStudent(state.students, studentName).map<StudentSubmissionSummary>((student) =>
        student.studentName === studentName
          ? {
              ...student,
              progress: 100,
              submitted: true,
              status: "submitted" as StudentSubmissionSummary["status"],
              currentQuestion: "제출 완료",
            }
          : student,
      ),
    }));
    const submissionId = get().students.find((s) => s.studentName === studentName)?.id;
    syncClassroomAction(get().worksheetId, { type: "submit_student", studentName, studentToken, submissionId });
  },
  unsubmitStudent: (studentName, studentToken) => {
    set((state) => ({
      students: ensureStudent(state.students, studentName).map<StudentSubmissionSummary>((student) =>
        student.studentName === studentName
          ? {
              ...student,
              submitted: false,
              status: "active" as StudentSubmissionSummary["status"],
              currentQuestion: "",
            }
          : student,
      ),
    }));
    const submissionId = get().students.find((s) => s.studentName === studentName)?.id;
    syncClassroomAction(get().worksheetId, { type: "unsubmit_student", studentName, studentToken, submissionId });
  },
  startSession: () => {
    set({ isActive: true, sessionClosed: false, isLocked: false, currentPage: 1 });
    syncClassroomAction(get().worksheetId, { type: "session_start" });
  },
  startTimer: () => {
    clearTimerHandle();
    set({
      timerRunning: true,
      isLocked: false,
    });
    const seconds = get().timerSecondsRemaining;
    const timerEndAt = new Date(Date.now() + seconds * 1000).toISOString();
    syncClassroomAction(get().worksheetId, {
      type: "timer",
      command: "start",
      seconds,
    });
    startLocalTimer(set, timerEndAt);
  },
  pauseTimer: () => {
    clearTimerHandle();
    set({ timerRunning: false });
    syncClassroomAction(get().worksheetId, {
      type: "timer",
      command: "pause",
      seconds: get().timerSecondsRemaining,
    });
  },
  resetTimer: () => {
    clearTimerHandle();
    set({
      timerSecondsRemaining: 0,
      timerRunning: false,
      isLocked: false,
    });
    syncClassroomAction(get().worksheetId, { type: "timer", command: "reset" });
  },
  setTimer: (seconds) => {
    clearTimerHandle();
    const safeSeconds = Math.max(0, seconds);
    set({ timerSecondsRemaining: safeSeconds, timerRunning: false });
    syncClassroomAction(get().worksheetId, {
      type: "timer",
      command: "set",
      seconds: safeSeconds,
    });
  },
  decideTimerTimeout: (decision, seconds) => {
    clearTimerHandle();
    if (decision === "lock") {
      set({ isLocked: true, timerRunning: false, timerSecondsRemaining: 0 });
    } else {
      const safeSeconds = Math.max(0, seconds ?? 0);
      const timerEndAt = safeSeconds > 0
        ? new Date(Date.now() + safeSeconds * 1000).toISOString()
        : null;
      set({
        isLocked: false,
        timerRunning: safeSeconds > 0,
        timerSecondsRemaining: safeSeconds,
      });
      if (safeSeconds > 0) {
        startLocalTimer(set, timerEndAt);
      }
    }

    syncClassroomAction(get().worksheetId, {
      type: "timer_timeout_decision",
      decision,
      seconds,
    });
  },
  toggleFocusMode: () => {
    const enabled = !get().focusMode;
    set({ focusMode: enabled });
    syncClassroomAction(get().worksheetId, { type: "focus", enabled });
  },
  setCurrentPage: (page) => {
    set({ currentPage: page });
    syncClassroomAction(get().worksheetId, { type: "page", page });
  },
  updateLearningGoal: (learningGoal) => {
    set({ learningGoal });
    syncClassroomAction(get().worksheetId, {
      type: "learning_goal_update",
      learningGoal,
    });
  },
  toggleChat: () => {
    const enabled = !get().chatEnabled;
    set({ chatEnabled: enabled });
    syncClassroomAction(get().worksheetId, { type: "chat_toggle", enabled });
  },
  toggleChatPaused: () => {
    const paused = !get().chatPaused;
    set({ chatPaused: paused });
    syncClassroomAction(get().worksheetId, { type: "chat_pause", paused });
  },
  sendChatMessage: (senderName, content, isTeacher = false, studentToken) => {
    if (!content.trim() || (!isTeacher && get().chatPaused) || get().sessionClosed) {
      return;
    }

    const isAnonymous = !isTeacher && get().chatAnonymousMode;
    const messageId = crypto.randomUUID();

    const optimisticMsg: ChatMessage = {
      id: messageId,
      senderName,
      content: content.trim(),
      isPinned: false,
      isTeacher,
      isAnonymous,
    };

    set((state) => ({
      chatMessages: [...state.chatMessages, optimisticMsg],
    }));

    syncClassroomAction(get().worksheetId, {
      type: "chat_message",
      id: messageId,
      senderName,
      studentToken,
      content: content.trim(),
      isTeacher,
      isAnonymous,
    });
  },
  toggleChatPinned: (id) => {
    const msg = get().chatMessages.find((message) => message.id === id);
    const pinned = msg ? !msg.isPinned : false;
    set((state) => ({
      chatMessages: state.chatMessages.map((message) =>
        message.id === id ? { ...message, isPinned: pinned } : message,
      ),
    }));
    syncClassroomAction(get().worksheetId, { type: "chat_pin", id, pinned });
  },
  deleteChatMessage: (id) => {
    set((state) => ({
      chatMessages: state.chatMessages.filter((message) => message.id !== id),
    }));
    syncClassroomAction(get().worksheetId, { type: "chat_delete", id });
  },
  clearChat: () => {
    set({ chatMessages: [] });
    syncClassroomAction(get().worksheetId, { type: "chat_clear" });
  },
  addHelpRequest: (studentName, questionLabel, studentToken) => {
    set((state) => {
      const exists = state.helpRequests.some(
        (request) =>
          request.studentName === studentName && request.questionLabel === questionLabel,
      );

      if (exists) {
        return {};
      }

      const student = state.students.find((s) => s.studentName === studentName);
      if (!student) return {};

      return {
        helpRequests: [
          {
            id: crypto.randomUUID(),
            submissionId: student.id,
            studentName,
            questionLabel,
            createdAtLabel: "방금 전",
          },
          ...state.helpRequests,
        ],
      };
    });
    syncClassroomAction(get().worksheetId, {
      type: "help_request",
      studentName,
      studentToken,
      questionLabel,
    });
  },
  resolveHelpRequest: (id) => {
    set((state) => ({
      helpRequests: state.helpRequests.filter((request) => request.id !== id),
    }));
    syncClassroomAction(get().worksheetId, { type: "resolve_help", id });
  },
  openVote: (type) => {
    const config = defaultVoteConfig(type);
    const activeVote: ActiveVote = {
      id: crypto.randomUUID(),
      type,
      question: config.question,
      options: config.options,
      isResultPublic: true,
      isActive: true,
    };

    set({
      activeVote,
      voteSummary: {
        id: activeVote.id,
        type,
        question: config.question,
        results: config.options.map((option) => ({ label: option, value: 0 })),
        responseCount: 0,
        totalCount: get().students.length,
        isActive: true,
        isResultPublic: true,
      },
    });
    syncClassroomAction(get().worksheetId, {
      type: "vote_open",
      voteType: type,
      question: config.question,
      options: config.options,
      isResultPublic: true,
    });
  },
  closeVote: () => {
    set({ activeVote: null, voteSummary: { ...get().voteSummary, isActive: false } });
    syncClassroomAction(get().worksheetId, { type: "vote_close" });
  },
  toggleVoteResultPublic: () => {
    const isResultPublic = !(get().voteSummary.isResultPublic ?? true);
    set((state) => ({
      voteSummary: { ...state.voteSummary, isResultPublic },
      activeVote: state.activeVote ? { ...state.activeVote, isResultPublic } : null,
    }));
    syncClassroomAction(get().worksheetId, { type: "vote_result_toggle", isResultPublic });
  },
  resetVote: () => {
    const type = get().activeVote?.type ?? get().voteSummary.type;
    get().openVote(type);
  },
  castVote: (response, studentName, studentToken) => {
    set((state) => ({
      voteSummary: {
        ...state.voteSummary,
        responseCount: state.voteSummary.responseCount + 1,
        results:
          typeof response === "number"
            ? state.voteSummary.results.map((result) =>
                result.label === `${response}`
                  ? { ...result, value: result.value + 1 }
                  : result,
              )
            : state.voteSummary.results.length > 0
              ? state.voteSummary.results.map((result) =>
                  result.label === response
                    ? { ...result, value: result.value + 1 }
                    : result,
                )
              : [
                  {
                    label: `${response}`,
                    value: 1,
                  },
                ],
      },
    }));
    syncClassroomAction(get().worksheetId, {
      type: "vote_cast",
      response,
      studentName,
      studentToken,
    });
  },
  toggleGalleryOpen: () => {
    const open = !get().galleryOpen;
    set({ galleryOpen: open });
    syncClassroomAction(get().worksheetId, { type: "gallery_toggle", open });
  },
  toggleAnonymousGallery: () => {
    const enabled = !get().anonymousGallery;
    set({ anonymousGallery: enabled });
    syncClassroomAction(get().worksheetId, { type: "gallery_anonymous", enabled });
  },
  setGalleryFilterQuestion: (questionId) => {
    set((state) => ({
      galleryFilterQuestion: questionId,
      galleryCards: state.students.map((student) => {
        const existingCard = state.galleryCards.find((c) => c.id === student.id);
        return studentToGalleryCard(
          student,
          state.components,
          questionId,
          existingCard?.anonymousLabel ?? `친구`,
          existingCard?.visible ?? false,
          existingCard?.reactions,
        );
      }),
    }));
    syncClassroomAction(get().worksheetId, { type: "gallery_filter", questionId });
  },
  toggleGalleryCard: (id) => {
    const card = get().galleryCards.find((c) => c.id === id);
    const visible = card ? !card.visible : false;
    set((state) => ({
      galleryCards: state.galleryCards.map((card) =>
        card.id === id ? { ...card, visible } : card,
      ),
    }));
    syncClassroomAction(get().worksheetId, { type: "gallery_card", submissionId: id, visible });
  },
  toggleGalleryProject: (id) => {
    const card = get().galleryCards.find((c) => c.id === id);
    const projected = card ? !card.isProjected : false;
    set((state) => ({
      galleryCards: state.galleryCards.map((card) =>
        card.id === id ? { ...card, isProjected: projected } : card,
      ),
    }));
    syncClassroomAction(get().worksheetId, { type: "gallery_project", submissionId: id, projected });
  },
  addReaction: (id, kind, studentName, studentToken) => {
    set((state) => ({
      galleryCards: state.galleryCards.map((card) =>
        card.id === id
          ? {
              ...card,
              reactions: {
                ...card.reactions,
                [kind]: card.reactions[kind] + 1,
              },
            }
          : card,
      ),
    }));
    syncClassroomAction(get().worksheetId, {
      type: "reaction",
      submissionId: id,
      emoji: EMOJI_BY_REACTION[kind],
      studentName,
      studentToken,
    });
  },
  setSessionMode: (mode) => {
    set({ sessionMode: mode });
    syncClassroomAction(get().worksheetId, { type: "session_mode", mode });
  },
  joinGroup: (groupId, studentName, studentToken) => {
    syncClassroomAction(get().worksheetId, {
      type: "join_group",
      groupId,
      studentName,
      studentToken,
    });
  },
  assignStudentGroup: (submissionId, groupId) => {
    set((state) => ({
      students: state.students.map((student) =>
        student.id === submissionId ? { ...student, groupId } : student,
      ),
    }));
    syncClassroomAction(get().worksheetId, { type: "assign_group", submissionId, groupId });
  },
  toggleWritingLock: () => {
    const locked = !get().isLocked;
    set({ isLocked: locked });
    syncClassroomAction(get().worksheetId, { type: "writing_lock", locked });
  },
  muteStudent: (submissionId, muted) => {
    set((state) => ({
      students: state.students.map((student) =>
        student.id === submissionId ? { ...student, chatMuted: muted } : student,
      ),
    }));
    syncClassroomAction(get().worksheetId, { type: "chat_mute", submissionId, muted });
  },
  lockStudent: (submissionId, locked) => {
    set((state) => ({
      students: state.students.map((student) =>
        student.id === submissionId ? { ...student, writingLocked: locked } : student,
      ),
    }));
    syncClassroomAction(get().worksheetId, { type: "student_lock", submissionId, locked });
  },
  toggleChatAnonymousMode: () => {
    const enabled = !get().chatAnonymousMode;
    set({ chatAnonymousMode: enabled });
    syncClassroomAction(get().worksheetId, { type: "chat_anonymous_mode", enabled });
  },
  changeSessionCode: (newCode: string) => {
    const code = newCode.trim().toUpperCase();
    if (!code) return;
    set({ sessionCode: code });
    syncClassroomAction(get().worksheetId, { type: "session_code_change", newCode: code });
  },
  setProjection: (type, targetId) => {
    set({ projectedType: type, projectedTargetId: targetId });
    syncClassroomAction(get().worksheetId, { type: "set_projection", projectedType: type, targetId });
  },
  toggleShowChat: () => set((s) => ({ showChat: !s.showChat })),
  toggleShowTimer: () => set((s) => ({ showTimer: !s.showTimer })),
  toggleShowVote: () => set((s) => ({ showVote: !s.showVote })),
  closeSession: () => {
    clearTimerHandle();
    set({
      sessionClosed: true,
      isActive: false,
      isLocked: true,
      chatEnabled: false,
      focusMode: false,
      timerRunning: false,
      timerSecondsRemaining: 0,
      activeVote: null,
      // chatMessages는 DB DELETE가 Realtime으로 학생에게 전파되므로 로컬 초기화하지 않음
    });
    syncClassroomAction(get().worksheetId, { type: "session_close" });
  },
  removeStudent: (submissionId) => {
    set((state) => ({
      students: state.students.filter((student) => student.id !== submissionId),
      galleryCards: state.galleryCards.filter((card) => card.id !== submissionId),
      helpRequests: state.helpRequests.filter((req) => req.submissionId !== submissionId),
    }));
    syncClassroomAction(get().worksheetId, { type: "remove_student", submissionId });
  },
  handleWorksheetUpdate: (row) => {
    const partial = worksheetRowToPartialState(row);
    const state = get();

    // 필터가 변경된 경우 갤러리 카드 미리보기 갱신
    let extra = {};
    if (partial.galleryFilterQuestion !== state.galleryFilterQuestion) {
      extra = {
        galleryCards: state.students.map((student) => {
          const existingCard = state.galleryCards.find((c) => c.id === student.id);
          return studentToGalleryCard(
            student,
            state.components,
            partial.galleryFilterQuestion,
            existingCard?.anonymousLabel ?? `친구`,
            existingCard?.visible ?? false,
            existingCard?.reactions,
          );
        }),
      };
    }

    if (partial.timerRunning && !state.timerRunning) {
      // 새로운 timer_end_at 기준으로 로컬 타이머를 시작
      clearTimerHandle();
      set({ ...partial, ...extra });
      startLocalTimer(set, row.timer_end_at);
    } else if (!partial.timerRunning && state.timerRunning) {
      clearTimerHandle();
      set({ ...partial, ...extra });
    } else {
      set({ ...partial, ...extra });
    }
  },
  handleSubmissionUpsert: (row) => {
    set((state) => {
      const answerableComponents = state.components.filter(
        (c) => c.type !== "prompt" && c.type !== "divider",
      );
      const existing = state.students.find((s) => s.id === row.id);
      const student = submissionRowToStudent(row, existing, answerableComponents);
      const studentIdx = state.students.findIndex((s) => s.id === row.id);
      const newStudents =
        studentIdx === -1
          ? [student, ...state.students]
          : state.students.map((s, i) => (i === studentIdx ? student : s));

      const existingCard = state.galleryCards.find((card) => card.id === row.id);
      const anonymousLabel = existingCard?.anonymousLabel ?? `친구 ${state.galleryCards.length + 1}`;
      const updatedCard = submissionRowToGalleryCard(
        row,
        state.components,
        state.galleryFilterQuestion,
        anonymousLabel,
        existingCard?.reactions,
      );

      const galleryIdx = state.galleryCards.findIndex((card) => card.id === row.id);
      const newGalleryCards =
        galleryIdx === -1
          ? [...state.galleryCards, updatedCard]
          : state.galleryCards.map((card, i) => (i === galleryIdx ? updatedCard : card));

      return { students: newStudents, galleryCards: newGalleryCards };
    });
  },
  handleSubmissionDelete: (id) => {
    set((state) => ({
      students: state.students.filter((s) => s.id !== id),
      galleryCards: state.galleryCards.filter((card) => card.id !== id),
      helpRequests: state.helpRequests.filter((req) => req.submissionId !== id),
    }));
  },
  handleChatInsert: (row) => {
    if (row.is_deleted) return;
    const newMsg: ChatMessage = {
      id: row.id,
      senderName: row.sender_name,
      content: row.content,
      isPinned: row.is_pinned,
      isTeacher: row.is_teacher,
      isAnonymous: row.is_anonymous,
    };
    set((state) => {
      // 중복 메시지 방지 (같은 ID는 무시)
      if (state.chatMessages.some((m) => m.id === row.id)) return {};
      return { chatMessages: [...state.chatMessages, newMsg] };
    });
  },
  handleChatUpdate: (row) => {
    set((state) => ({
      chatMessages: row.is_deleted
        ? state.chatMessages.filter((m) => m.id !== row.id)
        : state.chatMessages.map((m) =>
            m.id === row.id ? { ...m, isPinned: row.is_pinned } : m,
          ),
    }));
  },
  handleChatDelete: (id) => {
    set((state) => ({
      chatMessages: state.chatMessages.filter((m) => m.id !== id),
    }));
  },
  handleHelpInsert: (row) => {
    const studentName =
      get().students.find((s) => s.id === row.submission_id)?.studentName ?? "학생";
    set((state) => {
      if (state.helpRequests.some((r) => r.id === row.id)) return {};
      return {
        helpRequests: [
          {
            id: row.id,
            submissionId: row.submission_id,
            studentName,
            questionLabel: row.question_id,
            createdAtLabel: "방금 전",
          },
          ...state.helpRequests,
        ],
      };
    });
  },
  handleHelpDelete: (id) => {
    set((state) => ({
      helpRequests: state.helpRequests.filter((r) => r.id !== id),
    }));
  },
  handleVoteUpsert: (row) => {
    const activeVote = voteRowToActiveVote(row);
    const state = get();
    const responseCount =
      state.voteSummary.id === row.id ? state.voteSummary.responseCount : 0;
    const voteSummary = voteRowToSummary(row, responseCount, state.students.length);
    set({ activeVote, voteSummary });
  },
  handleVoteResponseInsert: (voteId, response) => {
    if (get().activeVote?.id !== voteId) return;
    set((state) => ({
      voteSummary: {
        ...state.voteSummary,
        responseCount: state.voteSummary.responseCount + 1,
        results: state.voteSummary.results.map((r) =>
          r.label === response ? { ...r, value: r.value + 1 } : r,
        ),
      },
    }));
  },
  handleVoteResponseDelete: (voteId, response) => {
    if (get().activeVote?.id !== voteId) return;
    set((state) => ({
      voteSummary: {
        ...state.voteSummary,
        responseCount: Math.max(0, state.voteSummary.responseCount - 1),
        results: state.voteSummary.results.map((r) =>
          r.label === response ? { ...r, value: Math.max(0, r.value - 1) } : r,
        ),
      },
    }));
  },
  handleReactionInsert: (row) => {
    const emojiToKind: Record<string, keyof GalleryCard["reactions"]> = {
      "👍": "thumbsUp",
      "❤️": "heart",
      "😮": "wow",
      "😂": "laugh",
    };
    const kind = emojiToKind[row.emoji];
    if (!kind) return;
    set((state) => ({
      galleryCards: state.galleryCards.map((card) =>
        card.id === row.submission_id
          ? { ...card, reactions: { ...card.reactions, [kind]: card.reactions[kind] + 1 } }
          : card,
      ),
    }));
  },
  handleGroupUpsert: (row) => {
    set((state) => {
      const idx = state.groups.findIndex((g) => g.id === row.id);
      const group: Group = {
        id: row.id,
        name: row.name,
        icon: row.icon,
        count: idx !== -1 ? state.groups[idx].count : 0,
      };
      if (idx === -1) return { groups: [...state.groups, group] };
      const groups = [...state.groups];
      groups[idx] = group;
      return { groups };
    });
  },
  handlePresenceUpsert: (row) => {
    if (!row.submission_id) return;
    const status = presenceRowToStatus(row);
    set((state) => ({
      students: state.students.map((s) =>
        s.id === row.submission_id && !s.submitted ? { ...s, status } : s,
      ),
    }));
  },
}));
