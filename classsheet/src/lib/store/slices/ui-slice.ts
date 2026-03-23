"use client";

export interface UISliceState {
  showChat: boolean;
  showTimer: boolean;
  showVote: boolean;
}

export interface UISliceActions {
  toggleShowChat: () => void;
  toggleShowTimer: () => void;
  toggleShowVote: () => void;
}

export type UISlice = UISliceState & UISliceActions;

export const uiSliceDefaults: UISliceState = {
  showChat: true,
  showTimer: false,
  showVote: false,
};

type SetFn = (updater: (s: UISliceState) => Partial<UISliceState>) => void;

export function createUIActions(set: SetFn): UISliceActions {
  return {
    toggleShowChat: () => set((s) => ({ showChat: !s.showChat })),
    toggleShowTimer: () => set((s) => ({ showTimer: !s.showTimer })),
    toggleShowVote: () => set((s) => ({ showVote: !s.showVote })),
  };
}
