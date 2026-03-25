"use client";

import Image from "next/image";
import { memo, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import {
  BarChart3,
  Grid,
  Lock,
  MessageSquare,
  Play,
  Shield,
  Sparkles,
  Timer,
  Unlock,
  X,
} from "lucide-react";

import { useClassroomStore } from "@/lib/store/classroom-store";
import { parseGalleryProjectionTarget } from "@/lib/projection-target";
import type {
  ChatMessage,
  FontSizeMode,
  GalleryCard,
  StudentAnswerDetail,
  Worksheet,
  WorksheetComponent,
} from "@/lib/types/domain";
import { cn, formatCountdown } from "@/lib/utils";

function inputToSeconds(value: string) {
  const [minutes = "0", seconds = "0"] = value.split(":");
  const parsedMinutes = Number(minutes);
  const parsedSeconds = Number(seconds);
  return Number.isFinite(parsedMinutes) && Number.isFinite(parsedSeconds)
    ? Math.max(0, parsedMinutes * 60 + parsedSeconds)
    : 0;
}

const timerPresetOptions = [
  { label: "1분", value: 60 },
  { label: "3분", value: 180 },
  { label: "5분", value: 300 },
  { label: "7분", value: 420 },
  { label: "10분", value: 600 },
  { label: "15분", value: 900 },
] as const;

interface ComponentPage {
  pageNumber: number;
  components: WorksheetComponent[];
}

const FONT_SCALE = {
  promptTitle: { sm: "text-[34px]", md: "text-[42px]", lg: "text-[54px]" },
  promptBody: { sm: "text-[20px]", md: "text-[28px]", lg: "text-[36px]" },
  questionTitle: { sm: "text-[26px]", md: "text-[32px]", lg: "text-[40px]" },
} as const;

const PANEL_SURFACE = "rounded-[22px] border border-white/10 bg-[#171f34] shadow-[0_18px_40px_rgba(0,0,0,0.22)]";
const STUDENT_CHAT_NAME_COLORS = [
  "#FF8A65", // Coral
  "#FFB74D", // Amber
  "#FFD54F", // Yellow
  "#DCE775", // Lime
  "#AED581", // Light Green
  "#81C784", // Green
  "#4DB6AC", // Teal
  "#4DD0E1", // Cyan
  "#64B5F6", // Light Blue
  "#7986CB", // Indigo
  "#9575CD", // Deep Purple
  "#BA68C8", // Purple
  "#F06292", // Pink
  "#FF7043", // Deep Orange
  "#4fc3f7", // Sky Blue
  "#34d399", // Emerald
  "#a78bfa", // Violet
  "#fb923c", // Orange
  "#f472b6", // Pink 400
  "#fb7185", // Rose
  "#2dd4bf", // Teal 400
  "#facc15", // Yellow 400
  "#c084fc", // Purple 400
  "#38bdf8", // Sky 400
] as const;

function fontSize<K extends keyof typeof FONT_SCALE>(kind: K, mode?: FontSizeMode) {
  return FONT_SCALE[kind][mode ?? "md"];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getStudentChatNameColor(senderName: string) {
  const normalized = senderName.trim();
  if (!normalized) {
    return STUDENT_CHAT_NAME_COLORS[0];
  }

  // Improved hash function using prime multiplier to reduce collisions
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  
  return STUDENT_CHAT_NAME_COLORS[Math.abs(hash) % STUDENT_CHAT_NAME_COLORS.length];
}

function isAnswerable(component: WorksheetComponent) {
  return component.type !== "prompt" && component.type !== "divider";
}

function countVisibleMessages(messages: ChatMessage[]) {
  return messages.filter((message) => !message.isDeleted).length;
}

function useChatAutoScroll(messages: ChatMessage[]) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const latestMessage = messages[messages.length - 1];

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const frame = requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });

    return () => cancelAnimationFrame(frame);
  }, [latestMessage?.id, latestMessage?.content, messages.length]);

  return scrollRef;
}

const EMPTY_GALLERY_ANSWER = "아직 공개할 답안이 없습니다.";

function galleryGridClassName(cardCount: number) {
  if (cardCount <= 1) {
    return "grid-cols-1";
  }

  if (cardCount === 2) {
    return "grid-cols-2";
  }

  if (cardCount === 3) {
    return "grid-cols-3";
  }

  if (cardCount === 4) {
    return "grid-cols-2";
  }

  return "grid-cols-3";
}

function galleryCardVariant(cardCount: number): "single" | "duo" | "trio" | "quad" | "grid" {
  if (cardCount <= 1) return "single";
  if (cardCount === 2) return "duo";
  if (cardCount === 3) return "trio";
  if (cardCount === 4) return "quad";
  return "grid";
}

function buildGalleryAnswerDetail(
  card: GalleryCard,
  component?: WorksheetComponent,
): StudentAnswerDetail | undefined {
  if (!component) {
    return undefined;
  }

  if (card.imageUrl) {
    return {
      componentId: component.id,
      questionTitle: component.title,
      componentType: component.type,
      imageUrl: card.imageUrl,
    };
  }

  if (!card.excerpt || card.excerpt === EMPTY_GALLERY_ANSWER) {
    return undefined;
  }

  if (
    component.type === "single_choice" ||
    component.type === "multi_choice" ||
    component.type === "ox"
  ) {
    return {
      componentId: component.id,
      questionTitle: component.title,
      componentType: component.type,
      choiceValues: card.excerpt
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    };
  }

  return {
    componentId: component.id,
    questionTitle: component.title,
    componentType: component.type,
    textValue: card.excerpt,
  };
}

