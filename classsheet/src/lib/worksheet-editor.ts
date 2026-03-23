import type {
  FontSizeMode,
  SessionMode,
  Worksheet,
  WorksheetComponent,
  WorksheetComponentType,
} from "@/lib/types/domain";

export interface EditableWorksheetDraft {
  title: string;
  description: string;
  learningGoal: string;
  mode: SessionMode;
  components: WorksheetComponent[];
  sessionCode?: string;
}

export function createDefaultWorksheetDraft(): EditableWorksheetDraft {
  return {
    title: "새 수업",
    description: "수업의 핵심 질문과 활동 안내를 정리해 보세요.",
    learningGoal: "학생이 수업 목표를 분명히 이해하고 활동을 수행할 수 있다.",
    mode: "individual",
    components: [
      {
        id: crypto.randomUUID(),
        type: "prompt",
        page: 1,
        title: "학습 안내",
        body: "오늘 수업에서 해야 할 활동과 주의할 점을 적어주세요.",
      },
      {
        id: crypto.randomUUID(),
        type: "short_text",
        page: 1,
        title: "1번",
        description: "핵심 개념을 한 문장으로 적어보세요.",
        placeholder: "예: 오늘 배운 점을 적어보세요.",
      },
      {
        id: crypto.randomUUID(),
        type: "drawing",
        page: 1,
        title: "2번",
        description: "생각을 그림이나 도식으로 표현해 보세요.",
      },
    ],
  };
}

export function createDraftFromWorksheet(worksheet: Worksheet): EditableWorksheetDraft {
  return {
    title: worksheet.title,
    description: worksheet.description,
    learningGoal: worksheet.learningGoal,
    mode: worksheet.mode,
    components: worksheet.components,
    sessionCode: worksheet.sessionCode,
  };
}

export function createComponentByType(type: WorksheetComponentType): WorksheetComponent {
  const base = {
    id: crypto.randomUUID(),
    page: 1,
    title: "새 항목",
  };

  switch (type) {
    case "prompt":
      return { ...base, type, body: "안내 문구를 입력하세요." };
    case "short_text":
      return { ...base, type, description: "질문을 입력하세요.", placeholder: "" };
    case "long_text":
      return { ...base, type, description: "질문을 입력하세요.", placeholder: "" };
    case "drawing":
      return { ...base, type, description: "그림으로 표현할 활동을 입력하세요." };
    case "single_choice":
      return { ...base, type, description: "보기 중 하나를 고르도록 안내하세요.", options: ["보기 1", "보기 2", "보기 3"] };
    case "multi_choice":
      return { ...base, type, description: "복수 선택이 가능한 질문입니다.", options: ["보기 1", "보기 2", "보기 3"] };
    case "ox":
      return { ...base, type, description: "O 또는 X로 답하는 문항입니다." };
    case "divider":
    default:
      return { ...base, type: "divider" };
  }
}

export function normalizeWorksheetComponents(input: unknown): WorksheetComponent[] {
  if (!Array.isArray(input)) {
    return createDefaultWorksheetDraft().components;
  }

  const FONT_SIZES: FontSizeMode[] = ["sm", "md", "lg"];

  return input.reduce<WorksheetComponent[]>((accumulator, item) => {
    if (!item || typeof item !== "object") {
      return accumulator;
    }

    const candidate = item as Record<string, unknown>;
    const type = typeof candidate.type === "string" ? candidate.type : "prompt";
    const page = typeof candidate.page === "number" && candidate.page > 0 ? candidate.page : 1;
    const title = typeof candidate.title === "string" ? candidate.title : "항목";
    const id = typeof candidate.id === "string" ? candidate.id : crypto.randomUUID();
    const titleFontSize = FONT_SIZES.includes(candidate.titleFontSize as FontSizeMode)
      ? (candidate.titleFontSize as FontSizeMode)
      : undefined;
    const bodyFontSize = FONT_SIZES.includes(candidate.bodyFontSize as FontSizeMode)
      ? (candidate.bodyFontSize as FontSizeMode)
      : undefined;

    switch (type) {
      case "prompt":
        accumulator.push({ id, type, page, title, titleFontSize, bodyFontSize, body: typeof candidate.body === "string" ? candidate.body : "" });
        return accumulator;
      case "short_text":
      case "long_text":
        accumulator.push({ id, type, page, title, titleFontSize, bodyFontSize, description: typeof candidate.description === "string" ? candidate.description : "", placeholder: typeof candidate.placeholder === "string" ? candidate.placeholder : "" });
        return accumulator;
      case "drawing":
        accumulator.push({ id, type, page, title, titleFontSize, bodyFontSize, description: typeof candidate.description === "string" ? candidate.description : "" });
        return accumulator;
      case "single_choice":
      case "multi_choice":
        accumulator.push({ id, type, page, title, titleFontSize, bodyFontSize, description: typeof candidate.description === "string" ? candidate.description : "", options: Array.isArray(candidate.options) ? candidate.options.filter((option): option is string => typeof option === "string" && option.trim().length > 0) : [] });
        return accumulator;
      case "ox":
        accumulator.push({ id, type, page, title, titleFontSize, bodyFontSize, description: typeof candidate.description === "string" ? candidate.description : "" });
        return accumulator;
      case "divider":
        accumulator.push({ id, type, page, title });
        return accumulator;
      default:
        return accumulator;
    }
  }, []);
}
