"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import type { SingleChoiceComponent, MultiChoiceComponent, VoteType } from "@/lib/types/domain";
import {
  parseGalleryProjectionTarget,
  serializeGalleryPartialTarget,
} from "@/lib/projection-target";
import { useClassroomStore } from "@/lib/store/classroom-store";
import { defaultVoteConfig } from "@/lib/store/slices/vote-slice";
import { cn, formatCountdown } from "@/lib/utils";

function inputToSeconds(value: string) {
  const [minutes = "0", seconds = "0"] = value.split(":");
  const parsedMinutes = Number(minutes);
  const parsedSeconds = Number(seconds);
  return Number.isFinite(parsedMinutes) && Number.isFinite(parsedSeconds)
    ? Math.max(0, parsedMinutes * 60 + parsedSeconds)
    : 0;
}

const voteDurationPresets = [10, 20, 30, 60] as const;
const timerPresetOptions = [
  { label: "1분", value: 60 },
  { label: "3분", value: 180 },
  { label: "5분", value: 300 },
  { label: "7분", value: 420 },
  { label: "10분", value: 600 },
  { label: "15분", value: 900 },
] as const;
const MIN_CHOICE_OPTIONS = 3;
const MAX_CHOICE_OPTIONS = 8;

export function TeacherDashboardPreview() {
  const initialVoteConfig = defaultVoteConfig("ox");
  const [teacherMessage, setTeacherMessage] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [timerInput, setTimerInput] = useState("05:00");
  const [showVotePanel, setShowVotePanel] = useState(false);
  const [galleryViewMode, setGalleryViewMode] = useState<"grid" | "slide">("grid");
  const [slideIndex, setSlideIndex] = useState(0);
  const [showConnectedOnly, setShowConnectedOnly] = useState(false);
  const [voteDraftType, setVoteDraftType] = useState<VoteType>("ox");
  const [voteQuestionDraft, setVoteQuestionDraft] = useState(initialVoteConfig.question);
  const [voteOptionsDraft, setVoteOptionsDraft] = useState(initialVoteConfig.options.join("\n"));
  const [voteDurationDraft, setVoteDurationDraft] = useState<number | null>(30);
  
  // Widget visibility states (from store, toggled via navbar)
  const showChat = useClassroomStore((s) => s.showChat);
  const showTimer = useClassroomStore((s) => s.showTimer);
  const showVote = useClassroomStore((s) => s.showVote);
  const toggleShowChat = useClassroomStore((s) => s.toggleShowChat);
  const toggleShowTimer = useClassroomStore((s) => s.toggleShowTimer);
  const toggleShowVote = useClassroomStore((s) => s.toggleShowVote);

  const hasVisibleWidget = (showChat || showTimer || showVote);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Store state
  const worksheetId = useClassroomStore((s) => s.worksheetId);
  const currentPage = useClassroomStore((s) => s.currentPage);
  const sessionCode = useClassroomStore((s) => s.sessionCode);
  const students = useClassroomStore((s) => s.students);
  const helpRequests = useClassroomStore((s) => s.helpRequests);
  const chatMessages = useClassroomStore((s) => s.chatMessages);
  const voteSummary = useClassroomStore((s) => s.voteSummary);
  const timerSecondsRemaining = useClassroomStore((s) => s.timerSecondsRemaining);
  const timerRunning = useClassroomStore((s) => s.timerRunning);
  const focusMode = useClassroomStore((s) => s.focusMode);
  const chatEnabled = useClassroomStore((s) => s.chatEnabled);
  const chatPaused = useClassroomStore((s) => s.chatPaused);
  const chatAnonymousMode = useClassroomStore((s) => s.chatAnonymousMode);
  const groups = useClassroomStore((s) => s.groups);
  const galleryCards = useClassroomStore((s) => s.galleryCards);
  const galleryOpen = useClassroomStore((s) => s.galleryOpen);
  const anonymousGallery = useClassroomStore((s) => s.anonymousGallery);
  const galleryFilterQuestion = useClassroomStore((s) => s.galleryFilterQuestion);
  const components = useClassroomStore((s) => s.components);
  const projectedType = useClassroomStore((s) => s.projectedType);
  const projectedTargetId = useClassroomStore((s) => s.projectedTargetId);

  // Store actions
  const startTimer = useClassroomStore((s) => s.startTimer);
  const pauseTimer = useClassroomStore((s) => s.pauseTimer);
  const resetTimer = useClassroomStore((s) => s.resetTimer);
  const setTimer = useClassroomStore((s) => s.setTimer);
  const decideTimerTimeout = useClassroomStore((s) => s.decideTimerTimeout);
  const toggleChat = useClassroomStore((s) => s.toggleChat);
  const toggleChatPaused = useClassroomStore((s) => s.toggleChatPaused);
  const toggleChatAnonymousMode = useClassroomStore((s) => s.toggleChatAnonymousMode);
  const sendChatMessage = useClassroomStore((s) => s.sendChatMessage);
  const clearChat = useClassroomStore((s) => s.clearChat);
  const setProjection = useClassroomStore((s) => s.setProjection);
  const resolveHelpRequest = useClassroomStore((s) => s.resolveHelpRequest);
  const openVote = useClassroomStore((s) => s.openVote);
  const closeVote = useClassroomStore((s) => s.closeVote);
  const toggleVoteResultPublic = useClassroomStore((s) => s.toggleVoteResultPublic);
  const resetVote = useClassroomStore((s) => s.resetVote);
  const assignStudentGroup = useClassroomStore((s) => s.assignStudentGroup);
  const muteStudent = useClassroomStore((s) => s.muteStudent);
  const lockStudent = useClassroomStore((s) => s.lockStudent);
  const removeStudent = useClassroomStore((s) => s.removeStudent);
  const toggleGalleryOpen = useClassroomStore((s) => s.toggleGalleryOpen);
  const toggleAnonymousGallery = useClassroomStore((s) => s.toggleAnonymousGallery);
  const setGalleryFilterQuestion = useClassroomStore((s) => s.setGalleryFilterQuestion);
  const toggleGalleryCard = useClassroomStore((s) => s.toggleGalleryCard);
  const toggleGalleryProject = useClassroomStore((s) => s.toggleGalleryProject);

  function voteTypeLabel(type: VoteType) {
    return type === "ox"
      ? "O/X"
      : type === "choice"
        ? "객관식"
        : type === "slider"
          ? "슬라이더"
          : "워드클라우드";
  }

  function handleVoteTypeSelect(type: VoteType) {
    const config = defaultVoteConfig(type);
    setVoteDraftType(type);
    setVoteQuestionDraft(config.question);

    if (type === "slider") {
      setVoteOptionsDraft("1\n2\n3\n4\n5");
    } else {
      setVoteOptionsDraft(type === "wordcloud" ? "" : config.options.join("\n"));
    }
  }

  const voteOptionRows = useMemo(() => {
    if (voteDraftType === "choice") {
      const rows = voteOptionsDraft
        .split(/\r?\n/)
        .map((option) => option.trim());
      while (rows.length < MIN_CHOICE_OPTIONS) rows.push("");
      return rows.slice(0, MAX_CHOICE_OPTIONS);
    }

    if (voteDraftType === "slider") {
      const rows = voteOptionsDraft
        .split(/\r?\n/)
        .map((option) => option.trim())
        .filter(Boolean);
      return rows.length > 0 ? rows : ["1", "2", "3", "4", "5"];
    }

    return [];
  }, [voteDraftType, voteOptionsDraft]);

  function updateVoteOptionRow(index: number, value: string) {
    const nextRows = [...voteOptionRows];
    nextRows[index] = value;
    setVoteOptionsDraft(nextRows.join("\n"));
  }

  function addChoiceOptionRow() {
    if (voteDraftType !== "choice" || voteOptionRows.length >= MAX_CHOICE_OPTIONS) return;
    setVoteOptionsDraft([...voteOptionRows, ""].join("\n"));
  }

  function removeChoiceOptionRow() {
    if (voteDraftType !== "choice" || voteOptionRows.length <= MIN_CHOICE_OPTIONS) return;
    setVoteOptionsDraft(voteOptionRows.slice(0, -1).join("\n"));
  }

  function applySliderStepPreset(count: number) {
    setVoteOptionsDraft(Array.from({ length: count }, (_, i) => `${i + 1}`).join("\n"));
  }

  function handleOpenVoteFromDraft() {
    const fallback = defaultVoteConfig(voteDraftType);
    const options =
      voteDraftType === "wordcloud"
        ? []
        : voteDraftType === "ox"
          ? ["O", "X"]
          : voteOptionsDraft
              .split(/\r?\n|,/)
              .map((option) => option.trim())
              .filter(Boolean);

    openVote(voteDraftType, {
      question: voteQuestionDraft.trim() || fallback.question,
      options,
    });
  }

  function handleStartTimerFromInput() {
    const seconds = inputToSeconds(timerInput);
    if (seconds <= 0) return;
    setTimer(seconds);
    startTimer();
  }

  function handleSelectTimerPreset(seconds: number) {
    setTimerInput(formatCountdown(seconds));
    if (!timerRunning) {
      setTimer(seconds);
    }
  }

  useEffect(() => {
    if (!timerRunning) {
      setTimerInput(formatCountdown(timerSecondsRemaining));
    }
  }, [timerRunning, timerSecondsRemaining]);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatMessages]);

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) ?? null,
    [selectedStudentId, students],
  );

  const projectedGalleryTarget = useMemo(
    () => parseGalleryProjectionTarget(projectedTargetId),
    [projectedTargetId],
  );
  const projectedGalleryQuestionId = projectedGalleryTarget.questionId;
  const partialProjectionTarget = useMemo(
    () =>
      serializeGalleryPartialTarget(
        galleryFilterQuestion,
        galleryCards.filter((card) => card.isProjected).map((card) => card.id),
      ),
    [galleryCards, galleryFilterQuestion],
  );

  // 부분 송출 모드: 선택한 문항에서 일부 학생 카드만 골라 송출하는 상태
  const isPartialMode =
    projectedType === "gallery_partial" &&
    projectedGalleryQuestionId === galleryFilterQuestion &&
    !!galleryFilterQuestion;
  const submittedCount = students.filter((s) => s.submitted).length;
  const connectedStudents = students.filter((s) => s.status !== "offline");
  const connectedCount = connectedStudents.length;
  const visibleStudents = showConnectedOnly ? connectedStudents : students;
  const timerLow = timerSecondsRemaining > 0 && timerSecondsRemaining <= 60;
  const visibleGalleryCount = galleryCards.filter((c) => c.visible).length;
  const projectedCardsCount = galleryCards.filter((c) => c.isProjected).length;
  const galleryQuestions = useMemo(
    () => components.filter((c) => !["prompt", "divider"].includes(c.type)),
    [components],
  );

  const pageGroups = useMemo(() => {
    const maxPage = Math.max(...components.map((c) => c.page), 1);
    return Array.from({ length: maxPage }, (_, i) => ({
      page: i + 1,
      questions: components
        .filter((c) => c.page === i + 1 && !["prompt", "divider"].includes(c.type)),
    }));
  }, [components]);

  const choiceStats = useMemo(() => {
    const choiceComps = components.filter(
      (c) => c.page === currentPage && (c.type === "single_choice" || c.type === "multi_choice" || c.type === "ox"),
    );
    return choiceComps.map((comp) => {
      const options =
        comp.type === "ox"
          ? ["O", "X"]
          : (comp as SingleChoiceComponent | MultiChoiceComponent).options;
      const counts: Record<string, number> = {};
      for (const opt of options) counts[opt] = 0;
      let respondedCount = 0;
      for (const student of students) {
        const answer = student.answers?.find((a) => a.componentId === comp.id);
        if (answer?.choiceValues?.length) {
          respondedCount++;
          for (const val of answer.choiceValues) {
            if (val in counts) counts[val]++;
          }
        }
      }
      return { comp, options, counts, respondedCount };
    });
  }, [components, students, currentPage]);

  const currentPageComponents = useMemo(
    () => components.filter((c) => c.page === currentPage && !["prompt", "divider"].includes(c.type)),
    [components, currentPage]
  );

  const contextStats = useMemo(() => {
    const statsStudents = showConnectedOnly ? connectedStudents : students;

    if (galleryFilterQuestion) {
      const respondedCount = statsStudents.filter((s) =>
        s.answers?.some((a) => a.componentId === galleryFilterQuestion),
      ).length;
      return { count: respondedCount, label: "응답" };
    }

    if (currentPageComponents.length === 0) return { count: 0, label: "완료" };

    const completedCount = statsStudents.filter((s) => {
      const studentAnswerIds = new Set((s.answers ?? []).map((a) => a.componentId));
      return currentPageComponents.every((c) => studentAnswerIds.has(c.id));
    }).length;

    return { count: completedCount, label: "완료" };
  }, [showConnectedOnly, connectedStudents, students, galleryFilterQuestion, currentPageComponents]);

  return (
    <div className="space-y-3">
      {/* Main layout */}
      <div className={`grid gap-3 transition-all duration-500 ease-in-out ${
        hasVisibleWidget 
          ? "xl:grid-cols-[1fr_400px] 2xl:grid-cols-[1fr_460px]" 
          : "grid-cols-1"
      }`}>

        {/* Left column: student roster + gallery controls */}
        <div className="space-y-3">

          {/* Student roster card */}
          <div className="surface rounded-2xl pt-2 px-4 pb-3">
             <div className="flex flex-col gap-3">
                {/* Top controls: connected students + page/question filter */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setGalleryFilterQuestion(null);
                      setShowConnectedOnly((open) => !open);
                    }}
                    className={`flex items-center gap-2 rounded-xl border-2 px-5 py-2.5 transition-all ${
                      showConnectedOnly
                        ? "border-transparent bg-slate-900 text-white shadow-md"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-[17px] font-black leading-none tracking-wide">
                      현재 접속
                    </span>
                    <span className={`text-[15px] font-bold leading-none ${showConnectedOnly ? "text-teal-300" : "text-teal-600"}`}>
                      {connectedCount}명
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setShowConnectedOnly(false);
                      setGalleryFilterQuestion(null);
                    }}
                    className={`flex items-center gap-2 rounded-xl border-2 px-5 py-2.5 transition-all ${
                      !galleryFilterQuestion && !showConnectedOnly
                        ? "border-transparent bg-slate-900 text-white shadow-md"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-[17px] font-black leading-none tracking-wide">
                      {galleryFilterQuestion ? "전체 보기" : `${currentPage}페이지 전체`}
                    </span>
                    <span className={`text-[15px] font-bold leading-none ${!galleryFilterQuestion ? "text-teal-300" : "text-slate-400"}`}>
                      ({contextStats.count}/{visibleStudents.length}명 {contextStats.label})
                    </span>
                  </button>

                  {currentPageComponents.length > 0 && (
                    <div className="h-6 w-px bg-slate-200 shrink-0" />
                  )}

                  {currentPageComponents.map((q, index) => {
                    const desc = "description" in q ? q.description : undefined;
                    return (
                      <button
                        key={q.id}
                        onClick={() => {
                          setShowConnectedOnly(false);
                          setGalleryFilterQuestion(q.id);
                        }}
                        title={desc ? `${q.title}: ${desc}` : q.title}
                        className={`rounded-xl px-5 py-2.5 text-[15px] font-bold transition-all whitespace-nowrap border-2 ${
                          galleryFilterQuestion === q.id
                            ? "bg-slate-900 text-white border-transparent shadow-md"
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {index + 1}. {q.title}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-1 flex-wrap items-center gap-3">
                    <div className="h-4 w-px bg-slate-200" />

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        onClick={toggleGalleryOpen}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                          galleryOpen
                            ? "bg-slate-900 text-white"
                            : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        답변 공유
                      </button>
                      <button
                        onClick={toggleAnonymousGallery}
                        title={anonymousGallery ? "익명 표시 끄기" : "익명 표시 켜기"}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                          anonymousGallery
                            ? "bg-slate-900 text-white"
                            : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        익명
                      </button>
                      <button
                        onClick={() => {
                          if (projectedType === "gallery_partial" && projectedGalleryQuestionId === galleryFilterQuestion) {
                            setProjection(null);
                          } else {
                            setProjection("gallery_partial", partialProjectionTarget);
                          }
                        }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                          projectedType === "gallery_partial" && projectedGalleryQuestionId === galleryFilterQuestion
                            ? "bg-slate-900 text-white"
                            : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        부분 송출
                      </button>
                      <button
                        onClick={() => {
                          if (projectedType === "gallery_all" && projectedGalleryQuestionId === galleryFilterQuestion) {
                            setProjection(null);
                          } else {
                            setProjection("gallery_all", galleryFilterQuestion);
                          }
                        }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                          projectedType === "gallery_all" && projectedGalleryQuestionId === galleryFilterQuestion
                            ? "bg-slate-900 text-white"
                            : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        전체 송출
                      </button>
                      {visibleGalleryCount > 0 && (
                        <span className="rounded-lg bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-600">
                          {visibleGalleryCount}개 공개
                        </span>
                      )}
                      {projectedCardsCount > 0 && (
                        <span className={cn(
                          "rounded-lg px-2.5 py-1 text-xs font-black tracking-tight transition-all duration-300",
                          isPartialMode 
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" 
                            : "bg-slate-100 text-slate-500 font-medium"
                        )}>
                          {projectedCardsCount} {isPartialMode ? "개 송출" : "개 선택"}
                        </span>
                      )}
                    </div>
                  </div>

                  {helpRequests.length > 0 && (
                    <div className="animate-pulse rounded-lg bg-rose-50 px-3 py-1.5 text-center ring-1 ring-rose-200/60">
                      <div className="text-sm font-bold text-rose-600">{helpRequests.length}</div>
                      <div className="text-[10px] font-semibold text-rose-400">도움 요청</div>
                    </div>
                  )}
                </div>
              </div>

            {visibleStudents.length === 0 ? (
              <div className="mt-3 rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
                {showConnectedOnly ? (
                  <>
                    <div className="text-2xl font-bold text-slate-700">현재 접속 중인 학생이 없습니다.</div>
                    <div className="mt-2 text-base text-slate-400">버튼을 한 번 더 누르면 전체 학생 목록으로 돌아갑니다.</div>
                  </>
                ) : (
                  <>
                    <div className="text-5xl font-bold tracking-[0.14em] text-slate-950">{sessionCode}</div>
                    <div className="mt-2 text-xl text-slate-400">학생이 입장하면 여기에 목록이 표시됩니다.</div>
                  </>
                )}
              </div>
            ) : (
              <>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {visibleStudents.map((student) => {
                  const isOffline = student.status === "offline";
                  const isOnline = student.status === "online";
                  const isPartialSelected = isPartialMode && !!galleryCards.find((c) => c.id === student.id)?.isProjected;
                  const isSimplySelected = !isPartialMode && !!galleryCards.find((c) => c.id === student.id)?.isProjected;
                  const isNormalSelected = !isPartialMode && selectedStudent?.id === student.id;
                  return (
                    <div
                      key={student.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (isPartialMode) {
                          toggleGalleryProject(student.id);
                        } else {
                          setSelectedStudentId(selectedStudentId === student.id ? null : student.id);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          if (isPartialMode) {
                            toggleGalleryProject(student.id);
                          } else {
                            setSelectedStudentId(selectedStudentId === student.id ? null : student.id);
                          }
                        }
                      }}
                      className={cn(
                        "flex w-full cursor-pointer flex-col overflow-hidden rounded-xl border transition-all",
                        isPartialSelected
                          ? "border-indigo-400/60 bg-indigo-50 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-300/40"
                          : isNormalSelected
                          ? "border-teal-400/40 bg-teal-50 shadow-md shadow-teal-500/5"
                          : isSimplySelected
                          ? "border-slate-200 bg-slate-50/80 shadow-sm"
                          : "border-slate-100 bg-white hover:border-slate-200"
                      )}
                    >
                      <div className="flex items-center gap-3 p-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate text-lg font-semibold text-slate-900">{student.studentName}</span>
                            <span className={`shrink-0 text-base font-bold ${
                              student.submitted ? "text-emerald-600" : isOffline ? "text-slate-300" : "text-slate-400"
                            }`}>
                              {(() => {
                                if (isOffline) return "오프라인";
                                if (galleryFilterQuestion) {
                                  return student.answers?.some((a) => a.componentId === galleryFilterQuestion) ? "응답" : "미응답";
                                }
                                const pageAnswerCount = (student.answers ?? []).filter((a) =>
                                  currentPageComponents.some((c) => c.id === a.componentId),
                                ).length;
                                const totalPageItems = currentPageComponents.length;
                                if (totalPageItems > 0 && pageAnswerCount >= totalPageItems) return "완료";
                                return student.submitted ? "제출" : `${Math.min(100, student.progress)}%`;
                              })()}
                            </span>
                          </div>
                          {!galleryFilterQuestion && (
                            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                               <div className={`h-full rounded-full transition-all duration-500 ${student.submitted ? "bg-emerald-400" : "bg-teal-500"}`}
                                  style={{ 
                                    width: `${(() => {
                                      const pageAnswerCount = (student.answers ?? []).filter(a => 
                                        currentPageComponents.some(c => c.id === a.componentId)
                                      ).length;
                                      const totalPageItems = currentPageComponents.length;
                                      return totalPageItems > 0 ? Math.min(100, Math.round((pageAnswerCount / totalPageItems) * 100)) : student.progress;
                                    })()}%` 
                                  }} />
                            </div>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
                          <button type="button" onClick={() => muteStudent(student.id, !student.chatMuted)}
                            className={`relative rounded-lg p-1.5 text-xs transition-colors ${student.chatMuted ? "bg-rose-50" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}>
                            <span className={student.chatMuted ? "opacity-40" : ""}>💬</span>
                            {student.chatMuted && (
                              <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="block w-[140%] h-0.5 bg-rose-300 rotate-[-45deg] rounded-full" />
                              </span>
                            )}
                          </button>
                          <button type="button" onClick={() => lockStudent(student.id, !student.writingLocked)}
                            className={`relative rounded-lg p-1.5 text-xs transition-colors ${student.writingLocked ? "bg-rose-50" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}>
                            <span className={student.writingLocked ? "opacity-40" : ""}>✍</span>
                            {student.writingLocked && (
                              <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="block w-[140%] h-0.5 bg-rose-300 rotate-[-45deg] rounded-full" />
                              </span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`${student.studentName} 학생을 수업에서 내보내시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
                                removeStudent(student.id);
                                if (selectedStudentId === student.id) setSelectedStudentId(null);
                              }
                            }}
                            className="rounded-lg bg-slate-100 p-1.5 text-xs text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                            title="학생 내보내기"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* 선택한 문항의 답변 미리보기 */}
                      {galleryFilterQuestion && (
                        <div className="border-t border-slate-100 bg-slate-50/50 p-3">
                          {(() => {
                            const card = galleryCards.find((c) => c.id === student.id);
                            if (!card) return <div className="text-[11px] text-slate-400 italic">아직 이 문항에 제출한 내용이 없습니다.</div>;
                            
                            return (
                              <div className="space-y-2">
                                {card.excerpt ? <p className="line-clamp-2 text-[14px] leading-relaxed text-slate-600">{card.excerpt}</p> : null}
                                {card.imageUrl ? (
                                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-slate-200 bg-white">
                                    <Image src={card.imageUrl} alt={student.studentName} fill className="object-contain" unoptimized />
                                  </div>
                                ) : null}
                                <div className="flex items-center justify-between gap-1.5 pt-1">
                                  <div className="flex gap-1">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); toggleGalleryCard(card.id); }}
                                      title={card.visible ? "학생 공개 해제" : "학생 공개"}
                                      className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${card.visible ? "bg-emerald-500 text-white shadow-sm" : "bg-white text-slate-400 ring-1 ring-slate-200 hover:bg-slate-50"}`}
                                    >
                                      {card.visible ? "공개됨" : "공개"}
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); toggleGalleryProject(card.id); }}
                                      title={card.isProjected ? "부분 송출 해제" : "부분 송출"}
                                      className={cn(
                                        "px-2 py-1 rounded-md text-[10px] font-bold transition-all",
                                        card.isProjected 
                                          ? (isPartialMode ? "bg-indigo-500 text-white shadow-sm" : "bg-slate-500 text-white shadow-sm")
                                          : "bg-white text-slate-400 ring-1 ring-slate-200 hover:bg-slate-50"
                                      )}
                                    >
                                      {card.isProjected 
                                        ? (isPartialMode ? "송출 중" : "선택됨") 
                                        : "송출"}
                                    </button>
                                  </div>
                                  <button 
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      if (projectedType === 'gallery' && projectedTargetId === card.id) {
                                        setProjection(null);
                                      } else {
                                        setProjection("gallery", card.id); 
                                      }
                                    }}
                                    className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${projectedType === 'gallery' && projectedTargetId === card.id ? "bg-teal-500 text-white shadow-lg" : "bg-slate-900 text-white hover:bg-slate-800"}`}
                                  >
                                    {projectedType === 'gallery' && projectedTargetId === card.id ? "전체화면 해제" : "전체화면"}
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              </>
            )}

            {/* Help requests */}
            {helpRequests.length > 0 ? (
              <div className="mt-3 space-y-2 rounded-xl border border-rose-100 bg-rose-50 p-3">
                <div className="text-xs font-bold text-rose-600">도움 요청 {helpRequests.length}건</div>
                {helpRequests.map((req) => (
                  <div key={req.id} className="flex items-center gap-2.5">
                    <div className="min-w-0 flex-1 text-xs">
                      <span className="font-semibold text-slate-900">{req.studentName}</span>
                      <span className="ml-1.5 text-slate-400">{req.questionLabel}</span>
                    </div>
                    <button onClick={() => resolveHelpRequest(req.id)}
                      className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">
                      해결
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* Selected student detail */}
          {selectedStudent ? (
            <div className="surface rounded-2xl p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="muted-label">학생 상세 보기</div>
                  <div className="mt-0.5 text-lg font-bold text-slate-950">{selectedStudent.studentName}</div>
                  <div className="mt-1 text-xs text-slate-400">위 목록에서 선택한 학생의 답안을 자세히 보여주는 영역입니다.</div>
                </div>
                <div className="flex items-center gap-2.5">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (projectedType === 'student' && projectedTargetId === selectedStudent.id) {
                        setProjection(null);
                      } else {
                        setProjection("student", selectedStudent.id);
                      }
                    }}
                    className={`rounded-xl px-3.5 py-2 text-xs font-semibold ${projectedType === 'student' && projectedTargetId === selectedStudent.id ? "bg-teal-500 text-white shadow-md shadow-teal-500/20 hover:bg-teal-600" : "action-primary"}`}
                  >
                    {projectedType === 'student' && projectedTargetId === selectedStudent.id ? "송출 해제" : "학생 송출"}
                  </button>
                  {groups.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {groups.map((group) => (
                        <button key={group.id} onClick={() => assignStudentGroup(selectedStudent.id, group.id)}
                          className="action-secondary rounded-lg px-2.5 py-1.5 text-xs font-semibold">
                          {group.icon} {group.name}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {(selectedStudent.answers ?? []).map((answer) => (
                  <div key={answer.componentId} className={`rounded-xl border border-slate-100 bg-slate-50 p-3.5 ${answer.imageUrl ? "sm:col-span-2" : ""}`}>
                    <div className="text-xs font-bold text-slate-400">{answer.questionTitle}</div>
                    {answer.textValue ? <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{answer.textValue}</p> : null}
                    {answer.choiceValues?.length ? <p className="mt-1.5 text-sm text-slate-700">{answer.choiceValues.join(", ")}</p> : null}
                    {answer.imageUrl ? (
                      <div className="relative mt-2 h-40 w-full overflow-hidden rounded-lg border border-slate-200 bg-white">
                        <Image src={answer.imageUrl} alt={answer.questionTitle} fill className="object-contain" unoptimized />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Choice response stats */}
          {choiceStats.length > 0 ? (
            <div className="surface rounded-2xl p-5">
              <div className="muted-label">선택형 응답 현황</div>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {choiceStats.map(({ comp, options, counts, respondedCount }) => (
                  <div key={comp.id}>
                    <div className="mb-1.5 text-[15.9px] font-semibold text-slate-700">{comp.title}</div>
                    <div className="space-y-1">
                      {options.map((opt) => {
                        const count = counts[opt] ?? 0;
                        const pct = respondedCount > 0 ? Math.round((count / respondedCount) * 100) : 0;
                        return (
                          <div key={opt}>
                            <div className="mb-0.5 flex items-center justify-between text-[14.5px]">
                              <span className="text-slate-600">{opt}</span>
                              <span className="font-semibold text-slate-400">{count}명 ({pct}%)</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-1.5 rounded-full bg-teal-400 transition-all duration-500" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                      {respondedCount > 0 ? <div className="mt-0.5 text-[13.2px] text-slate-400">{respondedCount}명 응답</div> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        {hasVisibleWidget ? (
          <div className="sticky top-[88px] flex h-[calc(100vh-112px)] flex-col gap-3 animate-in fade-in slide-in-from-right-4 duration-300">
            {showChat && (
              <div className="surface flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                  <div className="flex shrink-0 items-center gap-2.5 whitespace-nowrap">
                    <span className="whitespace-nowrap text-base font-bold text-slate-800">채팅</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { if (confirm("채팅 내용을 모두 초기화할까요?")) clearChat(); }}
                      title="채팅 초기화"
                      className="h-10 shrink-0 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50"
                    >
                      초기화
                    </button>
                    <button
                      onClick={toggleChatAnonymousMode}
                      title={chatAnonymousMode ? "익명 모드 끄기" : "익명 모드 켜기"}
                      className={`h-10 shrink-0 whitespace-nowrap rounded-xl px-4 text-sm font-bold transition-all ${chatAnonymousMode ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-500"}`}
                    >
                      익명
                    </button>
                    <button
                      onClick={toggleChat}
                      className={`h-10 shrink-0 whitespace-nowrap rounded-xl px-4 text-sm font-bold transition-all ${chatEnabled ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                    >
                      활성화
                    </button>
                    <button
                      onClick={toggleChatPaused}
                      title={chatPaused ? "채팅 재개" : "채팅 일시중지"}
                      aria-label={chatPaused ? "채팅 재개" : "채팅 일시중지"}
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all ${
                        chatPaused
                          ? "bg-slate-900 text-white shadow-md shadow-slate-900/20"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path d="M6.5 4.5h2.5v11H6.5zM11 4.5h2.5v11H11z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setProjection(projectedType === "chat" ? null : "chat")}
                      title="화면 송출"
                      className={`rounded-xl p-3 transition-all ${projectedType === "chat" ? "bg-teal-500 text-white shadow-md shadow-teal-500/20" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </button>
                    <button onClick={toggleShowChat} className="rounded-xl p-2.5 text-slate-300 hover:bg-slate-50 hover:text-slate-500">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>

                <div className="flex flex-1 flex-col overflow-hidden">
                  <div ref={chatScrollRef} className="flex-1 space-y-2 overflow-auto p-4">
                    {chatMessages.length === 0 ? (
                      <p className="py-5 text-center text-sm text-slate-300">아직 메시지가 없습니다.</p>
                    ) : chatMessages.map((msg) => {
                      const isTeacher = msg.isTeacher;
                      const isAnonymousSender = !isTeacher && (chatAnonymousMode || msg.isAnonymous);
                      const displayName = isTeacher ? msg.senderName : isAnonymousSender ? "익명" : msg.senderName;
                      return (
                        <div key={msg.id} className={`flex flex-col ${isTeacher ? "items-end" : "items-start"}`}>
                          {!isTeacher && (
                            <div className="mb-0.5 ml-1 flex items-center gap-1.5 text-[12px] font-semibold text-slate-400">
                              {displayName}
                              {isAnonymousSender && (
                                <span className="rounded-md border border-slate-200 bg-slate-100 px-1 py-0.5 text-[9px] font-bold text-slate-400">익명</span>
                              )}
                            </div>
                          )}
                          <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${isTeacher ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>
                            {msg.content}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2 border-t border-slate-100 p-3">
                    <input
                      value={teacherMessage}
                      onChange={(e) => setTeacherMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && teacherMessage.trim()) {
                          e.preventDefault();
                          sendChatMessage("교사", teacherMessage, true);
                          setTeacherMessage("");
                        }
                      }}
                      placeholder="메시지 입력..."
                      className="field-input flex-1 rounded-2xl px-4 py-3 text-base"
                    />
                    <button
                      onClick={() => { if (teacherMessage.trim()) { sendChatMessage("교사", teacherMessage, true); setTeacherMessage(""); } }}
                      className="action-primary rounded-2xl px-5 py-3 text-base font-semibold"
                    >전송</button>
                  </div>
                </div>
              </div>
            )}

            {showTimer && (
              <div className="surface rounded-2xl p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="text-base font-bold text-slate-800">타이머</span>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={timerRunning ? pauseTimer : handleStartTimerFromInput}
                      disabled={!timerRunning && inputToSeconds(timerInput) <= 0}
                      className={cn(
                        "h-11 shrink-0 rounded-xl px-5 text-sm font-bold transition-all active:scale-95 disabled:opacity-30",
                        timerRunning
                          ? "bg-teal-500 text-white shadow-lg shadow-teal-500/20 hover:bg-teal-600"
                          : "bg-slate-950 text-white shadow-lg shadow-slate-950/20 hover:bg-slate-800",
                      )}
                    >
                      {timerRunning ? "일시정지" : "시작"}
                    </button>
                    <button
                      onClick={resetTimer}
                      className="h-11 shrink-0 rounded-xl bg-slate-100 px-4 text-sm font-bold text-slate-600 transition-all hover:bg-slate-200"
                    >
                      초기화
                    </button>
                    <button 
                      onClick={() => setProjection(projectedType === "timer" ? null : "timer")}
                      title="화면 송출"
                      className={`rounded-xl p-3 transition-all ${projectedType === "timer" ? "bg-teal-500 text-white shadow-md shadow-teal-500/20" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </button>
                    <button onClick={toggleShowTimer} className="rounded-xl p-2.5 text-slate-300 hover:bg-slate-50 hover:text-slate-500">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-[188px_minmax(0,1fr)] gap-3">
                  <div className="grid grid-cols-2 gap-2">
                    {timerPresetOptions.map((preset) => {
                      const presetActive = !timerRunning && inputToSeconds(timerInput) === preset.value;
                      return (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => handleSelectTimerPreset(preset.value)}
                          className={cn(
                            "h-11 rounded-xl border text-sm font-bold transition-all",
                            presetActive
                              ? "border-slate-900 bg-slate-900 text-white shadow-md"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                          )}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    value={timerRunning ? formatCountdown(timerSecondsRemaining) : timerInput}
                    onChange={(e) => {
                      if (!timerRunning) setTimerInput(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !timerRunning) {
                        e.preventDefault();
                        handleStartTimerFromInput();
                      }
                    }}
                    readOnly={timerRunning}
                    placeholder="05:00"
                    className="field-input h-full min-h-[96px] w-full rounded-2xl px-0 text-center text-[2.35rem] font-mono font-black tracking-tight text-slate-950 focus:ring-teal-500/20"
                  />
                </div>
              </div>
            )}

            {showVote && (
              <div className="surface flex min-h-0 flex-col overflow-hidden rounded-2xl p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base font-bold text-slate-800">투표</span>
                    {voteSummary.isActive ? <span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-bold text-teal-700">진행 중</span> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setProjection(projectedType === "vote" ? null : "vote")}
                      title="화면 송출"
                      className={`rounded-xl p-3 transition-all ${projectedType === "vote" ? "bg-teal-500 text-white shadow-md shadow-teal-500/20" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </button>
                    <button onClick={toggleShowVote} className="rounded-xl p-2.5 text-slate-300 hover:bg-slate-50 hover:text-slate-500">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
                <div className="mb-3 grid grid-cols-2 gap-2.5">
                  {(["ox", "choice", "slider", "wordcloud"] as const).map((vType) => (
                    <button
                      key={`draft-${vType}`}
                      onClick={() => handleVoteTypeSelect(vType)}
                      className={`rounded-2xl py-3 text-sm font-semibold transition-all ${
                        voteDraftType === vType
                          ? "bg-slate-900 text-white shadow-sm"
                          : "action-secondary hover:bg-slate-50"
                      }`}
                    >
                      {voteTypeLabel(vType)}
                    </button>
                  ))}
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                  <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                  <div className="space-y-1.5">
                    <div className="text-xs font-bold text-slate-700">질문 입력하기</div>
                    <textarea
                      value={voteQuestionDraft}
                      onChange={(e) => setVoteQuestionDraft(e.target.value)}
                      placeholder="질문을 입력하세요"
                      className={cn(
                        "field-input w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed",
                        voteDraftType === "ox" ? "min-h-[96px]" : "min-h-[72px]",
                      )}
                    />
                  </div>

                  {voteDraftType === "choice" ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-slate-700">보기 입력하기</div>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setVoteOptionsDraft("A\nB\nC\nD")}
                            className="rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-300"
                          >
                            A-D
                          </button>
                          <button
                            type="button"
                            onClick={() => setVoteOptionsDraft("1\n2\n3\n4\n5")}
                            className="rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-300"
                          >
                            1-5
                          </button>
                          <button
                            type="button"
                            onClick={addChoiceOptionRow}
                            disabled={voteOptionRows.length >= MAX_CHOICE_OPTIONS}
                            className="rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-300 disabled:opacity-40"
                          >
                            + 추가
                          </button>
                          <button
                            type="button"
                            onClick={removeChoiceOptionRow}
                            disabled={voteOptionRows.length <= MIN_CHOICE_OPTIONS}
                            className="rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-300 disabled:opacity-40"
                          >
                            - 삭제
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {voteOptionRows.map((option, index) => (
                          <input
                            key={`choice-option-${index}`}
                            value={option}
                            onChange={(e) => updateVoteOptionRow(index, e.target.value)}
                            placeholder={`보기 ${index + 1}. 내용을 입력하세요`}
                            className="field-input h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm"
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {voteDraftType === "slider" ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-slate-700">단계 설정</div>
                        <div className="flex gap-1">
                          {[3, 5, 10].map((n) => (
                            <button
                              key={`slider-preset-${n}`}
                              type="button"
                              onClick={() => applySliderStepPreset(n)}
                              className="rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-300"
                            >
                              {n}단계
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        {voteOptionRows.map((option, index) => (
                          <input
                            key={`slider-option-${index}`}
                            value={option}
                            onChange={(e) => updateVoteOptionRow(index, e.target.value)}
                            placeholder={`${index + 1}단계 라벨`}
                            className="field-input h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-1.5">
                    <div className="text-xs font-bold text-slate-700">제한시간</div>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                      {voteDurationPresets.map((seconds) => (
                        <button
                          key={`vote-duration-${seconds}`}
                          type="button"
                          onClick={() => setVoteDurationDraft(seconds)}
                          className={cn(
                            "rounded-xl border px-2 py-2 text-xs font-bold transition-all",
                            voteDurationDraft === seconds
                              ? "border-blue-500 bg-blue-500 text-white shadow-sm"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100",
                          )}
                        >
                          {seconds}초
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setVoteDurationDraft(null)}
                        className={cn(
                          "rounded-xl border px-2 py-2 text-xs font-bold transition-all",
                          voteDurationDraft === null
                            ? "border-blue-500 bg-blue-500 text-white shadow-sm"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100",
                        )}
                      >
                        제한시간 없음
                      </button>
                    </div>
                  </div>

                    <button
                      onClick={handleOpenVoteFromDraft}
                      className="action-primary w-full rounded-2xl py-3 text-sm font-bold"
                    >
                      {voteSummary.isActive ? "투표 다시 시작" : "투표 시작"}
                    </button>
                  </div>
                </div>
                <div className="hidden grid grid-cols-2 gap-2.5">
                  {(["ox", "choice", "slider", "wordcloud"] as const).map((vType) => (
                    <button key={vType} onClick={() => openVote(vType)} className="action-secondary rounded-2xl py-3 text-sm font-semibold transition-all hover:bg-slate-50">
                      {vType === "ox" ? "O/X" : vType === "choice" ? "객관식" : vType === "slider" ? "슬라이더" : "워드클라우드"}
                    </button>
                  ))}
                </div>
                {voteSummary.isActive && (
                  <div className="mt-4 space-y-2 border-t border-slate-50 pt-3">
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      <div className="text-[11px] font-bold text-slate-400">현재 질문</div>
                      <div className="mt-1 text-sm font-semibold text-slate-800">{voteSummary.question}</div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-slate-600">응답 수</span>
                      <span className="text-teal-600">{voteSummary.responseCount}명 참여</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={closeVote} className="action-primary flex-1 rounded-lg py-1.5 text-[11px] font-bold">종료</button>
                      <button onClick={resetVote} className="action-secondary flex-1 rounded-lg py-1.5 text-[11px] font-bold">초기화</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