export default function ProjectionView({
  worksheetId: _worksheetId,
  initialType,
  initialTargetId,
  initialWorksheetData: _initialWorksheetData,
}: {
  worksheetId: string;
  initialType?: string | null;
  initialTargetId?: string | null;
  initialWorksheetData?: Worksheet;
}) {
  const projectedType = useClassroomStore((state) => state.projectedType);
  const projectedTargetId = useClassroomStore((state) => state.projectedTargetId);
  const worksheetTitle = useClassroomStore((state) => state.worksheetTitle);
  const currentPage = useClassroomStore((state) => state.currentPage);
  const totalPages = useClassroomStore((state) => state.totalPages);
  const components = useClassroomStore((state) => state.components);
  const students = useClassroomStore((state) => state.students);
  const galleryCards = useClassroomStore((state) => state.galleryCards);
  const chatMessages = useClassroomStore((state) => state.chatMessages);
  const chatEnabled = useClassroomStore((state) => state.chatEnabled);
  const chatPaused = useClassroomStore((state) => state.chatPaused);
  const chatAnonymousMode = useClassroomStore((state) => state.chatAnonymousMode);
  const chatHighlightModeEnabled = useClassroomStore((state) => state.chatHighlightModeEnabled);
  const timerSecondsRemaining = useClassroomStore((state) => state.timerSecondsRemaining);
  const timerRunning = useClassroomStore((state) => state.timerRunning);
  const focusMode = useClassroomStore((state) => state.focusMode);
  const isLocked = useClassroomStore((state) => state.isLocked);
  const voteSummary = useClassroomStore((state) => state.voteSummary);
  const activeVote = useClassroomStore((state) => state.activeVote);
  const showChat = useClassroomStore((state) => state.showChat);
  const showTimer = useClassroomStore((state) => state.showTimer);
  const showVote = useClassroomStore((state) => state.showVote);

  const setProjection = useClassroomStore((state) => state.setProjection);
  const setCurrentPage = useClassroomStore((state) => state.setCurrentPage);
  const toggleFocusMode = useClassroomStore((state) => state.toggleFocusMode);
  const toggleWritingLock = useClassroomStore((state) => state.toggleWritingLock);
  const toggleChatAnonymousMode = useClassroomStore((state) => state.toggleChatAnonymousMode);
  const toggleChat = useClassroomStore((state) => state.toggleChat);
  const toggleChatPaused = useClassroomStore((state) => state.toggleChatPaused);
  const startTimer = useClassroomStore((state) => state.startTimer);
  const pauseTimer = useClassroomStore((state) => state.pauseTimer);
  const resetTimer = useClassroomStore((state) => state.resetTimer);
  const setTimer = useClassroomStore((state) => state.setTimer);
  const toggleChatHighlightMode = useClassroomStore((state) => state.toggleChatHighlightMode);
  const toggleChatHighlighted = useClassroomStore((state) => state.toggleChatHighlighted);
  const clearChatHighlights = useClassroomStore((state) => state.clearChatHighlights);
  const clearChat = useClassroomStore((state) => state.clearChat);
  const toggleShowChat = useClassroomStore((state) => state.toggleShowChat);
  const toggleShowTimer = useClassroomStore((state) => state.toggleShowTimer);
  const toggleShowVote = useClassroomStore((state) => state.toggleShowVote);

  const [zoomPercent, setZoomPercent] = useState(100);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [timerInput, setTimerInput] = useState("05:00");
  const appliedInitialProjectionRef = useRef(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (appliedInitialProjectionRef.current) {
      return;
    }

    appliedInitialProjectionRef.current = true;
    if (!projectedType && initialType) {
      setProjection(initialType, initialTargetId ?? null);
    }
  }, [initialTargetId, initialType, projectedType, setProjection]);

  useEffect(() => {
    if (!timerRunning) {
      setTimerInput(formatCountdown(timerSecondsRemaining));
    }
  }, [timerRunning, timerSecondsRemaining]);

  const handleStartTimerFromInput = () => {
    const seconds = inputToSeconds(timerInput);
    if (seconds <= 0) return;
    setTimer(seconds);
    startTimer();
  };

  const pages = useMemo<ComponentPage[]>(() => {
    const maxPage = Math.max(totalPages, ...components.map((component) => component.page ?? 1), 1);
    return Array.from({ length: maxPage }, (_, index) => ({
      pageNumber: index + 1,
      components: components.filter((component) => (component.page ?? 1) === index + 1),
    }));
  }, [components, totalPages]);

  const currentPageData = useMemo(
    () => pages.find((page) => page.pageNumber === currentPage) ?? pages[0] ?? { pageNumber: 1, components: [] },
    [currentPage, pages],
  );

  const answerableSections = useMemo(
    () => currentPageData.components.filter(isAnswerable),
    [currentPageData.components],
  );

  const activeStudent = useMemo(() => {
    if (projectedType !== "student" || !projectedTargetId) return null;
    return students.find((student) => student.id === projectedTargetId) ?? null;
  }, [projectedTargetId, projectedType, students]);

  const singleGalleryCard = useMemo(() => {
    if (projectedType !== "gallery" || !projectedTargetId) return null;
    return galleryCards.find((card) => card.id === projectedTargetId) ?? null;
  }, [galleryCards, projectedTargetId, projectedType]);

  const projectedGalleryTarget = useMemo(
    () => parseGalleryProjectionTarget(projectedTargetId),
    [projectedTargetId],
  );

  const galleryGrid = useMemo(() => {
    const scopedCards = projectedGalleryTarget.questionId
      ? galleryCards.filter((card) => card.questionId === projectedGalleryTarget.questionId)
      : galleryCards;

    if (projectedType === "gallery_all") return scopedCards;
    if (projectedType === "gallery_partial") {
      if (projectedGalleryTarget.submissionIds.length > 0) {
        const selectedIds = new Set(projectedGalleryTarget.submissionIds);
        return scopedCards.filter((card) => selectedIds.has(card.id));
      }

      return scopedCards.filter((card) => card.isProjected);
    }

    return [];
  }, [galleryCards, projectedGalleryTarget, projectedType]);

  const projectionMode = useMemo<"worksheet" | "student" | "gallery" | "gallery-grid">(() => {
    if (activeStudent) return "student";
    if (singleGalleryCard) return "gallery";
    if (galleryGrid.length > 0) return "gallery-grid";
    return "worksheet";
  }, [activeStudent, galleryGrid.length, singleGalleryCard]);
  const mainProjectionType = projectedType === "chat" || projectedType === "timer" || projectedType === "vote" ? projectedType : null;

  const highlightedMessages = useMemo(() => {
    if (!chatHighlightModeEnabled) {
      return [];
    }

    return chatMessages
      .filter((message) => !message.isDeleted && !message.isTeacher && message.isHighlighted)
      .sort((left, right) => {
        const leftTime = left.highlightedAt ? new Date(left.highlightedAt).getTime() : 0;
        const rightTime = right.highlightedAt ? new Date(right.highlightedAt).getTime() : 0;
        return leftTime - rightTime;
      });
  }, [chatMessages, chatHighlightModeEnabled]);

  const studentAnswers = useMemo(() => {
    if (!activeStudent?.answers) return {};
    return Object.fromEntries(activeStudent.answers.map((answer) => [answer.componentId, answer])) as Record<
      string,
      StudentAnswerDetail
    >;
  }, [activeStudent]);

  const handleToggleChatVisibility = () => {
    if (showChat && chatHighlightModeEnabled) {
      toggleChatHighlightMode();
    }
    toggleShowChat();
  };

  useEffect(() => {
    setActiveSectionId(answerableSections[0]?.id ?? null);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [currentPage, answerableSections]);

  const jumpToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const changeZoom = (delta: 25 | -25) => {
    setZoomPercent((current) => clamp(current + delta, 50, 200));
  };

  const resetView = () => {
    setZoomPercent(100);
    setActiveSectionId(answerableSections[0]?.id ?? null);
    jumpToTop();
  };

  const jumpToSection = (componentId: string) => {
    setActiveSectionId(componentId);
    sectionRefs.current[componentId]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const hasSidebar = showChat || showTimer || showVote;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#090f1f] text-white">
      <header className="border-b border-white/8 bg-[#0f1528] px-3 py-1.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 whitespace-nowrap pl-2 text-[13px] font-semibold leading-none text-[#7082aa]">
            <span className="h-2 w-2 rounded-full bg-[#10d5c2]" />
            <span>실시간 송출 중</span>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pr-1">
            <PagesControl pages={pages} currentPage={currentPageData.pageNumber} onSelectPage={setCurrentPage} />
            <TopBarButton
              icon={<Sparkles className="h-4 w-4" />}
              label="집중 모드"
              active={focusMode}
              activeClassName="border-[#2af1d3] bg-[#24304b] text-white shadow-[0_0_0_1px_rgba(42,241,211,0.25),0_0_18px_rgba(42,241,211,0.22)]"
              onClick={toggleFocusMode}
            />
            <TopBarButton
              icon={isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              label="쓰기 잠금"
              active={isLocked}
              activeClassName="border-[#2af1d3] bg-[#24304b] text-white shadow-[0_0_0_1px_rgba(42,241,211,0.25),0_0_18px_rgba(42,241,211,0.22)]"
              onClick={toggleWritingLock}
            />
            <TopBarButton
              icon={<Timer className="h-4 w-4" />}
              label="타이머"
              active={showTimer}
              activeClassName="border-[#0e7769] bg-[#0b6055] text-[#d7fff8]"
              onClick={toggleShowTimer}
            />
            <TopBarButton
              icon={<BarChart3 className="h-4 w-4" />}
              label="투표"
              active={showVote}
              activeClassName="border-[#8d2b63] bg-[#712050] text-[#ffe2f4]"
              onClick={toggleShowVote}
            />
            <TopBarButton
              icon={<MessageSquare className="h-4 w-4" />}
              label="채팅창"
              active={showChat}
              activeClassName="border-[#4f53dd] bg-[#3d3aa2] text-white"
              onClick={handleToggleChatVisibility}
            />
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="relative min-w-0 flex-1">
          <div ref={scrollRef} className="h-full overflow-auto pl-0 pr-1 py-0">
            {mainProjectionType === "chat" ? (
              <MemoizedProjectionChatStage messages={chatMessages} anonymous={chatAnonymousMode} />
            ) : mainProjectionType === "timer" ? (
              <MemoizedTimerSidebar
                seconds={timerSecondsRemaining}
                running={timerRunning}
                timerInput={timerInput}
                onTimerInputChange={setTimerInput}
                onToggleTimer={timerRunning ? pauseTimer : handleStartTimerFromInput}
                onResetTimer={resetTimer}
                compact={false}
                onClose={() => setProjection(null)}
              />
            ) : mainProjectionType === "vote" ? (
              <MemoizedVoteSidebar
                activeVote={activeVote}
                voteSummary={voteSummary}
                compact={false}
                onClose={() => setProjection(null)}
              />
            ) : chatHighlightModeEnabled ? (
              <ProjectionHighlightCanvas
                messages={highlightedMessages}
                anonymous={chatAnonymousMode}
                questionTitle={currentPageData.components.find(isAnswerable)?.title ?? null}
                variant="B"
              />
            ) : (
              <MemoizedProjectionCanvas
                worksheetTitle={worksheetTitle}
                pageNumber={currentPageData.pageNumber}
                mode={projectionMode}
                components={currentPageData.components}
                answers={studentAnswers}
                galleryCards={galleryGrid}
                galleryCard={singleGalleryCard}
                sectionRefs={sectionRefs}
                zoomPercent={zoomPercent}
              />
            )}
          </div>

          {!chatHighlightModeEnabled &&
          (projectionMode === "worksheet" || projectionMode === "student") &&
          answerableSections.length > 0 ? (
            <section className="absolute right-8 top-1/2 flex -translate-y-1/2 flex-col items-center gap-2">
              <VerticalActionButton label="TOP" compact onClick={jumpToTop} />
              {answerableSections.map((component, index) => (
                <VerticalActionButton
                  key={component.id}
                  label={`${index + 1}`}
                  active={activeSectionId === component.id}
                  onClick={() => jumpToSection(component.id)}
                />
              ))}
              <div className="my-1 h-px w-8 bg-white/20" />
              <VerticalActionButton label="+" onClick={() => changeZoom(25)} />
              <div className="flex h-12 w-14 items-center justify-center rounded-[14px] bg-[#1a2338] text-center text-[13px] font-black text-[#10e7d3]">
                {zoomPercent}%
              </div>
              <VerticalActionButton label="-" onClick={() => changeZoom(-25)} />
              <VerticalActionButton label="RESET" compact onClick={resetView} />
            </section>
          ) : null}
        </main>

        {hasSidebar ? (
          <aside className="flex w-[560px] shrink-0 flex-col border-l border-white/8">
            {showChat ? (
              <MemoizedProjectionChatSidebar
                enabled={chatEnabled}
                messages={chatMessages}
                anonymous={chatAnonymousMode}
                highlightModeEnabled={chatHighlightModeEnabled}
                paused={chatPaused}
                onClear={clearChat}
                onClearHighlights={clearChatHighlights}
                onToggleHighlightMode={toggleChatHighlightMode}
                onToggleHighlighted={toggleChatHighlighted}
                onToggleAnonymous={toggleChatAnonymousMode}
                onToggleEnabled={toggleChat}
                onTogglePaused={toggleChatPaused}
                onClose={handleToggleChatVisibility}
              />
            ) : null}
            {showTimer ? (
              <MemoizedTimerSidebar
                seconds={timerSecondsRemaining}
                running={timerRunning}
                timerInput={timerInput}
                onTimerInputChange={setTimerInput}
                onToggleTimer={timerRunning ? pauseTimer : handleStartTimerFromInput}
                onResetTimer={resetTimer}
                compact={showChat || showVote}
                onClose={toggleShowTimer}
              />
            ) : null}
            {showVote ? (
              <MemoizedVoteSidebar
                activeVote={activeVote}
                voteSummary={voteSummary}
                compact={showChat || showTimer}
                onClose={toggleShowVote}
              />
            ) : null}
          </aside>
        ) : null}
      </div>
    </div>
  );
}

function PagesControl({
  pages,
  currentPage,
  onSelectPage,
}: {
  pages: ComponentPage[];
  currentPage: number;
  onSelectPage: (page: number) => void;
}) {
  return (
    <div className="inline-flex h-10 items-center gap-2 rounded-[16px] border border-white/10 bg-[#151d32] px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <span className="px-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#6f81a4]">Pages</span>
      {pages.map((page) => (
        <button
          key={page.pageNumber}
          type="button"
          onClick={() => onSelectPage(page.pageNumber)}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full text-[18px] font-bold transition-all",
            page.pageNumber === currentPage
              ? "bg-[#12d4c8] text-[#0a1428] shadow-[0_8px_20px_rgba(18,212,200,0.28)]"
              : "text-[#c5d3ea] hover:bg-white/8",
          )}
        >
          {page.pageNumber}
        </button>
      ))}
    </div>
  );
}

