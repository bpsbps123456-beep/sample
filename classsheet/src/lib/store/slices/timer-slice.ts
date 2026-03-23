"use client";

import { syncClassroomAction } from "@/lib/store/utils/sync-action";

// ─── State & Actions 타입 ────────────────────────────────────────────────────

export interface TimerSliceState {
  timerSecondsRemaining: number;
  timerRunning: boolean;
}

export interface TimerSliceActions {
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  setTimer: (seconds: number) => void;
  decideTimerTimeout: (decision: "lock" | "extend", seconds?: number) => void;
}

export type TimerSlice = TimerSliceState & TimerSliceActions;

export const timerSliceDefaults: TimerSliceState = {
  timerSecondsRemaining: 0,
  timerRunning: false,
};

// ─── 로컬 타이머 핸들 (모듈 레벨, 브라우저 setInterval ID) ──────────────────

let timerHandle: number | null = null;

/** 기존에 실행 중인 로컬 타이머 interval을 정리합니다. */
export function clearTimerHandle(): void {
  if (typeof window === "undefined") {
    timerHandle = null;
    return;
  }
  if (timerHandle) {
    window.clearInterval(timerHandle);
    timerHandle = null;
  }
}

/**
 * timer_end_at 절대 시각 기준으로 남은 시간을 계산해 매 틱마다 보정합니다.
 * timerEndAt이 없으면 단순 카운트다운 방식으로 fallback합니다.
 */
export function startLocalTimer(
  setter: (
    updater: (state: TimerSliceState) => Partial<TimerSliceState>,
  ) => void,
  timerEndAt?: string | null,
): void {
  clearTimerHandle();

  if (typeof window === "undefined") {
    return;
  }

  timerHandle = window.setInterval(() => {
    setter((state) => {
      const remaining = timerEndAt
        ? Math.max(0, Math.round((new Date(timerEndAt).getTime() - Date.now()) / 1000))
        : Math.max(0, state.timerSecondsRemaining - 1);

      if (remaining <= 0) {
        clearTimerHandle();
        return { timerSecondsRemaining: 0, timerRunning: false };
      }

      return { timerSecondsRemaining: remaining };
    });
  }, 1000);
}

// ─── set / get 최소 타입 정의 (순환 의존성 방지) ──────────────────────────

/** 타이머 액션에서 필요한 상태 필드만 기술한 최소 타입 */
interface TimerActionState {
  timerSecondsRemaining: number;
  timerRunning: boolean;
  isLocked: boolean;
  worksheetId: string;
}

type TimerSetFn = (
  partial:
    | Partial<TimerActionState>
    | ((state: TimerSliceState) => Partial<TimerSliceState>),
) => void;
type TimerGetFn = () => TimerActionState;

// ─── 액션 팩토리 ────────────────────────────────────────────────────────────

export function createTimerActions(set: TimerSetFn, get: TimerGetFn): TimerSliceActions {
  return {
    startTimer: () => {
      clearTimerHandle();
      set({ timerRunning: true, isLocked: false });
      const seconds = get().timerSecondsRemaining;
      const timerEndAt = new Date(Date.now() + seconds * 1000).toISOString();
      syncClassroomAction(get().worksheetId, { type: "timer", command: "start", seconds });
      startLocalTimer(set, timerEndAt);
    },

    pauseTimer: () => {
      clearTimerHandle();
      set({ timerRunning: false });
      syncClassroomAction(get().worksheetId, {
        type: "timer",
        command: "pause",
        seconds: get().timerSecondsRemaining,
      });
    },

    resetTimer: () => {
      clearTimerHandle();
      set({ timerSecondsRemaining: 0, timerRunning: false, isLocked: false });
      syncClassroomAction(get().worksheetId, { type: "timer", command: "reset" });
    },

    setTimer: (seconds) => {
      clearTimerHandle();
      const safeSeconds = Math.max(0, seconds);
      set({ timerSecondsRemaining: safeSeconds, timerRunning: false });
      syncClassroomAction(get().worksheetId, { type: "timer", command: "set", seconds: safeSeconds });
    },

    decideTimerTimeout: (decision, seconds) => {
      clearTimerHandle();
      if (decision === "lock") {
        set({ isLocked: true, timerRunning: false, timerSecondsRemaining: 0 });
      } else {
        const safeSeconds = Math.max(0, seconds ?? 0);
        const timerEndAt = safeSeconds > 0
          ? new Date(Date.now() + safeSeconds * 1000).toISOString()
          : null;
        set({ isLocked: false, timerRunning: safeSeconds > 0, timerSecondsRemaining: safeSeconds });
        if (safeSeconds > 0) {
          startLocalTimer(set, timerEndAt);
        }
      }
      syncClassroomAction(get().worksheetId, { type: "timer_timeout_decision", decision, seconds });
    },
  };
}
