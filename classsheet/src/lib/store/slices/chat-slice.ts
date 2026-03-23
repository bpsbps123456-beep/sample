"use client";

import type { ChatMessage } from "@/lib/types/domain";
import type { ChatMessageRow } from "@/lib/realtime-transforms";
import { syncClassroomAction } from "@/lib/store/utils/sync-action";

// ─── 상수 ────────────────────────────────────────────────────────────────────

/** 메모리에 유지할 최대 채팅 메시지 수 */
export const CHAT_MAX_MESSAGES = 200;

// ─── State & Actions 타입 ────────────────────────────────────────────────────

export interface ChatSliceState {
  chatMessages: ChatMessage[];
  chatEnabled: boolean;
  chatPaused: boolean;
  chatAnonymousMode: boolean;
}

export interface ChatSliceActions {
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
  toggleChatAnonymousMode: () => void;
  handleChatInsert: (row: ChatMessageRow) => void;
  handleChatUpdate: (row: ChatMessageRow) => void;
  handleChatDelete: (id: string) => void;
}

export type ChatSlice = ChatSliceState & ChatSliceActions;

export const chatSliceDefaults: ChatSliceState = {
  chatMessages: [],
  chatEnabled: false,
  chatPaused: false,
  chatAnonymousMode: false,
};

// ─── set / get 최소 타입 정의 ─────────────────────────────────────────────

interface ChatActionState extends ChatSliceState {
  worksheetId: string;
  sessionClosed: boolean;
}

type ChatSetFn = (
  partial:
    | Partial<ChatSliceState>
    | ((state: ChatSliceState) => Partial<ChatSliceState>),
) => void;

type ChatGetFn = () => ChatActionState;

// ─── 액션 팩토리 ─────────────────────────────────────────────────────────────

export function createChatActions(set: ChatSetFn, get: ChatGetFn): ChatSliceActions {
  return {
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
        chatMessages: [...state.chatMessages, optimisticMsg].slice(-CHAT_MAX_MESSAGES),
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

    toggleChatAnonymousMode: () => {
      const enabled = !get().chatAnonymousMode;
      set({ chatAnonymousMode: enabled });
      syncClassroomAction(get().worksheetId, { type: "chat_anonymous_mode", enabled });
    },

    // ─── 실시간 핸들러 ────────────────────────────────────────────────────────

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
        // 중복 메시지 방지 (낙관적 업데이트로 이미 추가된 경우)
        if (state.chatMessages.some((m) => m.id === row.id)) return {};
        return {
          chatMessages: [...state.chatMessages, newMsg].slice(-CHAT_MAX_MESSAGES),
        };
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
  };
}
