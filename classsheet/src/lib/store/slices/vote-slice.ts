"use client";

import type {
  ActiveVote,
  VoteSummary,
  VoteType,
} from "@/lib/types/domain";
import type { VoteRow } from "@/lib/realtime-transforms";
import { voteRowToActiveVote, voteRowToSummary } from "@/lib/realtime-transforms";
import { syncClassroomAction } from "@/lib/store/utils/sync-action";

// ─── State & Actions 타입 ────────────────────────────────────────────────────

export interface VoteSliceState {
  voteSummary: VoteSummary;
  activeVote: ActiveVote | null;
}

export interface VoteSliceActions {
  openVote: (type: VoteType, config?: { question?: string; options?: string[] }) => void;
  closeVote: () => void;
  toggleVoteResultPublic: () => void;
  resetVote: () => void;
  castVote: (response: string | number, studentName?: string, studentToken?: string) => void;
  handleVoteUpsert: (row: VoteRow) => void;
  handleVoteResponseInsert: (voteId: string, response: string) => void;
  handleVoteResponseDelete: (voteId: string, response: string) => void;
}

export type VoteSlice = VoteSliceState & VoteSliceActions;

// ─── 기본값 ──────────────────────────────────────────────────────────────────

export const EMPTY_VOTE_SUMMARY: VoteSummary = {
  id: "no-vote",
  type: "choice",
  question: "진행 중인 투표가 없습니다.",
  results: [],
  responseCount: 0,
  totalCount: 0,
  isActive: false,
  isResultPublic: false,
};

export const voteSliceDefaults: VoteSliceState = {
  voteSummary: EMPTY_VOTE_SUMMARY,
  activeVote: null,
};

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

export function defaultVoteConfig(type: VoteType) {
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

// ─── set / get 최소 타입 정의 ─────────────────────────────────────────────

interface VoteActionState extends VoteSliceState {
  worksheetId: string;
  students: { length: number };
  openVote: (type: VoteType, config?: { question?: string; options?: string[] }) => void;
}

type VoteSetFn = (
  partial:
    | Partial<VoteSliceState>
    | ((state: VoteSliceState) => Partial<VoteSliceState>),
) => void;

type VoteGetFn = () => VoteActionState;

// ─── 액션 팩토리 ─────────────────────────────────────────────────────────────

export function createVoteActions(set: VoteSetFn, get: VoteGetFn): VoteSliceActions {
  return {
    openVote: (type, overrides) => {
      const baseConfig = defaultVoteConfig(type);
      const normalizedOptions =
        overrides?.options?.map((option) => option.trim()).filter(Boolean) ?? baseConfig.options;
      const config = {
        question: overrides?.question?.trim() || baseConfig.question,
        options:
          type === "ox"
            ? ["O", "X"]
            : normalizedOptions.length > 0
              ? normalizedOptions
              : baseConfig.options,
      };
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
      const question = get().activeVote?.question ?? get().voteSummary.question;
      const options = get().activeVote?.options ?? get().voteSummary.results.map((result) => result.label);
      get().openVote(type, { question, options });
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
                : [{ label: `${response}`, value: 1 }],
        },
      }));
      syncClassroomAction(get().worksheetId, {
        type: "vote_cast",
        response,
        studentName,
        studentToken,
      });
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
  };
}
