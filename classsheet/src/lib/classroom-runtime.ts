import type { ActiveVote, VoteType, WorksheetComponent } from "@/lib/types/domain";

export function isAnswerFilled(value: string | string[] | undefined) {
  return Array.isArray(value) ? value.length > 0 : Boolean(value?.trim());
}

export function countCompletedAnswers(
  components: WorksheetComponent[],
  answers: Record<string, string | string[]>,
) {
  return components
    .filter((component) => !["prompt", "divider"].includes(component.type))
    .filter((component) => isAnswerFilled(answers[component.id]))
    .length;
}

export function getPageAccessState(page: number, currentPage: number) {
  if (page < currentPage) {
    return "past" as const;
  }
  if (page === currentPage) {
    return "current" as const;
  }
  return "future" as const;
}

export function buildAnonymousLabel(index: number) {
  return `친구 ${index + 1}`;
}

export function restoreActiveVote(input: {
  id: string;
  type: VoteType;
  question: string;
  options: string[];
  isResultPublic: boolean;
  isActive: boolean;
} | null): ActiveVote | null {
  if (!input?.isActive) {
    return null;
  }

  return {
    id: input.id,
    type: input.type,
    question: input.question,
    options: input.options,
    isResultPublic: input.isResultPublic,
    isActive: true,
  };
}
