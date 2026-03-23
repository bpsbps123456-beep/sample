"use client";

import type { GalleryCard, StudentSubmissionSummary, WorksheetComponent } from "@/lib/types/domain";
import type { GalleryReactionRow } from "@/lib/realtime-transforms";
import { studentToGalleryCard } from "@/lib/realtime-transforms";
import {
  parseGalleryProjectionTarget,
  serializeGalleryPartialTarget,
} from "@/lib/projection-target";
import { syncClassroomAction } from "@/lib/store/utils/sync-action";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

type ReactionKind = "thumbsUp" | "heart" | "wow" | "laugh";
type GalleryProjectedSelections = Record<string, string[]>;

const EMOJI_BY_REACTION: Record<ReactionKind, "👍" | "❤️" | "😮" | "😂"> = {
  thumbsUp: "👍",
  heart: "❤️",
  wow: "😮",
  laugh: "😂",
};

// ─── State & Actions 타입 ────────────────────────────────────────────────────

export interface GallerySliceState {
  galleryCards: GalleryCard[];
  galleryOpen: boolean;
  galleryFilterQuestion: string | null;
  anonymousGallery: boolean;
  galleryProjectedSelections: GalleryProjectedSelections;
  projectedType?: string | null;
  projectedTargetId?: string | null;
}

export interface GallerySliceActions {
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
  setProjection: (type: string | null, targetId?: string | null) => void;
  handleReactionInsert: (row: GalleryReactionRow) => void;
}

export type GallerySlice = GallerySliceState & GallerySliceActions;

export const gallerySliceDefaults: GallerySliceState = {
  galleryCards: [],
  galleryOpen: false,
  galleryFilterQuestion: null,
  anonymousGallery: true,
  galleryProjectedSelections: {},
  projectedType: null,
  projectedTargetId: null,
};

// ─── 헬퍼 함수 (메인 스토어에서도 사용) ──────────────────────────────────────

export function hasProjectedSelection(
  selections: GalleryProjectedSelections,
  questionId: string | null,
) {
  return !!questionId && Object.prototype.hasOwnProperty.call(selections, questionId);
}

export function projectedIdsForQuestion(
  selections: GalleryProjectedSelections,
  questionId: string | null,
  fallbackCards: GalleryCard[] = [],
) {
  if (!questionId) return [];

  if (hasProjectedSelection(selections, questionId)) {
    return selections[questionId] ?? [];
  }

  return fallbackCards
    .filter((card) => card.questionId === questionId && card.isProjected)
    .map((card) => card.id);
}

export function buildGalleryCardsFromStudents(
  students: StudentSubmissionSummary[],
  components: WorksheetComponent[],
  questionId: string | null,
  existingCards: GalleryCard[],
  projectedSelections: GalleryProjectedSelections,
) {
  const projectedIdSet = new Set(
    projectedIdsForQuestion(projectedSelections, questionId, existingCards),
  );

  return students.map((student) => {
    const existingCard = existingCards.find((card) => card.id === student.id);
    return studentToGalleryCard(
      student,
      components,
      questionId,
      existingCard?.anonymousLabel ?? "친구",
      existingCard?.visible ?? false,
      existingCard?.reactions,
      questionId ? projectedIdSet.has(student.id) : existingCard?.isProjected ?? false,
    );
  });
}

export function createProjectedSelections(
  projectedType: string | null | undefined,
  projectedTargetId: string | null | undefined,
  galleryFilterQuestion: string | null,
  galleryCards: GalleryCard[],
) {
  const selections: GalleryProjectedSelections = {};

  if (galleryFilterQuestion) {
    selections[galleryFilterQuestion] = galleryCards
      .filter((card) => card.isProjected)
      .map((card) => card.id);
  }

  if (projectedType === "gallery_partial") {
    const parsedTarget = parseGalleryProjectionTarget(projectedTargetId);
    if (parsedTarget.questionId) {
      selections[parsedTarget.questionId] =
        parsedTarget.submissionIds.length > 0
          ? parsedTarget.submissionIds
          : projectedIdsForQuestion(selections, parsedTarget.questionId, galleryCards);
    }
  }

  return selections;
}

