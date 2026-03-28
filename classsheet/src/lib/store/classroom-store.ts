"use client";

import { create } from "zustand";

import { type UISlice, uiSliceDefaults, createUIActions } from "./slices/ui-slice";
import {
  type TimerSlice,
  timerSliceDefaults,
  createTimerActions,
  clearTimerHandle,
  startLocalTimer,
} from "./slices/timer-slice";
import {
  type VoteSlice,
  voteSliceDefaults,
  createVoteActions,
} from "./slices/vote-slice";
import {
  type ChatSlice,
  chatSliceDefaults,
  createChatActions,
} from "./slices/chat-slice";
import {
  type StudentSlice,
  studentSliceDefaults,
  createStudentActions,
} from "./slices/student-slice";
import {
  type GallerySlice,
  gallerySliceDefaults,
  createGalleryActions,
  buildGalleryCardsFromStudents,
  createProjectedSelections,
  projectedIdsForQuestion,
} from "./slices/gallery-slice";
import { syncClassroomAction } from "./utils/sync-action";

import type {
  Group,
  Worksheet,
  WorksheetComponent,
} from "@/lib/types/domain";
import type {
  GroupRow,
  SubmissionRow,
  WorksheetRow,
} from "@/lib/realtime-transforms";
import {
  submissionRowToStudent,
  submissionRowToGalleryCard,
  worksheetRowToPartialState,
} from "@/lib/realtime-transforms";
import { parseGalleryProjectionTarget } from "@/lib/projection-target";

interface ClassroomState extends UISlice, TimerSlice, VoteSlice, ChatSlice, StudentSlice, GallerySlice {
  worksheetId: string;
  sessionCode: string;
  worksheetTitle: string;
  subject: string;
  description: string;
  learningGoal: string;
  currentPage: number;
  totalPages: number;
  pageLockEnabled: boolean;
  isActive: boolean;
  isLocked: boolean;
  focusMode: boolean;
  sessionMode: "individual" | "group";
  sessionClosed: boolean;
  groups: Group[];
  components: WorksheetComponent[];
  initializeFromWorksheet: (worksheet: Worksheet) => void;
  startSession: () => void;
  toggleFocusMode: () => void;
  setCurrentPage: (page: number) => void;
  togglePageLock: () => void;
  updateLearningGoal: (learningGoal: string) => void;
  setSessionMode: (mode: "individual" | "group") => void;
  toggleWritingLock: () => void;
  changeSessionCode: (newCode: string) => void;
  closeSession: () => void;
  removeStudent: (submissionId: string) => void;
  handleWorksheetUpdate: (row: WorksheetRow) => void;
  handleSubmissionUpsert: (row: SubmissionRow) => void;
  handleSubmissionDelete: (id: string) => void;
  handleGroupUpsert: (row: GroupRow) => void;
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
    pageLockEnabled: true,
    isActive: false,
    isLocked: false,
    ...timerSliceDefaults,
    focusMode: false,
    ...chatSliceDefaults,
    sessionMode: "individual" as const,
    sessionClosed: false,
    ...studentSliceDefaults,
    ...voteSliceDefaults,
    ...gallerySliceDefaults,
    groups: [] as Group[],
    components: [] as WorksheetComponent[],
    ...uiSliceDefaults,
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
    pageLockEnabled: worksheet.pageLockEnabled,
    isActive: worksheet.isActive,
    isLocked: worksheet.isLocked,
    timerSecondsRemaining: worksheet.timerSecondsRemaining,
    timerRunning: worksheet.timerRunning && worksheet.timerSecondsRemaining > 0,
    focusMode: worksheet.focusMode,
    chatEnabled: worksheet.chatEnabled,
    chatPaused: worksheet.chatPaused ?? false,
    chatAnonymousMode: worksheet.chatAnonymousMode ?? false,
    galleryOpen: worksheet.galleryOpen,
    galleryFilterQuestion: worksheet.galleryFilterQuestion,
    anonymousGallery: worksheet.anonymousGallery,
    projectedType: worksheet.projectedType,
    projectedTargetId: worksheet.projectedTargetId,
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
  };
}

