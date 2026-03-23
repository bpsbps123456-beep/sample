"use client";

import type { HelpRequest, StudentSubmissionSummary } from "@/lib/types/domain";
import type { HelpRequestRow, PresenceRow } from "@/lib/realtime-transforms";
import { presenceRowToStatus } from "@/lib/realtime-transforms";
import { syncClassroomAction } from "@/lib/store/utils/sync-action";

// ─── State & Actions 타입 ────────────────────────────────────────────────────

export interface StudentSliceState {
  students: StudentSubmissionSummary[];
  helpRequests: HelpRequest[];
}

export interface StudentSliceActions {
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
  addHelpRequest: (studentName: string, questionLabel: string, studentToken?: string) => void;
  resolveHelpRequest: (id: string) => void;
  assignStudentGroup: (submissionId: string, groupId: string) => void;
  muteStudent: (submissionId: string, muted: boolean) => void;
  lockStudent: (submissionId: string, locked: boolean) => void;
  joinGroup: (groupId: string, studentName?: string, studentToken?: string) => void;
  handleHelpInsert: (row: HelpRequestRow) => void;
  handleHelpDelete: (id: string) => void;
  handlePresenceUpsert: (row: PresenceRow) => void;
}

export type StudentSlice = StudentSliceState & StudentSliceActions;

export const studentSliceDefaults: StudentSliceState = {
  students: [],
  helpRequests: [],
};

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

/**
 * 이름으로 학생이 없으면 임시 학생 객체를 생성해 앞에 추가합니다.
 */
export function ensureStudent(
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

// ─── set / get 최소 타입 정의 ─────────────────────────────────────────────

interface StudentActionState extends StudentSliceState {
  worksheetId: string;
}

type StudentSetFn = (
  partial:
    | Partial<StudentSliceState>
    | ((state: StudentSliceState) => Partial<StudentSliceState>),
) => void;

type StudentGetFn = () => StudentActionState;

// ─── 액션 팩토리 ─────────────────────────────────────────────────────────────

export function createStudentActions(
  set: StudentSetFn,
  get: StudentGetFn,
): StudentSliceActions {
  return {
    registerStudent: (studentName, studentToken) => {
      set((state) => ({
        students: ensureStudent(state.students, studentName).map<StudentSubmissionSummary>(
          (student) =>
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
      syncClassroomAction(get().worksheetId, {
        type: "register_student",
        studentName,
        studentToken,
        submissionId,
      });
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
        students: ensureStudent(state.students, studentName).map<StudentSubmissionSummary>(
          (student) =>
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
        students: ensureStudent(state.students, studentName).map<StudentSubmissionSummary>(
          (student) =>
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
      syncClassroomAction(get().worksheetId, {
        type: "submit_student",
        studentName,
        studentToken,
        submissionId,
      });
    },

    unsubmitStudent: (studentName, studentToken) => {
      set((state) => ({
        students: ensureStudent(state.students, studentName).map<StudentSubmissionSummary>(
          (student) =>
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
      syncClassroomAction(get().worksheetId, {
        type: "unsubmit_student",
        studentName,
        studentToken,
        submissionId,
      });
    },

    addHelpRequest: (studentName, questionLabel, studentToken) => {
      set((state) => {
        const exists = state.helpRequests.some(
          (request) =>
            request.studentName === studentName && request.questionLabel === questionLabel,
        );
        if (exists) return {};

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

    assignStudentGroup: (submissionId, groupId) => {
      set((state) => ({
        students: state.students.map((student) =>
          student.id === submissionId ? { ...student, groupId } : student,
        ),
      }));
      syncClassroomAction(get().worksheetId, { type: "assign_group", submissionId, groupId });
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

    joinGroup: (groupId, studentName, studentToken) => {
      syncClassroomAction(get().worksheetId, {
        type: "join_group",
        groupId,
        studentName,
        studentToken,
      });
    },

    // ─── 실시간 핸들러 ────────────────────────────────────────────────────────

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

    handlePresenceUpsert: (row) => {
      if (!row.submission_id) return;
      const status = presenceRowToStatus(row);
      set((state) => ({
        students: state.students.map((s) =>
          s.id === row.submission_id && !s.submitted ? { ...s, status } : s,
        ),
      }));
    },
  };
}
