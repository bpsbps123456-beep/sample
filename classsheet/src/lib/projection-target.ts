export interface ParsedGalleryProjectionTarget {
  questionId: string | null;
  submissionIds: string[];
}

export function parseGalleryProjectionTarget(
  targetId: string | null | undefined,
): ParsedGalleryProjectionTarget {
  if (!targetId) {
    return { questionId: null, submissionIds: [] };
  }

  try {
    const parsed = JSON.parse(targetId) as {
      questionId?: unknown;
      submissionIds?: unknown;
    };

    if (parsed && typeof parsed === "object" && typeof parsed.questionId === "string") {
      return {
        questionId: parsed.questionId,
        submissionIds: Array.isArray(parsed.submissionIds)
          ? [...new Set(parsed.submissionIds.filter((id): id is string => typeof id === "string"))]
          : [],
      };
    }
  } catch {
    // Backward-compatible plain string target for gallery_all and older gallery_partial payloads.
  }

  return { questionId: targetId, submissionIds: [] };
}

export function serializeGalleryPartialTarget(
  questionId: string | null,
  submissionIds: string[],
): string | null {
  if (!questionId) {
    return null;
  }

  return JSON.stringify({
    questionId,
    submissionIds: [...new Set(submissionIds)].sort(),
  });
}
