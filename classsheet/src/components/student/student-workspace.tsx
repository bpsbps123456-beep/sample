"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { DrawingCanvas } from "@/components/student/drawing-canvas";
import { useClassroomStore } from "@/lib/store/classroom-store";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  clearStoredStudentEntry,
  readStoredStudentEntry,
  writeStoredStudentEntry,
} from "@/lib/student-session";
import type { FontSizeMode, GalleryCard, VoteType, WorksheetComponent } from "@/lib/types/domain";
import { formatCountdown } from "@/lib/utils";

type DraftAnswers = Record<string, string | string[]>;

const FS = {
  title:  { sm: "text-xl",     md: "text-2xl",     lg: "text-3xl"     },
  body:   { sm: "text-base",   md: "text-lg",      lg: "text-xl"      },
  input:  { sm: "text-lg",     md: "text-xl",      lg: "text-2xl"     },
  choice: { sm: "text-lg",     md: "text-xl",      lg: "text-2xl"     },
  ox:     { sm: "text-[72px]", md: "text-[96px]",  lg: "text-[120px]" },
} as const;

function fs<K extends keyof typeof FS>(ctx: K, mode: FontSizeMode | undefined): string {
  return FS[ctx][mode ?? "sm"];
}

function draftKey(worksheetId: string, sessionCode: string, identity: string) {
  return worksheetId && sessionCode && identity
    ? `classsheet-draft-${sessionCode}-${worksheetId}-${identity}`
    : null;
}

function isFilled(value: string | string[] | undefined) {
  return Array.isArray(value) ? value.length > 0 : Boolean(value?.trim());
}

function labelForVote(type: VoteType) {
  return type === "wordcloud"
    ? "워드클라우드"
    : type === "slider"
      ? "슬라이더 투표"
      : type === "ox"
        ? "O/X 투표"
        : "객관식 투표";
}