function TopBarButton({
  icon,
  label,
  active,
  activeClassName,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  activeClassName: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-[16px] border border-white/10 bg-[#151d32] px-5 text-[18px] font-bold text-[#c7d3e8] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-all hover:border-white/15 hover:text-white",
        active ? activeClassName : undefined,
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function VerticalActionButton({
  label,
  active = false,
  compact = false,
  onClick,
}: {
  label: string;
  active?: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[14px] bg-[#1a2338] font-black tracking-tight text-[#f1f5ff] transition-all hover:bg-[#202b43]",
        compact ? "h-12 w-14 text-[12px]" : "h-12 w-14 text-[26px]",
        active ? "ring-2 ring-[#10d5c2] text-[#10e7d3]" : undefined,
      )}
    >
      {label}
    </button>
  );
}

function ProjectionCanvas({
  worksheetTitle,
  pageNumber,
  mode,
  components,
  answers,
  galleryCards,
  galleryCard,
  sectionRefs,
  zoomPercent,
}: {
  worksheetTitle: string;
  pageNumber: number;
  mode: "worksheet" | "student" | "gallery" | "gallery-grid";
  components: WorksheetComponent[];
  answers: Record<string, StudentAnswerDetail>;
  galleryCards: GalleryCard[];
  galleryCard: GalleryCard | null;
  sectionRefs: MutableRefObject<Record<string, HTMLElement | null>>;
  zoomPercent: number;
}) {
  if (mode === "gallery-grid") {
    const cardCount = galleryCards.length;
    const variant = galleryCardVariant(cardCount);

    // All cards in a gallery-grid share the same question ??show it once at the top
    const sharedQuestionId = galleryCards[0]?.questionId;
    const sharedComponent = sharedQuestionId
      ? components.find((c) => c.id === sharedQuestionId)
      : undefined;

    return (
      <div className="flex h-full flex-col px-0 py-1">
        {sharedComponent && (
          <div className="shrink-0 px-8 py-5">
            <div className="flex items-start gap-5 rounded-[28px] border border-white/8 bg-gradient-to-br from-[#1e293b] to-[#111827] p-8 shadow-2xl">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-[#77f2e5] to-[#10d5c2] text-[28px] font-black text-[#0f172a] shadow-[0_8px_20px_rgba(16,213,194,0.3)]">
                Q
              </div>
              <div className="min-w-0">
                <h2 className="text-[38px] font-black leading-[1.2] tracking-tight text-white">
                  {sharedComponent.title}
                </h2>
                {sharedComponent.description ? (
                  <p className="mt-3 text-[20px] font-bold leading-relaxed text-[#94a3b8]">
                    {sharedComponent.description}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        )}
        <div className={cn("grid min-h-0 flex-1 w-full gap-3", galleryGridClassName(cardCount))}>
          {galleryCards.map((card) => (
            <ProjectionGalleryCard
              key={card.id}
              card={card}
              component={components.find((component) => component.id === card.questionId)}
              variant={variant}
              hideQuestion
            />
          ))}
        </div>
      </div>
    );
  }

  if (mode === "gallery" && galleryCard) {
    return (
      <div className="flex h-full items-center justify-center px-0 py-1">
        <div className="w-full">
          <ProjectionGalleryCard
            card={galleryCard}
            component={components.find((component) => component.id === galleryCard.questionId)}
            expanded
            variant="single"
          />
        </div>
      </div>
    );
  }

  if (components.length === 0) {
    return <ProjectionWaitingState />;
  }

  const scale = zoomPercent / 100;

  return (
    <div className="pb-10">
      <div
        className="ml-0 mr-auto origin-top transition-transform duration-200 ease-out"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: `${100 / scale}%`,
          maxWidth: "none",
        }}
      >
        <ProjectionWorksheetPage
          worksheetTitle={worksheetTitle}
          pageNumber={pageNumber}
          components={components}
          answers={answers}
          sectionRefs={sectionRefs}
        />
      </div>
    </div>
  );
}

const MemoizedProjectionCanvas = memo(ProjectionCanvas);

export type HighlightVariant = "original" | "A" | "B" | "C" | "D";

export function ProjectionHighlightCanvas({
  messages,
  anonymous,
  questionTitle,
  variant = "original",
}: {
  messages: ChatMessage[];
  anonymous: boolean;
  questionTitle: string | null;
  variant?: HighlightVariant;
}) {
  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-8 py-8">
        <div className="flex min-h-[320px] w-full max-w-[1200px] flex-col items-center justify-center rounded-[32px] border border-white/8 bg-[radial-gradient(circle_at_top,#1f3058_0%,#10182c_58%,#0b1121_100%)] px-12 py-14 text-center shadow-[0_26px_70px_rgba(0,0,0,0.34)]">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[#6ae8db]/30 bg-[#10243a] text-[#6ae8db]">
            <Sparkles className="h-9 w-9" />
          </div>
          <div className="mt-8 text-[34px] font-black tracking-tight text-white">좋은 답변 하이라이트</div>
          <p className="mt-4 max-w-[620px] whitespace-pre-line text-[20px] font-semibold leading-9 text-[#92a3c3]">
            채팅창에서 좋은 학생 답변을 클릭해{"\n"}
            여기에 모아보세요
          </p>
        </div>
      </div>
    );
  }

  if (variant === "B") {
    return (
      <div className="relative min-h-full overflow-hidden bg-[#03050b] px-6 py-6">
        {/* 배경 스포트라이트 빔들 */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="animate-beam-pulse absolute left-1/2 top-0 h-[80%] w-[65%] -translate-x-1/2"
            style={{
              background: "radial-gradient(ellipse 55% 100% at 50% 0%, rgba(210,235,255,0.28) 0%, rgba(180,215,255,0.08) 50%, transparent 75%)",
            }}
          />
          <div
            className="animate-beam-pulse absolute left-1/4 top-0 h-[60%] w-[40%] -translate-x-1/2 opacity-60"
            style={{
              background: "radial-gradient(ellipse 40% 100% at 50% 0%, rgba(160,200,255,0.22) 0%, transparent 65%)",
              animationDelay: "1.2s",
            }}
          />
          <div
            className="animate-beam-pulse absolute right-1/4 top-0 h-[60%] w-[40%] translate-x-1/2 opacity-60"
            style={{
              background: "radial-gradient(ellipse 40% 100% at 50% 0%, rgba(160,200,255,0.22) 0%, transparent 65%)",
              animationDelay: "0.6s",
            }}
          />
          {/* 바닥 반사광 */}
          <div
            className="absolute bottom-0 left-1/2 h-[25%] w-full -translate-x-1/2 opacity-40"
            style={{
              background: "radial-gradient(ellipse 80% 100% at 50% 100%, rgba(180,220,255,0.12) 0%, transparent 70%)",
            }}
          />
        </div>

        {/* 헤더 */}
        <div className="relative z-10 mb-8 flex flex-wrap items-end justify-between gap-4 px-2">
          <div>
            <div className="flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.28em] text-[#8da8d4]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Best Answer</span>
            </div>
            {questionTitle ? (
              <div className="mt-1.5 text-[20px] font-semibold text-white/70">{questionTitle}</div>
            ) : null}
          </div>
          <div className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-[14px] font-bold text-[#c8d8f4]">
            {messages.length}개 선택
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap content-start justify-center gap-8 pb-10 pt-2">
          {messages.map((message, index) => (
            <HighlightAnswerCard
              key={message.id}
              message={message}
              anonymous={anonymous}
              index={index}
              total={messages.length}
              variant="B"
            />
          ))}
        </div>
      </div>
    );
  }

  if (variant === "D") {
    return (
      <div className="min-h-full bg-[#0d0f1a] px-6 py-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 px-2">
          <div className="text-[22px] font-black tracking-tight text-white">
            HIGHLIGHT
            {questionTitle ? <span className="ml-3 text-[16px] font-semibold text-[#94a3b8]">{questionTitle}</span> : null}
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[15px] font-bold text-[#d8e4fa]">
            {messages.length}개 선택
          </div>
        </div>
        <div className="flex flex-wrap content-start justify-center gap-6 pb-10 pt-2">
          {messages.map((message, index) => (
            <HighlightAnswerCard
              key={message.id}
              message={message}
              anonymous={anonymous}
              index={index}
              total={messages.length}
              variant="D"
            />
          ))}
        </div>
      </div>
    );
  }

  const headerLabel =
    variant === "C" ? "Best Answers" :
    variant === "A" ? "Highlight" :
    "Highlight";

  return (
    <div className="min-h-full px-6 py-6">
      <div className="rounded-[32px] border border-white/8 bg-[radial-gradient(circle_at_top,#1e2f58_0%,#121a2f_55%,#0b1121_100%)] p-8 shadow-[0_28px_80px_rgba(0,0,0,0.34)]">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[15px] font-black uppercase tracking-[0.2em] text-[#6ee7db]">
              {variant === "original" && <Sparkles className="h-4 w-4" />}
              <span>{headerLabel}</span>
            </div>
            <div className="mt-3 text-[34px] font-black tracking-tight text-white">좋은 답변 하이라이트</div>
            {questionTitle ? (
              <div className="mt-2 text-[18px] font-semibold text-[#95a6c6]">{questionTitle}</div>
            ) : null}
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[15px] font-bold text-[#d8e4fa]">
            {messages.length}개 답변 선택
          </div>
        </div>

        <div className="flex flex-wrap content-start justify-center gap-6 overflow-auto pb-10 pt-2">
          {messages.map((message, index) => (
            <HighlightAnswerCard
              key={message.id}
              message={message}
              anonymous={anonymous}
              index={index}
              total={messages.length}
              variant={variant}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ProjectionChatStage({
  messages,
  anonymous,
}: {
  messages: ChatMessage[];
  anonymous: boolean;
}) {
  const visibleMessages = useMemo(
    () => messages.filter((message) => !message.isDeleted),
    [messages],
  );
  const messagesScrollRef = useChatAutoScroll(visibleMessages);

  return (
    <div className="h-full px-4 py-4">
      <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-white/8 bg-[#10182c] shadow-[0_24px_60px_rgba(0,0,0,0.26)]">
        <div
          ref={messagesScrollRef}
          className="min-h-0 flex-1 overflow-auto px-8 py-8"
        >
          {visibleMessages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-[22px] font-semibold text-[#8da0c4]">
              아직 메시지가 없습니다
            </div>
          ) : (
            <div className="space-y-1.5">
              {visibleMessages.map((message) => {
                const isTeacher = message.isTeacher || message.senderName === "교사";
                const displayName = !isTeacher && anonymous && message.isAnonymous ? "익명" : message.senderName;
                const senderColor = isTeacher ? "#8f97ff" : getStudentChatNameColor(displayName);

                return (
                  <div key={message.id} className="flex items-start gap-4 text-[28px] leading-[1.55]">
                    <div className="flex shrink-0 items-center gap-1.5 font-black" style={{ color: senderColor }}>
                      <span>{displayName}</span>
                      {isTeacher ? <Shield className="h-5 w-5 fill-[#60a5fa] text-[#60a5fa]" /> : null}
                    </div>
                    <span className="text-[#6b7fa3]">|</span>
                    <div className="min-w-0 flex-1 break-all font-semibold text-[#f8fbff]">{message.content}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const MemoizedProjectionChatStage = memo(ProjectionChatStage);

const PICK_LABELS = ["1st", "2nd", "3rd", "4th", "5th", "6th"];
const PICK_TROPHIES = ["🥇", "🥈", "🥉", "✦", "✦", "✦"];

function HighlightAnswerCard({
  message,
  anonymous,
  index,
  total,
  variant = "original"
}: {
  message: ChatMessage;
  anonymous: boolean;
  index: number;
  total: number;
  variant?: HighlightVariant;
}) {
  const displayName = anonymous && message.isAnonymous ? "익명" : message.senderName;
  const rotation = [-2.2, 1.6, -1.3, 2.4, -1.7, 1.2][index % 6];
  const verticalShift = [0, 14, -10, 18, -6, 10][index % 6];
  const width =
    total <= 1
      ? "min(920px, 84%)" : total === 2
        ? "min(620px, 44%)" : total <= 4
          ? "min(540px, 40%)" : "min(460px, 30%)";
  const contentSizeClass =
    total <= 2 ? "text-[32px] leading-[1.5]" : total <= 4 ? "text-[28px] leading-[1.55]" : "text-[24px] leading-[1.55]";
  const nameSizeClass = total <= 2 ? "text-[18px]" : "text-[16px]";

  if (variant === "A") {
    const accentClasses = [
      "border-[#6ae8db]/50 bg-[linear-gradient(180deg,#fffef7_0%,#f0fdfc_100%)]",
      "border-[#ffd5a8]/50 bg-[linear-gradient(180deg,#fffaf3_0%,#fff8f0_100%)]",
      "border-[#c7d7ff]/50 bg-[linear-gradient(180deg,#f8fbff_0%,#f3f0ff_100%)]",
    ];
    return (
      <article
        className={cn(
          "animate-bounce-in animate-glow-pulse relative overflow-hidden rounded-[28px] border-2 px-7 pb-8 pt-7 text-[#14284a]",
          accentClasses[index % accentClasses.length],
        )}
        style={{
          width,
          transform: `translateY(${verticalShift}px) rotate(${rotation}deg)`,
          animationDelay: `${index * 0.12}s, ${index * 0.12}s`,
        }}
      >
        <div className="absolute right-4 top-4 rounded-full bg-[#0d3a3c] px-3 py-1 text-[12px] font-black uppercase tracking-[0.18em] text-[#7af1e2]">
          {PICK_LABELS[index] ?? `${index + 1}th`} Pick
        </div>
        <div className="pointer-events-none absolute left-6 top-6 text-[72px] font-black leading-none text-[#6ae8db]/25">✦</div>
        <div className="relative z-10">
          <div className={cn("font-black uppercase tracking-[0.18em] text-[#0d9488]", nameSizeClass)}>
            {displayName}
          </div>
          <div className={cn("mt-4 whitespace-pre-line break-words font-black tracking-tight", contentSizeClass)}>
            {message.content}
          </div>
        </div>
      </article>
    );
  }

  if (variant === "B") {
    const nameSizeB = total <= 1 ? "text-[34px]" : total === 2 ? "text-[28px]" : "text-[22px]";
    const entryDelay = `${index * 0.18}s`;
    return (
      <article
        className="animate-spotlight-entry animate-card-glow relative overflow-hidden rounded-[32px] border border-white/25 bg-white px-8 pb-9 pt-7 text-[#14284a]"
        style={{
          width,
          animationDelay: `${entryDelay}, ${entryDelay}`,
        }}
      >
        {/* 상단 스포트라이트 */}
        <div
          className="animate-spotlight-pulse pointer-events-none absolute inset-0 rounded-[32px]"
          style={{
            background: "radial-gradient(ellipse 95% 60% at 50% -8%, rgba(255,255,255,0.80) 0%, rgba(220,240,255,0.25) 45%, transparent 68%)",
          }}
        />
        {/* 카드 외곽 블루-화이트 헤일로 */}
        <div
          className="pointer-events-none absolute -inset-px rounded-[32px]"
          style={{
            background: "linear-gradient(180deg, rgba(200,230,255,0.22) 0%, transparent 40%)",
          }}
        />
        {/* 하단 미묘한 그림자 그라디언트 */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[32px]"
          style={{
            background: "linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.05) 100%)",
          }}
        />

        <div className="relative z-10">
          {/* 이름 — 크고 선명하게 */}
          <div
            className={cn("animate-name-reveal font-black tracking-[0.06em] text-[#0a2540]", nameSizeB)}
            style={{ animationDelay: `calc(${entryDelay} + 0.2s)` }}
          >
            {displayName}
          </div>
          {/* 구분선 */}
          <div className="my-4 h-px w-12 rounded-full bg-[#0a2540]/20" />
          {/* 답변 내용 */}
          <div className={cn("whitespace-pre-line break-words font-bold leading-relaxed tracking-tight text-[#1e3a5f]", contentSizeClass)}>
            {message.content}
          </div>
        </div>
      </article>
    );
  }

  if (variant === "C") {
    const isTop3 = index < 3;
    return (
      <article
        className={cn(
          "animate-slide-up relative overflow-hidden rounded-[28px] border-2 bg-[linear-gradient(160deg,#fffdf4_0%,#fffbea_50%,#fff8dc_100%)] px-7 pb-8 pt-7 text-[#14284a]",
          isTop3 ? "animate-gold-pulse border-[#f59e0b]/60" : "border-[#e2c97e]/40 shadow-[0_24px_60px_rgba(3,7,18,0.18)]",
        )}
        style={{
          width,
          transform: `translateY(${verticalShift}px) rotate(${rotation}deg)`,
          animationDelay: `${index * 0.13}s, ${index * 0.13}s`,
        }}
      >
        <div className="mb-3 text-[28px] leading-none">{PICK_TROPHIES[index] ?? "✦"}</div>
        <div className="animate-shimmer pointer-events-none absolute inset-0 rounded-[28px] opacity-50" />

        <div className="relative z-10">
          <div className={cn("flex items-center gap-2 font-black tracking-[0.12em]", nameSizeClass)}>
            <span style={{ color: isTop3 ? "#b45309" : "#92400e" }}>{displayName}</span>
            {isTop3 && <span className="text-[#f59e0b]">우수</span>}
          </div>
          <div className={cn("mt-4 whitespace-pre-line break-words font-black tracking-tight text-[#1c1917]", contentSizeClass)}>
            {message.content}
          </div>
        </div>
      </article>
    );
  }

  if (variant === "D") {
    const neonBgs = [
      "bg-[linear-gradient(145deg,#1e3a8a,#1d4ed8)] border-blue-400",
      "bg-[linear-gradient(145deg,#831843,#be185d)] border-pink-400",
      "bg-[linear-gradient(145deg,#14532d,#15803d)] border-green-400",
      "bg-[linear-gradient(145deg,#4c1d95,#7c3aed)] border-violet-400",
    ];
    const starPositions = [
      { top: "12%", left: "10%", delay: "0s" },
      { top: "22%", right: "12%", delay: "0.4s" },
      { top: "45%", left: "16%", delay: "0.8s" },
      { bottom: "15%", right: "18%", delay: "0.2s" },
    ];
    return (
      <article
        className={cn(
          "animate-bounce-in animate-rainbow-border relative overflow-hidden rounded-[28px] border-2 px-7 pb-8 pt-7 text-white shadow-[0_24px_60px_rgba(0,0,0,0.5)]",
          neonBgs[index % neonBgs.length],
        )}
        style={{
          width,
          transform: `translateY(${verticalShift}px) rotate(${rotation}deg)`,
          animationDelay: `${index * 0.12}s, 0s`,
        }}
      >
        {starPositions.map((pos, i) => (
          <div
            key={i}
            className={cn("pointer-events-none absolute text-[18px] leading-none", i % 2 === 0 ? "animate-star-float" : "animate-star-float-2")}
            style={{ ...pos, animationDelay: pos.delay }}
          >
            ✦
          </div>
        ))}

        <div className="relative z-10">
          <div className={cn("font-black tracking-[0.1em] text-white/90 drop-shadow-sm", nameSizeClass)}>
            {displayName}
          </div>
          <div className={cn("mt-4 whitespace-pre-line break-words font-black tracking-tight text-white", contentSizeClass)}>
            {message.content}
          </div>
        </div>
      </article>
    );
  }

  const accentClasses = [
    "border-[#79efe2]/30 bg-[linear-gradient(180deg,#fffef7_0%,#f4fbff_100%)]",
    "border-[#ffd5a8]/30 bg-[linear-gradient(180deg,#fffaf3_0%,#fffdf8_100%)]",
    "border-[#c7d7ff]/30 bg-[linear-gradient(180deg,#f8fbff_0%,#fefcff_100%)]",
  ];

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-[28px] border px-7 pb-8 pt-7 text-[#14284a] shadow-[0_24px_60px_rgba(3,7,18,0.22)]",
        accentClasses[index % accentClasses.length],
        index === total - 1 ? "ring-2 ring-[#6ae8db]/35" : "",
      )}
      style={{
        width,
        transform: `translateY(${verticalShift}px) rotate(${rotation}deg)`,
      }}
    >
      <div className="pointer-events-none absolute left-6 top-6 text-[72px] font-black leading-none text-[#d8e6f7]/70">✦</div>
      <div className="relative z-10">
        <div className={cn("font-black uppercase tracking-[0.18em] text-[#506a93]", nameSizeClass)}>
          {displayName}
        </div>
        <div className={cn("mt-4 whitespace-pre-line break-words font-black tracking-tight", contentSizeClass)}>
          {message.content}
        </div>
      </div>
    </article>
  );
}

function ProjectionWaitingState() {
  return (
    <div className="flex h-full items-start justify-center px-6 py-4">
      <div className="flex min-h-[380px] w-full items-center justify-center rounded-[28px] border border-white/8 bg-[#0d1326] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-[24px] border border-white/6 bg-white/[0.03] text-[#94a3b8]">
            <Grid className="h-10 w-10" />
          </div>
          <div className="mt-8 text-[24px] font-black tracking-tight text-white">현재 대기 중입니다</div>
          <p className="mt-4 max-w-[440px] whitespace-pre-line text-[17px] leading-8 text-[#7a8cad]">
            교사 대시보드에서 공유하고 싶은 내용을 선택하면{"\n"}
            이 화면에 실시간으로 나타납니다.
          </p>
        </div>
      </div>
    </div>
  );
}

function ProjectionWorksheetPage({
  worksheetTitle,
  pageNumber,
  components,
  answers,
  sectionRefs,
}: {
  worksheetTitle: string;
  pageNumber: number;
  components: WorksheetComponent[];
  answers: Record<string, StudentAnswerDetail>;
  sectionRefs: MutableRefObject<Record<string, HTMLElement | null>>;
}) {
  let questionNumber = 0;

  return (
    <article className="relative overflow-hidden rounded-[10px] border border-[#d7deea] bg-[#fdfcf8] shadow-[0_24px_60px_rgba(2,6,23,0.22)]">
      <div className="pointer-events-none absolute inset-y-0 left-[52px] w-[3px] bg-[#f6c7d2]" />
      <div className="pointer-events-none absolute inset-y-0 left-[64px] w-[3px] bg-[#f9d7de]" />
      <div className="absolute right-10 top-7 text-[20px] font-black uppercase tracking-[0.18em] text-[#d2ddec]">
        PAGE {pageNumber}
      </div>

      <div className="pb-20 pl-[78px] pr-[88px] pt-16">
        <div className="sr-only">{worksheetTitle}</div>

        {components.map((component) => {
          if (component.type === "prompt") {
            return (
              <section key={component.id} className="mb-16">
                <div className="inline-flex items-start gap-3">
                  <h2 className={cn("font-black tracking-tight text-[#13284c]", fontSize("promptTitle", component.titleFontSize))}>
                    {component.title}
                  </h2>
                  <span className="translate-y-1 text-[34px]">📌</span>
                </div>
                <div className="mt-4 h-[6px] w-[360px] bg-[#263554]" />
                <div
                  className={cn(
                    "mt-10 whitespace-pre-line font-black leading-[1.65] text-[#1c335b]",
                    fontSize("promptBody", component.bodyFontSize),
                  )}
                >
                  {component.body}
                </div>
              </section>
            );
          }

          if (component.type === "divider") {
            return <div key={component.id} className="my-12 border-t-2 border-dashed border-[#d5dce8]" />;
          }

          questionNumber += 1;

          return (
            <section
              key={component.id}
              ref={(node) => {
                sectionRefs.current[component.id] = node;
              }}
              className="scroll-mt-24 pb-14"
            >
              <div className="flex items-start gap-7">
                <div className="pt-1 font-serif text-[72px] font-bold italic leading-none tracking-tight text-[#1b2c4d]">
                  {questionNumber}.
                </div>
                <div className="min-w-0 flex-1 pt-2">
                  <h3 className={cn("font-black leading-tight text-[#10274b]", fontSize("questionTitle", component.titleFontSize))}>
                    {component.title}
                  </h3>
                  {component.description ? (
                    <div className="mt-5 rounded-[12px] border border-[#e4ebf5] bg-[#fbfcff] px-8 py-4 text-[21px] font-bold leading-[1.7] text-[#425b82]">
                      <div className="whitespace-pre-line">{component.description}</div>
                    </div>
                  ) : null}
                  <div className="mt-8">
                    <ProjectionQuestionSurface component={component} answer={answers[component.id]} />
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </article>
  );
}

function ProjectionQuestionSurface({
  component,
  answer,
  fillHeight = false,
  isGallery = false,
  galleryVariant = "grid",
}: {
  component: WorksheetComponent;
  answer?: StudentAnswerDetail;
  fillHeight?: boolean;
  isGallery?: boolean;
  galleryVariant?: "single" | "duo" | "trio" | "quad" | "grid";
}) {
  if (component.type === "drawing") {
    return (
      <div className={cn(
        "overflow-hidden rounded-[14px]",
        fillHeight ? "h-full" : "",
        isGallery ? "" : "border border-[#e4ebf5] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
      )}>
        <div className={cn(
          "flex min-h-[320px] items-center justify-center p-4",
          fillHeight ? "h-full" : "",
          isGallery ? "" : "bg-[#fbfcff]"
        )}>
          {answer?.imageUrl ? (
            <div className={cn(
              "relative w-full overflow-hidden rounded-[12px]",
              fillHeight ? "h-full min-h-[320px]" : "h-[320px]",
            )}>
              <Image src={answer.imageUrl} alt={component.title} fill className="object-contain" unoptimized />
            </div>
          ) : (
            <div className={cn("text-[18px] font-semibold", isGallery ? "text-[#94a3b8]" : "text-[#b2c0d6]")}>그림 답안 영역</div>
          )}
        </div>
      </div>
    );
  }

  if (component.type === "single_choice" || component.type === "multi_choice" || component.type === "ox") {
    const options = component.type === "ox" ? ["O", "X"] : "options" in component ? component.options : [];
    const selected = new Set(answer?.choiceValues ?? []);

    return (
      <div className="grid gap-3">
        {options.map((option, index) => {
          const isSelected = selected.has(option);
          return (
            <div
              key={option}
              className={cn(
                "flex items-center gap-4 rounded-[12px] border px-5 py-3.5 text-[24px] font-bold transition-all",
                isSelected
                  ? "border-[#10274b] bg-[#1a2b4d] text-white"
                  : isGallery
                    ? "border-[#dce4f0] bg-white/40 text-[#415980]"
                    : "border-[#dfe6f2] bg-white text-[#415980]",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-[16px]",
                  isSelected ? "bg-[#10d5c2] text-[#0a1428]" : "bg-[#f2f6fb] text-[#8093b2]",
                )}
              >
                {index + 1}
              </span>
              <span>{option}</span>
            </div>
          );
        })}
      </div>
    );
  }

  const textValue = answer?.textValue?.trim() ?? "";
  const placeholder =
    ("placeholder" in component && component.placeholder) || "여기에 답을 적어주세요...";
  const galleryTextMinHeight =
    galleryVariant === "single"
      ? "820px"
      : galleryVariant === "duo"
        ? "620px"
        : galleryVariant === "trio"
          ? "460px"
          : galleryVariant === "quad"
            ? "380px"
            : "340px";

  return (
    <div className={cn(
      "overflow-hidden",
      isGallery ? "" : "rounded-[14px] border border-[#e4ebf5] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
      fillHeight ? "h-full" : ""
    )}>
      <div
        className={cn("px-2 py-2", fillHeight ? "h-full" : "")}
        style={{
          minHeight: fillHeight
            ? isGallery
              ? galleryTextMinHeight
              : undefined
            : component.type === "short_text"
              ? "120px"
              : "240px",
          backgroundImage: "linear-gradient(transparent 43px, #cbd5e1 43px, #cbd5e1 45px)",
          backgroundSize: "100% 45px",
          lineHeight: "45px",
        }}
      >
        {textValue ? (
          <div className="whitespace-pre-line text-[28px] font-bold text-[#10274b]">
            {textValue}
          </div>
        ) : (
          <div className="text-[22px] font-medium text-[#cbd5e1]">{placeholder}</div>
        )}
      </div>
    </div>
  );
}


function ChatSidebar({
  enabled,
  messages,
  anonymous,
  highlightModeEnabled,
  paused,
  onClear,
  onClearHighlights,
  onToggleHighlightMode,
  onToggleHighlighted,
  onToggleAnonymous,
  onToggleEnabled,
  onTogglePaused,
  onClose,
}: {
  enabled: boolean;
  messages: ChatMessage[];
  anonymous: boolean;
  highlightModeEnabled: boolean;
  paused: boolean;
  onClear: () => void;
  onClearHighlights: () => void;
  onToggleHighlightMode: () => void;
  onToggleHighlighted: (id: string) => void;
  onToggleAnonymous: () => void;
  onToggleEnabled: () => void;
  onTogglePaused: () => void;
  onClose: () => void;
}) {
  const visibleMessages = useMemo(
    () => messages.filter((message) => !message.isDeleted),
    [messages],
  );
  const highlightedCount = visibleMessages.filter((message) => message.isHighlighted).length;
  const messagesScrollRef = useChatAutoScroll(visibleMessages);

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-end gap-3 px-5 py-4">
        <div className="flex items-center gap-2">
          <SidebarAction
            label="하이라이트"
            tone={highlightModeEnabled ? "default-active" : "default"}
            onClick={onToggleHighlightMode}
          />
          {highlightModeEnabled ? (
            <SidebarAction
              label={highlightedCount > 0 ? `비우기 ${highlightedCount}` : "비우기"}
              tone="default"
              onClick={onClearHighlights}
            />
          ) : null}
          <SidebarAction
            label="초기화"
            tone="default"
            onClick={() => {
              if (window.confirm("채팅을 초기화할까요?")) onClear();
            }}
          />
          <SidebarAction label="익명" tone={anonymous ? "default-active" : "default"} onClick={onToggleAnonymous} />
          <SidebarAction label="활성화" tone={enabled ? "default-active" : "default"} onClick={onToggleEnabled} />
          <button
            type="button"
            onClick={onTogglePaused}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-[10px] transition-all",
              paused
                ? "border border-[#425375] bg-[#24304b] text-white"
                : "border border-white/10 bg-[#192238] text-[#dce6f8]",
            )}
            aria-label="채팅 일시정지"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M6.5 4.5h2.5v11H6.5zM11 4.5h2.5v11H11z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#8b9bb8] transition hover:bg-gray-100 hover:text-[#1a2338]"
            aria-label="채팅창 닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {visibleMessages.length === 0 ? (
        <div className="flex flex-1 items-end justify-center pb-10 text-[18px] text-[#6e7e9d]">
          아직 메시지가 없습니다
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto px-5 pb-5 pt-2">
          <div className="space-y-0.5">
            {visibleMessages.map((message) => {
              const isTeacher = message.isTeacher || message.senderName === "교사";
              const displayName = !isTeacher && anonymous && message.isAnonymous ? "익명" : message.senderName;
              const senderColor = isTeacher ? "#4f5bff" : getStudentChatNameColor(displayName);

              return (
                <div key={message.id} className="flex items-start gap-3 text-[22px] leading-9">
                  <div className="flex shrink-0 items-center gap-1 font-black" style={{ color: senderColor }}>
                    <span>{displayName}</span>
                    {isTeacher ? <Shield className="h-4 w-4 fill-[#4f5bff] text-[#4f5bff]" /> : null}
                  </div>
                  <span className="text-[#b0bcd0]">|</span>
                  <div className="min-w-0 flex-1 break-all text-white">{message.content}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function ProjectionChatSidebar({
  enabled,
  messages,
  anonymous,
  highlightModeEnabled,
  paused,
  onClear,
  onClearHighlights,
  onToggleHighlightMode,
  onToggleHighlighted,
  onToggleAnonymous,
  onToggleEnabled,
  onTogglePaused,
  onClose,
}: {
  enabled: boolean;
  messages: ChatMessage[];
  anonymous: boolean;
  highlightModeEnabled: boolean;
  paused: boolean;
  onClear: () => void;
  onClearHighlights: () => void;
  onToggleHighlightMode: () => void;
  onToggleHighlighted: (id: string) => void;
  onToggleAnonymous: () => void;
  onToggleEnabled: () => void;
  onTogglePaused: () => void;
  onClose: () => void;
}) {
  const visibleMessages = useMemo(
    () => messages.filter((message) => !message.isDeleted),
    [messages],
  );
  const highlightedCount = visibleMessages.filter((message) => message.isHighlighted).length;
  const messagesScrollRef = useChatAutoScroll(visibleMessages);

  const pickOrderMap = useMemo(() => {
    const picked = visibleMessages
      .filter((m) => m.isHighlighted)
      .sort((a, b) => {
        const at = a.highlightedAt ? new Date(a.highlightedAt).getTime() : 0;
        const bt = b.highlightedAt ? new Date(b.highlightedAt).getTime() : 0;
        return at - bt;
      });
    const map: Record<string, number> = {};
    picked.forEach((m, i) => { map[m.id] = i + 1; });
    return map;
  }, [visibleMessages]);

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-end gap-3 px-3 py-4">
        <div className="flex items-center gap-2">
          <SidebarAction
            label="하이라이트"
            tone={highlightModeEnabled ? "default-active" : "default"}
            onClick={onToggleHighlightMode}
          />
          {highlightModeEnabled ? (
            <SidebarAction
              label={highlightedCount > 0 ? `비우기 ${highlightedCount}` : "비우기"}
              tone="default"
              onClick={onClearHighlights}
            />
          ) : null}
          <SidebarAction
            label="초기화"
            tone="default"
            onClick={() => {
              if (window.confirm("채팅을 초기화할까요?")) onClear();
            }}
          />
          <SidebarAction label="익명" tone={anonymous ? "default-active" : "default"} onClick={onToggleAnonymous} />
          <SidebarAction label="활성화" tone={enabled ? "default-active" : "default"} onClick={onToggleEnabled} />
          <button
            type="button"
            onClick={onTogglePaused}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-[10px] transition-all",
              paused
                ? "border border-[#425375] bg-[#24304b] text-white"
                : "border border-white/10 bg-[#192238] text-[#dce6f8]",
            )}
            aria-label="채팅 일시정지"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M6.5 4.5h2.5v11H6.5zM11 4.5h2.5v11H11z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#8b9bb8] transition hover:bg-gray-100 hover:text-[#1a2338]"
            aria-label="채팅창 닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {visibleMessages.length === 0 ? (
        <div className="flex flex-1 items-end justify-center pb-10 text-[18px] text-[#6e7e9d]">
          아직 메시지가 없습니다
        </div>
      ) : (
        <div ref={messagesScrollRef} className="min-h-0 flex-1 overflow-auto pr-3 pl-1 pb-4 pt-1">
          <div className="space-y-0.5">
            {visibleMessages.map((message) => {
              const isTeacher = message.isTeacher || message.senderName === "교사";
              const displayName = !isTeacher && anonymous && message.isAnonymous ? "익명" : message.senderName;
              const isHighlightable = highlightModeEnabled && !isTeacher;
              const isSelected = Boolean(message.isHighlighted);
              const senderColor = isTeacher ? "#8f97ff" : getStudentChatNameColor(displayName);
              const pickNum = isSelected ? pickOrderMap[message.id] : undefined;

              return (
                <button
                  key={message.id}
                  type="button"
                  onClick={() => {
                    if (!isHighlightable) return;
                    onToggleHighlighted(message.id);
                  }}
                  className={cn(
                    "w-full rounded-[16px] border text-left transition-all duration-150",
                    isHighlightable ? "cursor-pointer" : "cursor-default",
                    isSelected
                      ? "border-[#2ecec4]/30 bg-gradient-to-r from-[#0b1e31] to-[#091628] px-3 py-2 shadow-[0_1px_0_rgba(255,255,255,0.03),inset_0_0_0_1px_rgba(46,206,196,0.07)]"
                      : "border-transparent px-3 py-1.5 hover:border-white/8 hover:bg-white/[0.03]",
                  )}
                >
                  <div className="flex items-center gap-2.5 text-[21px] leading-8">
                    {pickNum !== undefined ? (
                      <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[#0f3040] text-[11px] font-black tabular-nums text-[#4de8dc]">
                        {pickNum}
                      </span>
                    ) : null}
                    <div className="flex shrink-0 items-center gap-1 font-black" style={{ color: senderColor }}>
                      <span>{displayName}</span>
                      {isTeacher ? <Shield className="h-4 w-4 fill-[#60a5fa] text-[#60a5fa]" /> : null}
                    </div>
                    <span className="text-[#4a5e7a]">|</span>
                    <div className={cn("min-w-0 flex-1 break-all font-semibold", isSelected ? "text-[#e8f4ff]" : "text-[#c8d8f0]")}>
                      {message.content}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

const MemoizedProjectionChatSidebar = memo(ProjectionChatSidebar);

function TimerSidebar({
  seconds,
  running,
  timerInput,
  onTimerInputChange,
  onToggleTimer,
  onResetTimer,
  compact,
  onClose,
}: {
  seconds: number;
  running: boolean;
  timerInput: string;
  onTimerInputChange: (value: string) => void;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  compact: boolean;
  onClose: () => void;
}) {
  const timerText = formatCountdown(seconds);
  const canStart = running || inputToSeconds(timerInput) > 0;

  return (
    <section className={cn("px-4 pb-4", compact ? "" : "flex-1 py-4")}>
      <div className={cn(PANEL_SURFACE, "overflow-hidden")}>
        <div className="border-b border-white/8 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-base font-bold text-white">타이머</span>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleTimer}
                disabled={!canStart}
                className={cn(
                  "h-11 shrink-0 rounded-xl px-5 text-sm font-bold transition-all active:scale-95 disabled:opacity-30",
                  running
                    ? "bg-teal-500 text-white shadow-lg shadow-teal-500/20 hover:bg-teal-600"
                    : "bg-slate-950 text-white shadow-lg shadow-slate-950/20 hover:bg-slate-800",
                )}
              >
                {running ? "일시정지" : "시작"}
              </button>
              <button
                type="button"
                onClick={onResetTimer}
                className="h-11 shrink-0 rounded-xl bg-white/10 px-4 text-sm font-bold text-white transition-all hover:bg-white/15"
              >
                초기화
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-2.5 text-[#8b9bb8] transition hover:bg-white/10 hover:text-white"
                aria-label="타이머 닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-[188px_minmax(0,1fr)] gap-3">
            <div className="grid grid-cols-2 gap-2">
              {timerPresetOptions.map((preset) => {
                const presetActive = !running && inputToSeconds(timerInput) === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => onTimerInputChange(formatCountdown(preset.value))}
                    disabled={running}
                    className={cn(
                      "h-11 rounded-xl border text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-40",
                      presetActive
                        ? "border-white bg-white text-slate-950 shadow-md"
                        : "border-white/10 bg-white/5 text-white hover:bg-white/10",
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
            <input
              value={running ? timerText : timerInput}
              onChange={(event) => {
                if (!running) onTimerInputChange(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !running && inputToSeconds(timerInput) > 0) {
                  event.preventDefault();
                  onToggleTimer();
                }
              }}
              readOnly={running}
              placeholder="05:00"
              className="h-full min-h-[96px] w-full rounded-2xl border border-teal-400/20 bg-white px-0 text-center text-[2.35rem] font-mono font-black tracking-tight text-slate-950 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-400/40"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

const MemoizedTimerSidebar = memo(TimerSidebar);

function VoteSidebar({
  activeVote,
  voteSummary,
  compact,
  onClose,
}: {
  activeVote: ReturnType<typeof useClassroomStore.getState>["activeVote"];
  voteSummary: ReturnType<typeof useClassroomStore.getState>["voteSummary"];
  compact: boolean;
  onClose: () => void;
}) {
  const hasResults = Boolean(activeVote && voteSummary.results.length > 0);

  return (
    <section className={cn("px-4 pb-4", compact ? "" : "flex-1 py-4")}>
      <div className={cn(PANEL_SURFACE, "overflow-hidden")}>
        <header className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <div className="flex items-center gap-2 text-[14px] font-black uppercase tracking-[0.16em] text-white">
            <BarChart3 className="h-4 w-4" />
            <span>Live Vote</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#8b9bb8] transition hover:bg-gray-100 hover:text-[#1a2338]"
            aria-label="투표 닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {!activeVote ? (
          <div className="flex items-center justify-center px-6 py-10 text-center text-[18px] font-semibold text-[#66789b]">
            진행 중인 투표가 없습니다
          </div>
        ) : (
          <div className="space-y-4 px-6 py-6">
            <div className="text-[20px] font-black text-white">{voteSummary.question}</div>
            {!hasResults || !(voteSummary.isResultPublic ?? true) ? (
              <div className="rounded-[14px] border border-white/8 bg-white/[0.03] px-4 py-8 text-center text-[16px] font-semibold text-[#7c8dae]">
                결과를 기다리는 중입니다
              </div>
            ) : voteSummary.type === "wordcloud" ? (
              <div className="flex flex-wrap gap-2 rounded-[14px] border border-white/8 bg-white/[0.03] p-4">
                {voteSummary.results
                  .filter((result) => result.value > 0)
                  .sort((left, right) => right.value - left.value)
                  .map((result) => (
                    <span key={result.label} className="font-black text-[#59f0dd]">
                      {result.label}
                    </span>
                  ))}
              </div>
            ) : (
              <div className="space-y-3">
                {voteSummary.results.map((result) => {
                  const percentage =
                    voteSummary.responseCount > 0 ? Math.round((result.value / voteSummary.responseCount) * 100) : 0;

                  return (
                    <div key={result.label}>
                      <div className="mb-1 flex items-center justify-between text-[15px] text-white">
                        <span>{result.label}</span>
                        <span className="font-bold text-[#a9b7cf]">
                          {result.value}명 ({percentage}%)
                        </span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-white/8">
                        <div className="h-3 rounded-full bg-[#10d5c2]" style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

const MemoizedVoteSidebar = memo(VoteSidebar);

function SidebarAction({
  label,
  tone,
  onClick,
}: {
  label: string;
  tone: "danger" | "warning" | "default" | "default-active";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center justify-center whitespace-nowrap rounded-[10px] px-3 leading-none text-[14px] font-black transition-all",
        tone === "danger" && "border border-[#533247] bg-[#20172a] text-[#ff5e84]",
        tone === "warning" && "border border-[#5a4420] bg-[#2b2312] text-[#ffd278]",
        tone === "default" && "border border-white/10 bg-[#192238] text-[#dce6f8]",
        tone === "default-active" && "border border-[#2af1d3] bg-[#24304b] text-white shadow-[0_0_0_1px_rgba(42,241,211,0.25),0_0_18px_rgba(42,241,211,0.22)]",
      )}
    >
      {tone === "warning" && label === "재개" ? (
        <span className="inline-flex items-center gap-1">
          <Play className="h-3 w-3 fill-current" />
          {label}
        </span>
      ) : (
        label
      )}
    </button>
  );
}

function ProjectionGalleryCard({
  card,
  component,
  expanded = false,
  variant = "grid",
  hideQuestion = false,
}: {
  card: GalleryCard;
  component?: WorksheetComponent;
  expanded?: boolean;
  variant?: "single" | "duo" | "trio" | "quad" | "grid";
  hideQuestion?: boolean;
}) {
  const derivedAnswer = buildGalleryAnswerDetail(card, component);

  const shellClassName =
    variant === "single"
      ? "p-12"
      : variant === "duo"
        ? "p-10"
        : variant === "trio"
          ? "p-8"
          : variant === "quad"
            ? "p-6"
            : "p-6";

  const studentNameClassName =
    variant === "single"
      ? "text-[32px]"
      : variant === "duo"
        ? "text-[26px]"
        : variant === "trio"
          ? "text-[22px]"
          : "text-[20px]";

  const questionTitleClassName =
    variant === "single"
      ? "text-[38px]"
      : variant === "duo"
        ? "text-[32px]"
        : variant === "trio"
          ? "text-[26px]"
          : "text-[22px]";

  const fallbackTextClassName =
    variant === "single"
      ? "text-[42px] leading-[1.65]"
      : variant === "duo"
        ? "text-[34px] leading-[1.6]"
        : variant === "trio"
          ? "text-[28px] leading-[1.55]"
          : "text-[22px] leading-[1.45]";

  const drawingCardHeightClassName =
    component?.type === "drawing"
      ? variant === "single"
        ? "min-h-[900px]"
        : variant === "duo"
          ? "min-h-[700px]"
          : variant === "trio"
            ? "min-h-[520px]"
            : variant === "quad"
              ? "min-h-[460px]"
              : "min-h-[420px]"
      : "";
  const textCardHeightClassName =
    component && component.type !== "drawing" && component.type !== "single_choice" && component.type !== "multi_choice" && component.type !== "ox"
      ? variant === "single"
        ? "min-h-[980px]"
        : variant === "duo"
          ? "min-h-[760px]"
          : variant === "trio"
            ? "min-h-[560px]"
            : variant === "quad"
              ? "min-h-[480px]"
              : "min-h-[420px]"
      : "";

  return (
    <article
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-[16px] border border-[#dce4f0] bg-[#fdfcf8] shadow-[0_12px_30px_rgba(0,0,0,0.1)]",
        shellClassName,
        drawingCardHeightClassName,
        textCardHeightClassName,
        expanded ? "p-12" : undefined,
      )}
    >
      {/* Notebook red margin lines */}
      <div className="pointer-events-none absolute bottom-0 left-[28px] top-0 w-[1.5px] bg-[#f6c7d2] opacity-60" />
      <div className="pointer-events-none absolute bottom-0 left-[34px] top-0 w-[1.5px] bg-[#f9d7de] opacity-60" />

      <div className="relative z-10 flex flex-col h-full pl-6">
        <header className="mb-4">
          <div className={cn("font-black tracking-tight text-[#10274b]", studentNameClassName)}>
            {card.displayName}
          </div>
        </header>

        {!hideQuestion && component ? (
          <div className="mb-5">
            <div className={cn("font-black leading-tight text-[#10274b]", questionTitleClassName)}>
              {component.title}
            </div>
            {component.description ? (
              <div className="mt-3 text-[17px] font-bold leading-[1.6] text-[#64748b]">
                {component.description}
              </div>
            ) : null}
          </div>
        ) : null}

        {component ? (
          <div className="min-w-0 flex-1">
            <ProjectionQuestionSurface
              component={component}
              answer={derivedAnswer}
              fillHeight
              isGallery={true}
              galleryVariant={variant}
            />
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            {card.imageUrl ? (
              <div className="relative h-full w-full overflow-hidden rounded-[12px] bg-white/50 border border-[#e2e8f0]">
                <Image src={card.imageUrl} alt={card.displayName} fill className="object-contain" unoptimized />
              </div>
            ) : (
              <div
                className={cn(
                  "whitespace-pre-line font-bold text-[#10274b]",
                  fallbackTextClassName,
                )}
                style={{
                  backgroundImage: "linear-gradient(transparent 43px, #cbd5e1 43px, #cbd5e1 45px)",
                  backgroundSize: "100% 45px",
                  lineHeight: "45px",
                }}
              >
                {card.excerpt}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