export const useClassroomStore = create<ClassroomState>((set, get) => ({
  ...emptySnapshot(),
  initializeFromWorksheet: (worksheet) => {
    clearTimerHandle();
    const snapshot = createClassroomSnapshot(worksheet);
    const galleryProjectedSelections = createProjectedSelections(
      snapshot.projectedType,
      snapshot.projectedTargetId,
      snapshot.galleryFilterQuestion,
      snapshot.galleryCards,
    );
    set({
      ...snapshot,
      galleryProjectedSelections,
      galleryCards: buildGalleryCardsFromStudents(
        worksheet.students,
        worksheet.components,
        snapshot.galleryFilterQuestion,
        snapshot.galleryCards,
        galleryProjectedSelections,
      ),
    });

    if (snapshot.timerRunning) {
      startLocalTimer(set, worksheet.timerEndAt);
    }
  },
  ...createStudentActions(set, get),
  startSession: () => {
    const state = get();
    set({
      isActive: true,
      sessionClosed: false,
      isLocked: false,
      currentPage: 1,
      pageLockEnabled: true,
      projectedType: null,
      projectedTargetId: null,
      galleryProjectedSelections: {},
      galleryCards: state.galleryCards.map((card) => ({ ...card, isProjected: false })),
    });
    syncClassroomAction(get().worksheetId, { type: "session_start" });
  },
  ...createTimerActions(set, get),
  toggleFocusMode: () => {
    const enabled = !get().focusMode;
    set({ focusMode: enabled });
    syncClassroomAction(get().worksheetId, { type: "focus", enabled });
  },
  setCurrentPage: (page) => {
    set({ currentPage: page });
    syncClassroomAction(get().worksheetId, { type: "page", page });
  },
  togglePageLock: () => {
    const locked = !get().pageLockEnabled;
    set({ pageLockEnabled: locked });
    syncClassroomAction(get().worksheetId, { type: "page_lock", locked });
  },
  updateLearningGoal: (learningGoal) => {
    set({ learningGoal });
    syncClassroomAction(get().worksheetId, {
      type: "learning_goal_update",
      learningGoal,
    });
  },
  ...createChatActions(set, get),
  ...createVoteActions(set, get),
  ...createGalleryActions(set, get),
  setSessionMode: (mode) => {
    set({ sessionMode: mode });
    syncClassroomAction(get().worksheetId, { type: "session_mode", mode });
  },
  toggleWritingLock: () => {
    const locked = !get().isLocked;
    set({ isLocked: locked });
    syncClassroomAction(get().worksheetId, { type: "writing_lock", locked });
  },
  changeSessionCode: (newCode: string) => {
    const code = newCode.trim().toUpperCase();
    if (!code) return;
    set({ sessionCode: code });
    syncClassroomAction(get().worksheetId, { type: "session_code_change", newCode: code });
  },
  ...createUIActions(set),
  closeSession: () => {
    clearTimerHandle();
    set({
      sessionClosed: true,
      isActive: false,
      isLocked: true,
      pageLockEnabled: true,
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
    const nextProjectedSelections = { ...state.galleryProjectedSelections };
    const parsedProjectedTarget =
      partial.projectedType === "gallery_partial"
        ? parseGalleryProjectionTarget(partial.projectedTargetId)
        : { questionId: null, submissionIds: [] as string[] };

    if (parsedProjectedTarget.questionId) {
      nextProjectedSelections[parsedProjectedTarget.questionId] =
        parsedProjectedTarget.submissionIds.length > 0
          ? parsedProjectedTarget.submissionIds
          : projectedIdsForQuestion(
              state.galleryProjectedSelections,
              parsedProjectedTarget.questionId,
              state.galleryCards,
            );
    }

    const projectionChanged =
      partial.projectedType !== state.projectedType ||
      partial.projectedTargetId !== state.projectedTargetId;

    let extra = {};
    if (
      partial.galleryFilterQuestion !== state.galleryFilterQuestion ||
      projectionChanged ||
      (parsedProjectedTarget.questionId &&
        parsedProjectedTarget.questionId === (partial.galleryFilterQuestion ?? state.galleryFilterQuestion))
    ) {
      extra = {
        galleryProjectedSelections: nextProjectedSelections,
        galleryCards: buildGalleryCardsFromStudents(
          state.students,
          state.components,
          partial.galleryFilterQuestion,
          state.galleryCards,
          nextProjectedSelections,
        ),
      };
    } else {
      extra = {
        galleryProjectedSelections: nextProjectedSelections,
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
      const projectedIds = projectedIdsForQuestion(
        state.galleryProjectedSelections,
        state.galleryFilterQuestion,
        state.galleryCards,
      );
      const updatedCard = submissionRowToGalleryCard(
        row,
        state.components,
        state.galleryFilterQuestion,
        anonymousLabel,
        existingCard?.reactions,
        state.galleryFilterQuestion ? projectedIds.includes(row.id) : row.is_projected,
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
}));