export function StudentWorkspace() {
  const router = useRouter();
  const storedEntry = readStoredStudentEntry();
  const studentName = storedEntry?.studentName?.trim() || "학생";
  const studentToken = storedEntry?.studentToken;
  const authUserId = storedEntry?.authUserId;
  const identity = studentToken ?? authUserId ?? studentName;

  const worksheetId = useClassroomStore((s) => s.worksheetId);
  const sessionCode = useClassroomStore((s) => s.sessionCode);
  const worksheetTitle = useClassroomStore((s) => s.worksheetTitle);
  const subject = useClassroomStore((s) => s.subject);
  const learningGoal = useClassroomStore((s) => s.learningGoal);
  const currentPage = useClassroomStore((s) => s.currentPage);
  const totalPages = useClassroomStore((s) => s.totalPages);
  const isActive = useClassroomStore((s) => s.isActive);
  const isLocked = useClassroomStore((s) => s.isLocked);
  const sessionClosed = useClassroomStore((s) => s.sessionClosed);
  const timerSecondsRemaining = useClassroomStore((s) => s.timerSecondsRemaining);
  const focusMode = useClassroomStore((s) => s.focusMode);
  const chatEnabled = useClassroomStore((s) => s.chatEnabled);
  const chatPaused = useClassroomStore((s) => s.chatPaused);
  const galleryOpen = useClassroomStore((s) => s.galleryOpen);
  const galleryFilterQuestion = useClassroomStore((s) => s.galleryFilterQuestion);
  const anonymousGallery = useClassroomStore((s) => s.anonymousGallery);
  const sessionMode = useClassroomStore((s) => s.sessionMode);
  const groups = useClassroomStore((s) => s.groups);
  const students = useClassroomStore((s) => s.students);
  const components = useClassroomStore((s) => s.components);
  const chatMessages = useClassroomStore((s) => s.chatMessages);
  const galleryCards = useClassroomStore((s) => s.galleryCards);
  const activeVote = useClassroomStore((s) => s.activeVote);
  const voteSummary = useClassroomStore((s) => s.voteSummary);
  const registerStudent = useClassroomStore((s) => s.registerStudent);
  const syncAnswers = useClassroomStore((s) => s.syncAnswers);
  const updateStudentProgress = useClassroomStore((s) => s.updateStudentProgress);
  const submitStudent = useClassroomStore((s) => s.submitStudent);
  const unsubmitStudent = useClassroomStore((s) => s.unsubmitStudent);
  const addHelpRequest = useClassroomStore((s) => s.addHelpRequest);
  const sendChatMessage = useClassroomStore((s) => s.sendChatMessage);
  const castVote = useClassroomStore((s) => s.castVote);
  const addReaction = useClassroomStore((s) => s.addReaction);
  const joinGroup = useClassroomStore((s) => s.joinGroup);
  const chatAnonymousMode = useClassroomStore((s) => s.chatAnonymousMode);

  const [answers, setAnswers] = useState<DraftAnswers>({});
  const [chatDraft, setChatDraft] = useState("");
  const [voteDraft, setVoteDraft] = useState("");
  const [galleryMode, setGalleryMode] = useState<"grid" | "slide">("grid");
  const [selectedGalleryIndex, setSelectedGalleryIndex] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(storedEntry?.groupId ?? null);
  const [submittedVoteId, setSubmittedVoteId] = useState<string | null>(null);
  const [helpSent, setHelpSent] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activePage, setActivePage] = useState(1);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const presenceJitterMsRef = useRef(Math.floor(Math.random() * 2500));

  const currentStudent = useMemo(
    () => students.find((s) => s.id === storedEntry?.submissionId || s.studentName === studentName) ?? null,
    [studentName, students, storedEntry?.submissionId],
  );
  const submitted = currentStudent?.submitted ?? false;
  const currentGroupId = currentStudent?.groupId ?? selectedGroupId;
  const answerable = useMemo(
    () => components.filter((c) => !["prompt", "divider"].includes(c.type)),
    [components],
  );

  const pages = useMemo(
    () =>
      Array.from({ length: Math.max(totalPages, 1) }, (_, i) => ({
        page: i + 1,
        items: components.filter((c) => c.page === i + 1),
      })),
    [components, totalPages],
  );
  const visibleGalleryCards = useMemo(() => galleryCards.filter((c) => c.visible), [galleryCards]);
  const selectedGalleryCard =
    selectedGalleryIndex !== null ? visibleGalleryCards[selectedGalleryIndex] ?? null : null;
  const storageKey = draftKey(worksheetId, sessionCode, identity);
  const completedCount = answerable.filter((c) => isFilled(answers[c.id])).length;
  const chatMuted = currentStudent?.chatMuted ?? false;
  const canEdit = isActive && !isLocked && !sessionClosed && !focusMode && !submitted && !(currentStudent?.writingLocked ?? false);
  // 그림은 제출 후에도 수정 가능
  const canDraw = isActive && !isLocked && !sessionClosed && !focusMode && !(currentStudent?.writingLocked ?? false);
  const currentQuestion =
    answerable.find((c) => c.page === currentPage && !isFilled(answers[c.id]))?.title ??
    answerable.find((c) => !isFilled(answers[c.id]))?.title ??
    "현재 문항";
  const progressPct = answerable.length ? Math.round((completedCount / answerable.length) * 100) : 0;
  const timerLow = timerSecondsRemaining > 0 && timerSecondsRemaining <= 60;
  const writingLockedByTeacher = currentStudent?.writingLocked ?? false;

  // Sync activePage with teacher's currentPage on first load or if we are behind (optional)
  const isFirstLoad = useRef(true);
  useEffect(() => {
    if (currentPage > 1 && isFirstLoad.current) {
      setActivePage(currentPage);
      isFirstLoad.current = false;
    }
  }, [currentPage]);

  useEffect(() => {
    if (worksheetId) {
      registerStudent(studentName, studentToken);
    }
  }, [registerStudent, studentName, studentToken, worksheetId]);

  useEffect(() => {
    if (!currentGroupId || !sessionCode) return;
    writeStoredStudentEntry({ sessionCode, studentName, studentToken, submissionId: storedEntry?.submissionId ?? null, authUserId, groupId: currentGroupId });
  }, [authUserId, currentGroupId, sessionCode, storedEntry?.submissionId, studentName, studentToken]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = storageKey ? window.localStorage.getItem(storageKey) : null;
    const saved = raw ? (JSON.parse(raw) as DraftAnswers) : {};
    const t = window.setTimeout(() => setAnswers(saved), 0);
    return () => window.clearTimeout(t);
  }, [storageKey]);

  // LocalStorage save (fast)
  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    const t = window.setTimeout(() => {
      window.localStorage.setItem(storageKey, JSON.stringify(answers));
    }, 200);
    return () => window.clearTimeout(t);
  }, [answers, storageKey]);

  // DB Sync (medium-fast)
  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    const t = window.setTimeout(() => {
      syncAnswers(studentName, answers, studentToken);
    }, 1000);
    return () => window.clearTimeout(t);
  }, [answers, storageKey, studentName, studentToken, syncAnswers]);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    const h = window.setInterval(() => {
      window.localStorage.setItem(storageKey, JSON.stringify(answers));
      syncAnswers(studentName, answers, studentToken);
    }, 30_000);
    return () => window.clearInterval(h);
  }, [answers, storageKey, studentName, studentToken, syncAnswers]);

  // Heartbeat & Progress sync — debounced to avoid connection flooding on typing
  useEffect(() => {
    if (!isActive || !canEdit) return;
    const t = window.setTimeout(() => {
      updateStudentProgress(studentName, progressPct, currentQuestion, studentToken);
    }, 4000 + presenceJitterMsRef.current); // Stagger simultaneous refresh bursts without touching answer/chat sync
    return () => window.clearTimeout(t);
  }, [isActive, canEdit, progressPct, currentQuestion, studentName, studentToken, updateStudentProgress]);

  // Regular heartbeat to keep presence alive (even if not typing)
  useEffect(() => {
    if (!isActive) return;
    let intervalId: number | null = null;
    const timeoutId = window.setTimeout(() => {
      updateStudentProgress(studentName, progressPct, currentQuestion, studentToken);
      intervalId = window.setInterval(() => {
        updateStudentProgress(studentName, progressPct, currentQuestion, studentToken);
      }, 60_000);
    }, presenceJitterMsRef.current);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [isActive, progressPct, currentQuestion, studentName, studentToken, updateStudentProgress]);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatMessages]);

  // Handle being removed by teacher
  useEffect(() => {
    if (storedEntry?.submissionId && students.length > 0) {
      const stillInSession = students.some((s) => s.id === storedEntry.submissionId);
      if (!stillInSession && !isSwitching) {
        // We were in the session (had a submissionId) but now we're not in the list.
        // This means the teacher removed us.
        alert("교사에 의해 수업에서 제외되었습니다.");
        void switchStudent();
      }
    }
  }, [students, storedEntry?.submissionId, isSwitching]);

  async function switchStudent() {
    setIsSwitching(true);
    clearStoredStudentEntry();
    try {
      const supabase = createSupabaseBrowserClient();
      if (supabase) await supabase.auth.signOut();
    } catch {
      // signOut 실패해도 /join으로 이동
    }
    router.push("/join");
  }

  function updateAnswer(component: WorksheetComponent, value: string | string[]) {
    // 그림은 제출 후에도 수정 가능, 나머지는 canEdit 체크
    if (!canEdit && component.type !== "drawing") return;
    if (component.type === "drawing" && !canDraw) return;
    
    // 로컬 상태만 즉시 업데이트 (동기화는 useEffect에서 처리)
    const next = { ...answers, [component.id]: value };
    setAnswers(next);

    // 그림은 업로드 직후 즉시 DB에 반영해야 갤러리에 표시됨
    if (component.type === "drawing") {
      syncAnswers(studentName, next, studentToken);
    }
  }

  function galleryName(card: GalleryCard) {
    return anonymousGallery ? card.anonymousLabel : card.displayName;
  }

  function renderComponent(component: WorksheetComponent, editable: boolean, questionNumber?: number) {
    if (component.type === "prompt") {
      return (
        <div className="mb-10 mt-2 z-10 w-full relative">
          {component.title && (
            <div className="mb-4">
              <h3 className={`inline-flex items-center font-black text-slate-900 tracking-tight border-b-4 border-slate-700 pb-1.5 pr-8 relative ${fs("title", component.titleFontSize)}`}>
                {component.title}
                <div className="absolute -top-3 right-0 text-2xl opacity-90 drop-shadow-sm rotate-12">📌</div>
              </h3>
            </div>
          )}
          <div className="px-1">
            <p className={`whitespace-pre-wrap text-slate-800 leading-[1.8] font-bold ${fs("body", component.bodyFontSize)}`}>{component.body}</p>
          </div>
        </div>
      );
    }
    if (component.type === "divider") {
      return (
        <div className="my-10 w-full z-10 relative flex justify-center">
          <div className="w-full h-px" style={{ backgroundImage: "linear-gradient(to right, #cbd5e1 50%, transparent 50%)", backgroundSize: "14px 1px" }} />
        </div>
      );
    }
    return (
      <div className="py-8 border-b-2 border-slate-200/50 border-dashed last:border-0 relative z-10">
        <div className="flex items-start gap-3 sm:gap-4">
          {questionNumber !== undefined && (
            <span className="flex-shrink-0 mt-0.5 text-3xl md:text-4xl font-serif font-black italic text-slate-800 tracking-tighter drop-shadow-sm">{questionNumber}.</span>
          )}
          <div className="flex-1 min-w-0 pt-1">
            <div className={`font-black leading-snug text-slate-900 break-words tracking-tight ${fs("title", component.titleFontSize)}`}>
              {component.title}
            </div>
            {component.description ? (
              <p className={`mt-2.5 leading-relaxed text-slate-600 font-bold bg-white/50 inline-block px-3 py-1.5 rounded-sm ${fs("body", component.bodyFontSize)}`}>{component.description}</p>
            ) : null}

            {component.type === "short_text" || component.type === "long_text" ? (
              <div className="mt-6 ml-0">
                <textarea
                  value={typeof answers[component.id] === "string" ? (answers[component.id] as string) : ""}
                  onChange={(e) => updateAnswer(component, e.target.value)}
                  disabled={!editable}
                  placeholder={component.placeholder || "여기에 답을 적어주세요..."}
                  spellCheck={false}
                  className={`w-full resize-none border-none outline-none p-0 text-slate-800 font-bold disabled:opacity-70 disabled:bg-transparent bg-transparent placeholder:font-medium placeholder:text-slate-300 ${fs("input", component.titleFontSize)}`}
                  style={{
                    backgroundImage: 'linear-gradient(transparent 38px, #94a3b8 38px, #94a3b8 40px)',
                    backgroundSize: '100% 40px',
                    lineHeight: '40px',
                    minHeight: component.type === "short_text" ? '120px' : '240px'
                  }}
                />
              </div>
            ) : null}

            {component.type === "drawing" ? (
              <div className="mt-6 ml-0 overflow-hidden border-[3px] border-slate-300/60 rounded-sm bg-white shadow-sm ring-4 ring-white/50 relative">
                <DrawingCanvas
                  worksheetId={worksheetId}
                  sessionCode={sessionCode}
                  componentId={component.id}
                  studentName={studentName}
                  disabled={!canDraw}
                  value={typeof answers[component.id] === "string" ? (answers[component.id] as string) : undefined}
                  onChange={(v) => updateAnswer(component, v)}
                />
              </div>
            ) : null}

            {(component.type === "single_choice" || component.type === "multi_choice") && "options" in component ? (
              <div className="mt-6 ml-0 flex flex-col gap-3">
                {component.options.map((opt, idx) => {
                  const selected = component.type === "single_choice"
                    ? answers[component.id] === opt
                    : Array.isArray(answers[component.id]) && (answers[component.id] as string[]).includes(opt);
                  return (
                    <button
                      key={opt} type="button" disabled={!editable}
                      onClick={() => {
                        const next = component.type === "single_choice"
                          ? opt
                          : (Array.isArray(answers[component.id]) ? (answers[component.id] as string[]) : []).includes(opt)
                            ? (answers[component.id] as string[]).filter((v) => v !== opt)
                            : [...(Array.isArray(answers[component.id]) ? (answers[component.id] as string[]) : []), opt];
                        updateAnswer(component, next);
                      }}
                      className={`flex items-center gap-4 text-left px-5 py-4 rounded-sm border-2 transition-all ${
                        selected 
                          ? "border-slate-800 bg-slate-800 text-white shadow-md shadow-slate-900/10 scale-[1.01]" 
                          : "border-slate-300 bg-white/50 text-slate-700 hover:border-slate-400 hover:bg-white"
                      }`}
                    >
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0 ${
                        selected ? "border-transparent text-white" : "border-slate-300 text-slate-400"
                      }`}>
                        {component.type === "single_choice" ? (
                          <span className="font-bold">{idx + 1}</span>
                        ) : (
                          selected ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> : <span className="font-bold">{idx + 1}</span>
                        )}
                      </div>
                      <span className={`${fs("choice", component.titleFontSize)} ${selected ? "font-black" : "font-bold"}`}>
                        {opt}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {component.type === "ox" ? (
              <div className="mt-6 ml-0 flex gap-4">
                {(["O", "X"] as const).map((opt) => {
                  const sel = answers[component.id] === opt;
                  return (
                    <button
                      key={opt} type="button" disabled={!editable}
                      onClick={() => updateAnswer(component, opt)}
                      className={`flex-1 flex flex-col items-center justify-center py-6 border-4 rounded-sm transition-all ${
                        sel
                          ? opt === "O"
                            ? "border-emerald-500 text-emerald-600 bg-emerald-50 shadow-[4px_4px_0_0_#10b981] scale-105"
                            : "border-rose-500 text-rose-600 bg-rose-50 shadow-[4px_4px_0_0_#f43f5e] scale-105"
                          : "border-slate-300 bg-white/50 text-slate-300 hover:border-slate-400 hover:text-slate-400"
                      }`}
                    >
                      <span className={`font-black leading-none font-serif ${fs("ox", component.titleFontSize)}`}>{opt}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}

          </div>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────
     LAYOUT
  ───────────────────────────────────────── */
  return (
    <div className="flex min-h-screen flex-col">

      {/* ── Top navigation ── */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 px-3 py-3">
          <div className="min-w-0 flex-1">
            {subject ? (
              <div className="muted-label leading-none">{subject}</div>
            ) : null}
            <div className={`truncate font-bold text-slate-900 ${subject ? "mt-0.5 text-[15px]" : "text-base"}`}>
              {worksheetTitle || "학생 활동지"}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            {/* 도움 요청 */}
            {!submitted && (
              <button
                onClick={() => {
                  addHelpRequest(studentName, currentQuestion, studentToken);
                  setHelpSent(true);
                  window.setTimeout(() => setHelpSent(false), 3000);
                }}
                disabled={helpSent}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${helpSent ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
              >
                {helpSent ? "✓ 요청됨" : "도움 요청"}
              </button>
            )}

            {/* Timer */}
            <div className={`rounded-xl px-4 py-2 text-[15px] font-mono font-bold tabular-nums leading-none ${
              timerLow
                ? "bg-rose-50 text-rose-600 ring-1 ring-rose-200"
                : timerSecondsRemaining > 0
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-400"
            }`}>
              {formatCountdown(timerSecondsRemaining)}
            </div>

            {/* Page navigation */}
            {totalPages > 1 ? (
              <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
                <button
                  onClick={() => setActivePage((p) => Math.max(1, p - 1))}
                  disabled={activePage === 1}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-all hover:bg-white hover:text-slate-900 disabled:opacity-30"
                >
                  <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <span className="min-w-[48px] text-center text-sm font-bold text-slate-700">{activePage} / {totalPages}</span>
                <button
                  onClick={() => setActivePage((p) => Math.min(currentPage, p + 1))}
                  disabled={activePage >= currentPage}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-all hover:bg-white hover:text-slate-900 disabled:opacity-30"
                >
                  <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            ) : null}

            {/* 제출 / 회수 버튼 */}
            {!sessionClosed && activePage === totalPages && (
              submitted ? (
                <div className="flex items-center gap-1.5">
                  <span className="hidden items-center gap-1 text-xs font-bold text-emerald-600 sm:flex">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    제출완료
                  </span>
                </div>
              ) : (
                <button
                  onClick={async () => {
                    if (isSubmitting) return;
                    setIsSubmitting(true);
                    await submitStudent(studentName, studentToken);
                    setIsSubmitting(false);
                  }}
                  disabled={isSubmitting}
                  className="action-primary rounded-xl px-4 py-2 text-sm font-bold shadow-sm shadow-teal-500/20 disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none"
                >
                  {isSubmitting ? "제출 중..." : "제출하기 →"}
                </button>
              )
            )}

            {/* Student name + switch */}
            <button
              onClick={switchStudent}
              disabled={isSwitching}
              className="hidden rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 sm:block"
            >
              {isSwitching ? "전환 중..." : `${studentName} ↺`}
            </button>
          </div>
        </div>

        {/* Status Banners (Visible when writing is restricted) */}
        {!focusMode && (
          <>
            {isLocked && (
              <div className="flex items-center gap-2 border-t border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700">
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                전체 쓰기가 잠겨 있습니다. 교사가 해제하면 다시 작성할 수 있습니다.
              </div>
            )}
            {writingLockedByTeacher && (
              <div className="flex items-center gap-2 border-t border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700">
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                현재 쓰기가 제한되었습니다. (교사가 보낸 메시지를 확인하세요)
              </div>
            )}
            {submitted && !sessionClosed && (
              <div className="flex items-center justify-between border-t border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
                <div className="flex items-center gap-2">
                  <svg className="h-3.5 w-3.5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  답안을 제출했습니다. 수정하려면 '회수하기'를 클릭하세요.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("제출을 회수하시겠습니까? 답변을 수정한 후 다시 제출할 수 있습니다.")) {
                      unsubmitStudent(studentName, studentToken);
                    }
                  }}
                  className="rounded-md border border-emerald-200 bg-white px-2 py-0.5 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50"
                >
                  ↺ 회수하기
                </button>
              </div>
            )}
            {sessionClosed && (
              <div className="flex items-center gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600">
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                수업이 종료되어 더 이상 내용을 수정할 수 없습니다.
              </div>
            )}
          </>
        )}

        {/* Progress line */}
        {answerable.length > 0 ? (
          <div className="h-0.5 bg-slate-100">
            <div
              className="h-full bg-teal-500 transition-all duration-700 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        ) : null}
      </nav>

      {/* ── Body ── */}
      <div className="flex-1">

        {!isActive && !sessionClosed ? (
          /* Waiting room */
          <div className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center gap-8 px-6 py-12">

            {/* 학습 목표 카드 — 핵심 */}
            {learningGoal ? (
              <div className="w-full max-w-md">
                <p className="mb-2 text-center text-[10px] font-black uppercase tracking-[0.25em] text-teal-500">오늘의 학습 목표</p>
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 px-7 py-6 shadow-xl shadow-teal-500/20">
                  <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
                  <div className="absolute -bottom-6 -left-4 h-20 w-20 rounded-full bg-black/10" />
                  <p className="relative text-lg font-bold leading-snug text-white">{learningGoal}</p>
                </div>
              </div>
            ) : null}

            {/* 대기 상태 */}
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="relative flex h-16 w-16 items-center justify-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-teal-400/15" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
                  <svg className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                  </svg>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-teal-600">{studentName}님, 안녕하세요!</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">수업 시작을 기다리는 중</h2>
                <p className="mt-1 text-sm text-slate-400">교사가 수업을 시작하면 자동으로 열립니다</p>
              </div>
              <div className="rounded-xl bg-slate-900 px-7 py-2.5 text-xl font-bold tracking-[0.2em] text-white">
                {sessionCode}
              </div>
            </div>
          </div>

        ) : sessionMode === "group" && !currentGroupId ? (
          /* Group selection */
          <div className="mx-auto max-w-2xl px-3 py-8">
            <h2 className="mb-4 text-lg font-bold text-slate-900">모둠을 선택하세요</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => { setSelectedGroupId(group.id); joinGroup(group.id, studentName, studentToken); }}
                  className="rounded-xl border-2 border-slate-200 bg-white p-5 text-left hover:border-teal-400 hover:shadow-sm"
                >
                  <div className="text-3xl">{group.icon}</div>
                  <div className="mt-3 text-lg font-bold text-slate-900">{group.name}</div>
                  <div className="mt-0.5 text-sm text-slate-400">{group.count}명 참여 중</div>
                </button>
              ))}
            </div>
          </div>

        ) : (
          /* Worksheet + sidebar */
          <div className="px-3 py-4">
            <div className={`grid gap-5 lg:items-start ${chatEnabled || galleryOpen ? "lg:grid-cols-[1fr_390px] xl:grid-cols-[1fr_494px]" : ""}`}>

              {/* ── Worksheet content ── */}
              <div className="min-w-0 flex-1">
                {/* Single page display */}
                {(() => {
                  const pageData = pages.find((p) => p.page === activePage);
                  if (!pageData) return null;
                  const { page, items } = pageData;
                  const isLocked = page > currentPage;
                  return (
                    <section className="overflow-hidden border border-slate-300 bg-[#faf9f6] shadow-sm lg:min-h-[calc(95vh-3.5rem-2rem)] relative rounded-sm">
                      {/* Notebook red margin lines */}
                      <div className="absolute left-8 sm:left-14 top-0 bottom-0 w-[1.5px] bg-rose-400/30 z-0 pointer-events-none" />
                      <div className="absolute left-10 sm:left-16 top-0 bottom-0 w-[1.5px] bg-rose-400/30 z-0 pointer-events-none" />

                      {isLocked ? (
                        <div className="flex flex-col items-center justify-center px-6 py-20 text-center relative z-10">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-200">
                            <svg className="h-7 w-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                          <p className="mt-4 text-sm font-semibold text-slate-500">아직 공개되지 않은 페이지입니다.</p>
                          <p className="mt-1 text-xs text-slate-400">교사가 공개하면 자동으로 열립니다.</p>
                        </div>
                      ) : (
                        <div className="flex flex-col px-6 py-4 md:px-12 md:py-8 sm:pl-24 md:pl-28 relative z-10">
                          {(() => {
                            let qNum = 0;
                            return items.map((c) => {
                              const isQuestion = !["prompt", "divider"].includes(c.type);
                              if (isQuestion) qNum++;
                              const qn = isQuestion ? qNum : undefined;
                              return (
                                <div key={c.id}>
                                  {renderComponent(c, canEdit, qn)}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      )}
                    </section>
                  );
                })()}



                {/* Content ended banner - fallback */}
                {sessionClosed ? (
                  <div className="mt-6 flex flex-col items-center justify-center py-10 text-center border-t-2 border-dashed border-slate-200">
                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                      <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <p className="text-sm font-bold text-slate-600">수업이 종료되었습니다.</p>
                    <p className="mt-1 text-xs text-slate-400">작성한 내용을 다시 한 번 살펴보세요.</p>
                  </div>
                ) : null}
              </div>

              {/* ── Sidebar ── */}
              <aside className="flex flex-col gap-3 lg:sticky lg:top-14 lg:h-[calc(95vh-3.5rem)]">

                {/* Chat */}
                {chatEnabled ? (
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
                      <span className="text-sm font-semibold text-slate-800">채팅</span>
                      <div className={`flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wide ${chatPaused ? "text-amber-500" : "text-teal-600"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${chatPaused ? "bg-amber-400" : "bg-teal-500"}`} />
                        {chatPaused ? "일시중지" : "라이브"}
                      </div>
                    </div>

                    <div ref={chatScrollRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-4">
                      {/* 📌 핀된 메시지 고정 배너 */}
                      {chatMessages.filter((m) => m.isPinned && !m.isDeleted).map((msg) => (
                        <div key={`pin-${msg.id}`} className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5">
                          <span className="mt-0.5 shrink-0 text-amber-500" aria-label="핀">📌</span>
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-bold text-amber-600">
                              {msg.isTeacher ? "🛡️ 교사" : ((chatAnonymousMode || msg.isAnonymous) && msg.senderName !== studentName ? "익명 친구" : msg.senderName)}
                            </div>
                            <div className="text-[15px] text-amber-800 leading-relaxed">{msg.content}</div>
                          </div>
                        </div>
                      ))}
                      {chatMessages.length === 0 ? (
                        <div className="py-5 text-center">
                          <svg className="mx-auto h-5 w-5 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                          </svg>
                          <p className="mt-1.5 text-xs text-slate-300">아직 메시지가 없습니다</p>
                        </div>
                      ) : (
                        chatMessages.map((msg) => {
                          const isTeacher = msg.isTeacher || msg.senderName === "교사";
                          const isSelf = msg.senderName === studentName;
                          const displayName = isTeacher ? "🛡️ 교사" : ((chatAnonymousMode || msg.isAnonymous) && !isSelf ? "익명 친구" : msg.senderName);
                          return (
                            <div key={msg.id} className="flex items-start gap-2.5 text-[18px] leading-relaxed text-slate-800">
                              <div className={`min-w-[76px] shrink-0 font-bold ${
                                isTeacher ? "text-teal-600"
                                : isSelf ? "text-emerald-600"
                                : "text-slate-500"
                              }`}>
                                {displayName}
                              </div>
                              <span className="shrink-0 text-slate-300">|</span>
                              <div className={`min-w-0 flex-1 break-words font-semibold ${
                                isSelf ? "text-emerald-700" : "text-slate-900"
                              }`}>
                                {msg.content}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {chatMuted ? (
                      <div className="border-t border-slate-100 px-4 py-2.5 text-xs text-amber-600">채팅이 제한되어 있습니다.</div>
                    ) : (
                      <div className="flex gap-2 border-t border-slate-100 p-3.5">
                        <input
                          value={chatDraft}
                          onChange={(e) => setChatDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey && chatDraft.trim()) {
                              e.preventDefault();
                              sendChatMessage(studentName, chatDraft, false, studentToken);
                              setChatDraft("");
                            }
                          }}
                          disabled={chatPaused || sessionClosed}
                          placeholder={chatAnonymousMode ? "익명 메시지..." : "메시지 입력..."}
                          className="field-input flex-1 rounded-lg px-4 py-2.5 text-[17px]"
                        />
                        <button
                          onClick={() => { if (chatDraft.trim()) { sendChatMessage(studentName, chatDraft, false, studentToken); setChatDraft(""); } }}
                          disabled={chatPaused || sessionClosed}
                          className="action-primary rounded-lg px-4 py-2.5 text-[17px] font-semibold"
                        >
                          전송
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Gallery */}
                {galleryOpen ? (
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                      <span className="text-sm font-semibold text-slate-800">활동지 공유</span>
                      <div className="flex gap-1">
                        {(["grid", "slide"] as const).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => setGalleryMode(mode)}
                            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${galleryMode === mode ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-100"}`}
                          >
                            {mode === "grid" ? "그리드" : "슬라이드"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-3">
                      {galleryFilterQuestion ? (
                        <p className="mb-2 text-[11px] text-slate-400">문항: {galleryFilterQuestion}</p>
                      ) : null}

                      {galleryMode === "grid" ? (
                        <div className="space-y-2">
                          {visibleGalleryCards.length === 0 ? (
                            <p className="py-7 text-center text-xs text-slate-300">공개된 활동지가 없습니다.</p>
                          ) : visibleGalleryCards.map((card, idx) => (
                            <div key={card.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                              <div className="text-xs font-semibold text-slate-700">{galleryName(card)}</div>
                              {card.questionTitle ? <div className="mt-0.5 text-[11px] text-slate-400">{card.questionTitle}</div> : null}
                              <button onClick={() => setSelectedGalleryIndex(idx)} className="mt-2 block w-full text-left text-[13px] leading-relaxed text-slate-600 line-clamp-3">
                                {card.excerpt}
                              </button>
                              {card.imageUrl ? (
                                <button onClick={() => setSelectedGalleryIndex(idx)} className="relative mt-2 block h-28 w-full overflow-hidden rounded-lg border border-slate-200 bg-white">
                                  <Image src={card.imageUrl} alt={card.displayName} fill className="object-contain" unoptimized />
                                </button>
                              ) : null}
                              <div className="mt-2 flex gap-1">
                                {(["thumbsUp", "heart", "wow"] as const).map((r) => (
                                  <button key={r} onClick={() => addReaction(card.id, r, studentName, studentToken)}
                                    className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] hover:bg-slate-50">
                                    {r === "thumbsUp" ? "👍" : r === "heart" ? "❤️" : "😮"}
                                    <span className="text-slate-400">{card.reactions[r]}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : visibleGalleryCards[0] ? (
                        <button onClick={() => setSelectedGalleryIndex(0)} className="block w-full rounded-lg border border-slate-200 bg-slate-50 p-4 text-left hover:bg-slate-100">
                          <div className="text-[11px] text-slate-400">슬라이드 열기</div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">{galleryName(visibleGalleryCards[0])}</div>
                        </button>
                      ) : (
                        <p className="py-7 text-center text-xs text-slate-300">공개된 활동지가 없습니다.</p>
                      )}
                    </div>
                  </div>
                ) : null}
              </aside>
            </div>
          </div>
        )}
      </div>

      {/* ── Overlays ── */}

      {focusMode ? (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-900/70 px-6 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-2xl bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <svg className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div className="mt-4 text-lg font-bold text-slate-900">집중하기 모드</div>
            <p className="mt-1.5 text-sm text-slate-400">교사가 해제할 때까지 화면이 가려집니다.</p>
          </div>
        </div>
      ) : null}

      {/* Vote modal */}
      {activeVote ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/60 px-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl">
            <div className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-[11px] font-bold text-teal-700 ring-1 ring-teal-200/60">
              📊 {labelForVote(activeVote.type)}
            </div>
            <div className="mt-3 text-xl font-bold text-slate-900">{activeVote.question}</div>
            {submittedVoteId === activeVote.id ? (
              <div className="mt-5">
                <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3.5 text-sm text-emerald-700">
                  <svg className="h-4 w-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  응답이 제출되었습니다.
                </div>
                {/* 투표 결과 공개 시 실시간 결과 표시 */}
                {activeVote.isResultPublic && voteSummary.results.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    <div className="text-xs font-semibold text-slate-500">현재 결과 ({voteSummary.responseCount}명 응답)</div>
                    {voteSummary.type === "wordcloud" ? (
                      <div className="flex flex-wrap gap-2 rounded-xl bg-slate-50 p-3">
                        {[...voteSummary.results]
                          .sort((a, b) => b.value - a.value)
                          .filter((r) => r.value > 0)
                          .map((result) => {
                            const maxVal = Math.max(...voteSummary.results.map((r) => r.value), 1);
                            return (
                              <span
                                key={result.label}
                                style={{ fontSize: `${Math.round(11 + (result.value / maxVal) * 18)}px` }}
                                className="font-semibold text-teal-700"
                              >
                                {result.label}
                              </span>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {voteSummary.results.map((result) => {
                          const pct = voteSummary.responseCount > 0
                            ? Math.round((result.value / voteSummary.responseCount) * 100)
                            : 0;
                          return (
                            <div key={result.label}>
                              <div className="mb-0.5 flex items-center justify-between text-[11px]">
                                <span className="text-slate-600">{result.label}</span>
                                <span className="font-semibold text-slate-400">{result.value}표 ({pct}%)</span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-1.5 rounded-full bg-teal-400 transition-all duration-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : !activeVote.isResultPublic ? (
                  <p className="mt-3 text-center text-xs text-slate-400">교사가 결과를 공개하면 표시됩니다.</p>
                ) : null}
              </div>
            ) : activeVote.type === "wordcloud" ? (
              <div className="mt-5 space-y-2.5">
                <input value={voteDraft} onChange={(e) => setVoteDraft(e.target.value)} placeholder="한 단어를 입력해 주세요" className="field-input w-full rounded-xl px-4 py-3.5 text-base" />
                <button onClick={() => { if (!voteDraft.trim()) return; castVote(voteDraft.trim(), studentName, studentToken); setSubmittedVoteId(activeVote.id); setVoteDraft(""); }} className="action-primary w-full rounded-xl py-3 font-semibold">
                  응답 제출
                </button>
              </div>
            ) : (
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {activeVote.options.map((opt) => (
                  <button key={opt}
                    onClick={() => { castVote(activeVote.type === "slider" ? Number(opt) : opt, studentName, studentToken); setSubmittedVoteId(activeVote.id); }}
                    className="rounded-xl border-2 border-slate-200 bg-white px-4 py-3.5 text-left font-semibold text-slate-800 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
            <p className="mt-4 text-center text-xs text-slate-300">응답 {voteSummary.responseCount}명</p>
          </div>
        </div>
      ) : null}

      {/* Gallery modal */}
      {selectedGalleryCard ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/70 px-6 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="muted-label">현장 공유</div>
                <div className="mt-0.5 text-lg font-bold text-slate-900">{galleryName(selectedGalleryCard)}</div>
              </div>
              <button onClick={() => setSelectedGalleryIndex(null)} className="action-secondary rounded-lg px-4 py-2 text-sm font-semibold">닫기</button>
            </div>
            {visibleGalleryCards.length > 1 && selectedGalleryIndex !== null ? (
              <div className="mt-3.5 flex items-center gap-2">
                <button onClick={() => setSelectedGalleryIndex(Math.max(0, selectedGalleryIndex - 1))} disabled={selectedGalleryIndex === 0} className="action-secondary rounded-lg px-3 py-2 text-sm">←</button>
                <span className="flex-1 text-center text-xs text-slate-400">{selectedGalleryIndex + 1} / {visibleGalleryCards.length}</span>
                <button onClick={() => setSelectedGalleryIndex(Math.min(visibleGalleryCards.length - 1, selectedGalleryIndex + 1))} disabled={selectedGalleryIndex === visibleGalleryCards.length - 1} className="action-secondary rounded-lg px-3 py-2 text-sm">→</button>
              </div>
            ) : null}
            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_220px]">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-5">
                {selectedGalleryCard.questionTitle ? <div className="mb-2 text-xs font-semibold text-slate-400">{selectedGalleryCard.questionTitle}</div> : null}
                <p className="text-sm leading-7 text-slate-700">{selectedGalleryCard.excerpt}</p>
                {selectedGalleryCard.imageUrl ? (
                  <div className="relative mt-4 h-80 w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <Image src={selectedGalleryCard.imageUrl} alt={selectedGalleryCard.displayName} fill className="object-contain" unoptimized />
                  </div>
                ) : null}
              </div>
              <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="muted-label">반응</div>
                {(["thumbsUp", "heart", "wow"] as const).map((r) => (
                  <div key={r} className="flex items-center gap-3">
                    <button onClick={() => addReaction(selectedGalleryCard.id, r, studentName, studentToken)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-base hover:bg-slate-100">
                      {r === "thumbsUp" ? "👍" : r === "heart" ? "❤️" : "😮"}
                    </button>
                    <span className="text-sm font-bold text-slate-700">{selectedGalleryCard.reactions[r]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
