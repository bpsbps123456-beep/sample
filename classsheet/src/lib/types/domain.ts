export type SessionMode = "individual" | "group";

export type FontSizeMode = "sm" | "md" | "lg";

export type WorksheetComponentType =
  | "prompt"
  | "short_text"
  | "long_text"
  | "drawing"
  | "single_choice"
  | "multi_choice"
  | "divider"
  | "ox";

export type VoteType = "ox" | "choice" | "slider" | "wordcloud";

export type PresenceStatus = "online" | "idle" | "offline" | "submitted";

export interface WorksheetComponentBase {
  id: string;
  type: WorksheetComponentType;
  page: number;
  title: string;
  titleFontSize?: FontSizeMode;
  description?: string;
  bodyFontSize?: FontSizeMode;
}

export interface PromptComponent extends WorksheetComponentBase {
  type: "prompt";
  body: string;
}

export interface ShortTextComponent extends WorksheetComponentBase {
  type: "short_text";
  placeholder?: string;
}

export interface LongTextComponent extends WorksheetComponentBase {
  type: "long_text";
  placeholder?: string;
}

export interface DrawingComponent extends WorksheetComponentBase {
  type: "drawing";
}

export interface SingleChoiceComponent extends WorksheetComponentBase {
  type: "single_choice";
  options: string[];
}

export interface MultiChoiceComponent extends WorksheetComponentBase {
  type: "multi_choice";
  options: string[];
}

export interface DividerComponent extends WorksheetComponentBase {
  type: "divider";
}

export interface OxComponent extends WorksheetComponentBase {
  type: "ox";
  description?: string;
}

export type WorksheetComponent =
  | PromptComponent
  | ShortTextComponent
  | LongTextComponent
  | DrawingComponent
  | SingleChoiceComponent
  | MultiChoiceComponent
  | DividerComponent
  | OxComponent;

export interface Group {
  id: string;
  name: string;
  icon: string;
  count: number;
}

export interface StudentSubmissionSummary {
  id: string;
  studentName: string;
  progress: number;
  submitted: boolean;
  status: PresenceStatus;
  currentQuestion: string;
  groupId?: string | null;
  answers?: StudentAnswerDetail[];
  chatMuted?: boolean;
  writingLocked?: boolean;
}

export interface StudentAnswerDetail {
  componentId: string;
  questionTitle: string;
  componentType: WorksheetComponentType;
  textValue?: string;
  imageUrl?: string;
  choiceValues?: string[];
}

export interface HelpRequest {
  id: string;
  submissionId: string;
  studentName: string;
  questionLabel: string;
  createdAtLabel: string;
}

export interface ChatMessage {
  id: string;
  senderName: string;
  content: string;
  isPinned?: boolean;
  isTeacher?: boolean;
  isDeleted?: boolean;
  isAnonymous?: boolean;
  isHighlighted?: boolean;
  highlightedAt?: string | null;
}

export interface ActiveVote {
  id: string;
  type: VoteType;
  question: string;
  options: string[];
  isResultPublic: boolean;
  isActive: boolean;
}

export interface VoteSummary {
  id: string;
  type: VoteType;
  question: string;
  results: Array<{
    label: string;
    value: number;
  }>;
  responseCount: number;
  totalCount: number;
  isResultPublic?: boolean;
  isActive?: boolean;
}

export interface GalleryCard {
  id: string;
  displayName: string;
  anonymousLabel: string;
  excerpt: string;
  imageUrl?: string;
  questionId?: string | null;
  questionTitle?: string | null;
  reactions: {
    thumbsUp: number;
    heart: number;
    wow: number;
    laugh: number;
  };
  visible: boolean;
  isProjected: boolean;
}

export interface Worksheet {
  id: string;
  sessionCode: string;
  title: string;
  subject: string;
  description: string;
  learningGoal: string;
  mode: SessionMode;
  currentPage: number;
  totalPages: number;
  pageLockEnabled: boolean;
  isActive: boolean;
  isLocked: boolean;
  sessionClosed: boolean;
  timerSecondsRemaining: number;
  timerRunning: boolean;
  timerEndAt?: string | null;
  chatEnabled: boolean;
  chatPaused?: boolean;
  focusMode: boolean;
  galleryOpen: boolean;
  galleryFilterQuestion: string | null;
  anonymousGallery: boolean;
  activeVote: ActiveVote | null;
  activeVoteResultPublic: boolean;
  components: WorksheetComponent[];
  groups: Group[];
  students: StudentSubmissionSummary[];
  helpRequests: HelpRequest[];
  chatMessages: ChatMessage[];
  voteSummary: VoteSummary;
  galleryCards: GalleryCard[];
  chatAnonymousMode: boolean;
  projectedType?: string | null;
  projectedTargetId?: string | null;
}