// ─── set / get 최소 타입 정의 ─────────────────────────────────────────────

interface GalleryActionState extends GallerySliceState {
  worksheetId: string;
  students: StudentSubmissionSummary[];
  components: WorksheetComponent[];
}

type GallerySetFn = (
  partial:
    | Partial<GallerySliceState>
    | ((state: GallerySliceState) => Partial<GallerySliceState>),
) => void;

type GalleryGetFn = () => GalleryActionState;

// ─── 액션 팩토리 ─────────────────────────────────────────────────────────────

export function createGalleryActions(set: GallerySetFn, get: GalleryGetFn): GallerySliceActions {
  return {
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
        galleryCards: buildGalleryCardsFromStudents(
          get().students,
          get().components,
          questionId,
          state.galleryCards,
          state.galleryProjectedSelections,
        ),
      }));
      syncClassroomAction(get().worksheetId, { type: "gallery_filter", questionId });
    },

    toggleGalleryCard: (id) => {
      const card = get().galleryCards.find((c) => c.id === id);
      const visible = card ? !card.visible : false;
      set((state) => ({
        galleryCards: state.galleryCards.map((c) =>
          c.id === id ? { ...c, visible } : c,
        ),
      }));
      syncClassroomAction(get().worksheetId, {
        type: "gallery_card",
        submissionId: id,
        visible,
      });
    },

    toggleGalleryProject: (id) => {
      const state = get();
      const card = state.galleryCards.find((c) => c.id === id);
      if (!card) return;

      const questionId = state.galleryFilterQuestion ?? card.questionId ?? null;
      const projected = !card.isProjected;
      const nextProjectedSelections = { ...state.galleryProjectedSelections };
      let nextProjectedTargetId = state.projectedTargetId ?? null;

      if (questionId) {
        const selectedIds = projectedIdsForQuestion(
          state.galleryProjectedSelections,
          questionId,
          state.galleryCards,
        );
        const nextSelectedIds = projected
          ? [...selectedIds, id]
          : selectedIds.filter((submissionId) => submissionId !== id);

        nextProjectedSelections[questionId] = [...new Set(nextSelectedIds)];

        if (state.projectedType === "gallery_partial") {
          const activePartialQuestionId = parseGalleryProjectionTarget(
            state.projectedTargetId,
          ).questionId;
          if (activePartialQuestionId === questionId) {
            nextProjectedTargetId = serializeGalleryPartialTarget(
              questionId,
              nextProjectedSelections[questionId],
            );
          }
        }
      }

      set({
        galleryProjectedSelections: nextProjectedSelections,
        galleryCards: state.galleryCards.map((c) =>
          c.id === id ? { ...c, isProjected: projected } : c,
        ),
        projectedTargetId: nextProjectedTargetId,
      });

      syncClassroomAction(state.worksheetId, {
        type: "gallery_project",
        submissionId: id,
        projected,
      });
      if (state.projectedType === "gallery_partial" && questionId && nextProjectedTargetId) {
        syncClassroomAction(state.worksheetId, {
          type: "set_projection",
          projectedType: "gallery_partial",
          targetId: nextProjectedTargetId,
        });
      }
    },

    addReaction: (id, kind, studentName, studentToken) => {
      set((state) => ({
        galleryCards: state.galleryCards.map((card) =>
          card.id === id
            ? {
                ...card,
                reactions: { ...card.reactions, [kind]: card.reactions[kind] + 1 },
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

    setProjection: (type, targetId) => {
      const state = get();
      const targetQuestionId =
        type === "gallery_partial"
          ? parseGalleryProjectionTarget(targetId ?? state.galleryFilterQuestion).questionId
          : targetId ?? null;
      const normalizedTargetId =
        type === "gallery_partial"
          ? serializeGalleryPartialTarget(
              targetQuestionId,
              projectedIdsForQuestion(
                state.galleryProjectedSelections,
                targetQuestionId,
                state.galleryCards,
              ),
            )
          : targetId ?? null;

      set({ projectedType: type, projectedTargetId: normalizedTargetId });
      syncClassroomAction(state.worksheetId, {
        type: "set_projection",
        projectedType: type,
        targetId: normalizedTargetId,
      });
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
  };
}
