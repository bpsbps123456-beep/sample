"use client";

import type { ClassroomSyncAction } from "@/lib/types/classroom-actions";

/**
 * 서버(classroom API)로 액션을 동기화합니다.
 * 클라이언트에서만 동작하며, worksheetId가 없으면 무시합니다.
 */
export function syncClassroomAction(worksheetId: string, action: ClassroomSyncAction) {
  if (typeof window === "undefined" || !worksheetId) {
    return;
  }

  void fetch(`/api/classroom/${worksheetId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(action),
  }).catch(() => undefined);
}
