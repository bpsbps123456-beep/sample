import type { SessionMode, VoteType } from "@/lib/types/domain";

export type ClassroomSyncAction =
  | { type: "register_student"; studentName: string; studentToken?: string; submissionId?: string }
  | {
      type: "sync_answers";
      studentName: string;
      studentToken?: string;
      submissionId?: string;
      answers: Record<string, string | string[]>;
    }
  | {
      type: "update_progress";
      studentName: string;
      studentToken?: string;
      submissionId?: string;
      progress: number;
      currentQuestion: string;
    }
  | { type: "submit_student"; studentName: string; studentToken?: string; submissionId?: string }
  | { type: "unsubmit_student"; studentName: string; studentToken?: string; submissionId?: string }
  | { type: "session_start" }
  | { type: "timer"; command: "start" | "pause" | "reset" | "set"; seconds?: number }
  | { type: "timer_timeout_decision"; decision: "lock" | "extend"; seconds?: number }
  | { type: "focus"; enabled: boolean }
  | { type: "page"; page: number }
  | { type: "learning_goal_update"; learningGoal: string }
  | { type: "chat_toggle"; enabled: boolean }
  | { type: "chat_pause"; paused: boolean }
  | {
      type: "chat_message";
      id: string;
      senderName: string;
      studentToken?: string;
      content: string;
      isTeacher?: boolean;
      isAnonymous?: boolean;
    }
  | { type: "chat_pin"; id: string; pinned: boolean }
  | { type: "chat_delete"; id: string }
  | { type: "chat_clear" }
  | { type: "help_request"; studentName: string; studentToken?: string; questionLabel: string }
  | { type: "resolve_help"; id: string }
  | {
      type: "vote_open";
      voteType: VoteType;
      question: string;
      options: string[];
      isResultPublic: boolean;
    }
  | { type: "vote_close" }
  | { type: "vote_cast"; response: string | number; studentName?: string; studentToken?: string }
  | { type: "gallery_toggle"; open: boolean }
  | { type: "gallery_anonymous"; enabled: boolean }
  | { type: "gallery_filter"; questionId: string | null }
  | { type: "gallery_card"; submissionId: string; visible: boolean }
  | { type: "gallery_project"; submissionId: string; projected: boolean }
  | {
      type: "reaction";
      submissionId: string;
      emoji: "👍" | "❤️" | "😮" | "😂";
      studentName?: string;
      studentToken?: string;
    }
  | { type: "session_mode"; mode: SessionMode }
  | { type: "join_group"; groupId: string; studentName?: string; studentToken?: string }
  | { type: "assign_group"; submissionId: string; groupId: string }
  | { type: "writing_lock"; locked: boolean }
  | { type: "chat_mute"; submissionId: string; muted: boolean }
  | { type: "student_lock"; submissionId: string; locked: boolean }
  | { type: "chat_anonymous_mode"; enabled: boolean }
  | { type: "vote_result_toggle"; isResultPublic: boolean }
  | { type: "session_close" }
  | { type: "session_code_change"; newCode: string }
  | { type: "set_projection"; projectedType: string | null; targetId?: string | null }
  | { type: "remove_student"; submissionId: string };

