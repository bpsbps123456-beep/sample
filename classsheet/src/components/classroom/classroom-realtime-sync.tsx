"use client";

import { useEffect } from "react";

import type {
  ChatMessageRow,
  GalleryReactionRow,
  GroupRow,
  HelpRequestRow,
  PresenceRow,
  SubmissionRow,
  VoteResponseRow,
  VoteRow,
  WorksheetRow,
} from "@/lib/realtime-transforms";
import { useClassroomStore } from "@/lib/store/classroom-store";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

interface ClassroomRealtimeSyncProps {
  worksheetId: string;
}

type PgPayload = {
  new: unknown;
  old: unknown;
  eventType: "INSERT" | "UPDATE" | "DELETE" | "*";
};

export function ClassroomRealtimeSync({ worksheetId }: ClassroomRealtimeSyncProps) {
  const handleWorksheetUpdate = useClassroomStore((s) => s.handleWorksheetUpdate);
  const handleSubmissionUpsert = useClassroomStore((s) => s.handleSubmissionUpsert);
  const handleSubmissionDelete = useClassroomStore((s) => s.handleSubmissionDelete);
  const handleChatInsert = useClassroomStore((s) => s.handleChatInsert);
  const handleChatUpdate = useClassroomStore((s) => s.handleChatUpdate);
  const handleChatDelete = useClassroomStore((s) => s.handleChatDelete);
  const handleHelpInsert = useClassroomStore((s) => s.handleHelpInsert);
  const handleHelpDelete = useClassroomStore((s) => s.handleHelpDelete);
  const handleVoteUpsert = useClassroomStore((s) => s.handleVoteUpsert);
  const handleVoteResponseInsert = useClassroomStore((s) => s.handleVoteResponseInsert);
  const handleVoteResponseDelete = useClassroomStore((s) => s.handleVoteResponseDelete);
  const handleReactionInsert = useClassroomStore((s) => s.handleReactionInsert);
  const handleGroupUpsert = useClassroomStore((s) => s.handleGroupUpsert);
  const handlePresenceUpsert = useClassroomStore((s) => s.handlePresenceUpsert);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      console.error("[RealtimeSync] ❌ Supabase 클라이언트를 생성할 수 없습니다. 환경 변수를 확인하세요.");
      return;
    }

    console.log("[RealtimeSync] 🔌 채널 구독 시작...", worksheetId);

    const resubscribeWithJitter = (baseDelayMs: number) => {
      const jitterMs = Math.floor(Math.random() * 2000);
      window.setTimeout(() => {
        channel.subscribe();
      }, baseDelayMs + jitterMs);
    };

    const channel = supabase
      .channel(`classroom-sync-${worksheetId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "worksheets", filter: `id=eq.${worksheetId}` },
        (payload: PgPayload) => {
          console.log("[RealtimeSync] 📥 worksheets UPDATE 수신");
          handleWorksheetUpdate(payload.new as WorksheetRow);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "submissions",
          filter: `worksheet_id=eq.${worksheetId}`,
        },
        (payload: PgPayload) => {
          console.log("[RealtimeSync] 📥 submissions INSERT 수신");
          handleSubmissionUpsert(payload.new as SubmissionRow);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "submissions",
          filter: `worksheet_id=eq.${worksheetId}`,
        },
        (payload: PgPayload) => {
          console.log("[RealtimeSync] 📥 submissions UPDATE 수신");
          handleSubmissionUpsert(payload.new as SubmissionRow);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "submissions",
          filter: `worksheet_id=eq.${worksheetId}`,
        },
        (payload: PgPayload) => handleSubmissionDelete((payload.old as { id: string }).id),
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `worksheet_id=eq.${worksheetId}`,
        },
        (payload: PgPayload) => {
          console.log("[RealtimeSync] 📥 chat_messages INSERT 수신");
          handleChatInsert(payload.new as ChatMessageRow);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `worksheet_id=eq.${worksheetId}`,
        },
        (payload: PgPayload) => handleChatUpdate(payload.new as ChatMessageRow),
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "chat_messages",
          filter: `worksheet_id=eq.${worksheetId}`,
        },
        (payload: PgPayload) => handleChatDelete((payload.old as { id: string }).id),
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "help_requests",
          filter: `worksheet_id=eq.${worksheetId}`,
        },
        (payload: PgPayload) => handleHelpInsert(payload.new as HelpRequestRow),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "help_requests",
          filter: `worksheet_id=eq.${worksheetId}`,
        },
        (payload: PgPayload) => {
          const row = payload.new as HelpRequestRow;
          if (row.resolved_at) handleHelpDelete(row.id);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "votes",
          filter: `worksheet_id=eq.${worksheetId}`,
        },
        (payload: PgPayload) => handleVoteUpsert(payload.new as VoteRow),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "votes",
          filter: `worksheet_id=eq.${worksheetId}`,
        },
        (payload: PgPayload) => handleVoteUpsert(payload.new as VoteRow),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "vote_responses" },
        (payload: PgPayload) => {
          const row = payload.new as VoteResponseRow;
          handleVoteResponseInsert(row.vote_id, row.response);
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "vote_responses" },
        (payload: PgPayload) => {
          const row = payload.old as VoteResponseRow;
          handleVoteResponseDelete(row.vote_id, row.response);
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "gallery_reactions" },
        (payload: PgPayload) => handleReactionInsert(payload.new as GalleryReactionRow),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "groups",
          filter: `worksheet_id=eq.${worksheetId}`,
        },
        (payload: PgPayload) => {
          if (payload.eventType !== "DELETE") {
            handleGroupUpsert(payload.new as GroupRow);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "presence_sessions",
          filter: `worksheet_id=eq.${worksheetId}`,
        },
        (payload: PgPayload) => {
          if (payload.eventType !== "DELETE") {
            handlePresenceUpsert(payload.new as PresenceRow);
          }
        },
      )
      .subscribe((status: string, err?: Error) => {
        console.log("[RealtimeSync] 채널 상태:", status);
        if (status === "SUBSCRIBED") {
          console.log("[RealtimeSync] ✅ 실시간 동기화 연결 성공!");
        }
        if (status === "CHANNEL_ERROR") {
          resubscribeWithJitter(5000);
          return;
        }
        if (status === "__UNUSED_CHANNEL_ERROR_FALLBACK__") {
          console.error("[RealtimeSync] ❌ 채널 에러:", err?.message ?? "unknown");
          // 5초 후 자동 재연결 시도
          setTimeout(() => {
            console.log("[RealtimeSync] 🔄 재연결 시도...");
            channel.subscribe();
          }, 5000);
        }
        if (status === "TIMED_OUT") {
          resubscribeWithJitter(3000);
          return;
        }
        if (status === "__UNUSED_TIMED_OUT_FALLBACK__") {
          console.error("[RealtimeSync] ⏰ 채널 타임아웃 — 재연결 시도...");
          setTimeout(() => {
            channel.subscribe();
          }, 3000);
        }
      });

    return () => {
      console.log("[RealtimeSync] 🔌 채널 구독 해제");
      void supabase.removeChannel(channel);
    };
  }, [
    worksheetId,
    handleWorksheetUpdate,
    handleSubmissionUpsert,
    handleSubmissionDelete,
    handleChatInsert,
    handleChatUpdate,
    handleHelpInsert,
    handleHelpDelete,
    handleVoteUpsert,
    handleVoteResponseInsert,
    handleVoteResponseDelete,
    handleReactionInsert,
    handleGroupUpsert,
    handlePresenceUpsert,
  ]);

  return null;
}
