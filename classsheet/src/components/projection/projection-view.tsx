"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
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
import { cn } from "@/lib/utils";

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

function fontSize<K extends keyof typeof FONT_SCALE>(kind: K, mode?: FontSizeMode) {
  return FONT_SCALE[kind][mode ?? "md"];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function isAnswerable(component: WorksheetComponent) {
  return component.type !== "prompt" && component.type !== "divider";
}

function countVisibleMessages(messages: ChatMessage[]) {
  return messages.filter((message) => !message.isDeleted).length;
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
  const toggleChatPaused = useClassroomStore((state) => state.toggleChatPaused);
  const toggleChatHighlightMode = useClassroomStore((state) => state.toggleChatHighlightMode);
  const toggleChatHighlighted = useClassroomStore((state) => state.toggleChatHighlighted);
  const clearChatHighlights = useClassroomStore((state) => state.clearChatHighlights);
  const clearChat = useClassroomStore((state) => state.clearChat);
  const toggleShowChat = useClassroomStore((state) => state.toggleShowChat);
  const toggleShowTimer = useClassroomStore((state) => state.toggleShowTimer);
  const toggleShowVote = useClassroomStore((state) => state.toggleShowVote);

  const [zoomPercent, setZoomPercent] = useState(100);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
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

  const highlightedMessages = useMemo(
    () =>
      chatMessages
        .filter((message) => !message.isDeleted && !message.isTeacher && message.isHighlighted)
        .sort((left, right) => {
          const leftTime = left.highlightedAt ? new Date(left.highlightedAt).getTime() : 0;
          const rightTime = right.highlightedAt ? new Date(right.highlightedAt).getTime() : 0;
          return leftTime - rightTime;
        }),
    [chatMessages],
  );

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
              icon={<span className="text-[15px] leading-none">◐</span>}
              label={focusMode ? "집중 해제" : "집중 모드"}
              active={focusMode}
              activeClassName="border-[#335075] bg-[#1d2a42] text-white"
              onClick={toggleFocusMode}
            />
            <TopBarButton
              icon={isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              label={isLocked ? "잠금 해제" : "쓰기 잠금"}
              active={isLocked}
              activeClassName="border-[#7b5a26] bg-[#5d4317] text-[#ffe3aa]"
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
            {chatHighlightModeEnabled ? (
              <ProjectionHighlightCanvas
                messages={highlightedMessages}
                anonymous={chatAnonymousMode}
                questionTitle={currentPageData.components.find(isAnswerable)?.title ?? null}
              />
            ) : (
              <ProjectionCanvas
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
            <section className="absolute right-8 top-1/2 flex -translate-y-1/2 flex-col items-center gap-7">
              <VerticalActionButton label="TOP" compact onClick={jumpToTop} />

              <div className="flex flex-col gap-2 rounded-[20px] bg-[#4c5668]/70 p-2 shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                {answerableSections.map((component, index) => (
                  <VerticalActionButton
                    key={component.id}
                    label={`${index + 1}`}
                    active={activeSectionId === component.id}
                    onClick={() => jumpToSection(component.id)}
                  />
                ))}
              </div>

              <div className="flex flex-col gap-2 rounded-[20px] bg-[#4c5668]/70 p-2 shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                <VerticalActionButton label="+" onClick={() => changeZoom(25)} />
                <div className="flex h-12 w-14 items-center justify-center rounded-[14px] bg-[#1a2338] text-center text-[13px] font-black text-[#10e7d3]">
                  {zoomPercent}%
                </div>
                <VerticalActionButton label="-" onClick={() => changeZoom(-25)} />
                <VerticalActionButton label="RESET" compact onClick={resetView} />
              </div>
            </section>
          ) : null}
        </main>

        {hasSidebar ? (
          <aside className="flex w-[560px] shrink-0 flex-col border-l border-white/8 bg-[#1e2b45]">
            {showChat ? (
              <ProjectionChatSidebar
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
                onTogglePaused={toggleChatPaused}
                onClose={handleToggleChatVisibility}
              />
            ) : null}
            {showTimer ? (
              <TimerSidebar
                seconds={timerSecondsRemaining}
                running={timerRunning}
                compact={showChat || showVote}
                onClose={toggleShowTimer}
              />
            ) : null}
            {showVote ? (
              <VoteSidebar
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

    // All cards in a gallery-grid share the same question — show it once at the top
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

function ProjectionHighlightCanvas({
  messages,
  anonymous,
  questionTitle,
}: {
  messages: ChatMessage[];
  anonymous: boolean;
  questionTitle: string | null;
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
            채팅에서 좋은 학생 답변을 클릭해
            {"\n"}
            이 공간에 모아보세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full px-6 py-6">
      <div className="rounded-[32px] border border-white/8 bg-[radial-gradient(circle_at_top,#1e2f58_0%,#121a2f_55%,#0b1121_100%)] p-8 shadow-[0_28px_80px_rgba(0,0,0,0.34)]">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[15px] font-black uppercase tracking-[0.2em] text-[#6ee7db]">
              <Sparkles className="h-4 w-4" />
              <span>Highlight</span>
            </div>
            <div className="mt-3 text-[34px] font-black tracking-tight text-white">좋은 답변 하이라이트</div>
            {questionTitle ? (
              <div className="mt-2 text-[18px] font-semibold text-[#95a6c6]">{questionTitle}</div>
            ) : null}
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[15px] font-bold text-[#d8e4fa]">
            {messages.length}개 답변 선택됨
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
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function HighlightAnswerCard({
  message,
  anonymous,
  index,
  total,
}: {
  message: ChatMessage;
  anonymous: boolean;
  index: number;
  total: number;
}) {
  const displayName = anonymous && message.isAnonymous ? "익명" : message.senderName;
  const rotation = [-2.2, 1.6, -1.3, 2.4, -1.7, 1.2][index % 6];
  const verticalShift = [0, 14, -10, 18, -6, 10][index % 6];
  const width =
    total <= 1
      ? "min(920px, 84%)"
      : total === 2
        ? "min(620px, 44%)"
        : total <= 4
          ? "min(540px, 40%)"
          : "min(460px, 30%)";
  const contentSizeClass =
    total <= 2 ? "text-[32px] leading-[1.5]" : total <= 4 ? "text-[28px] leading-[1.55]" : "text-[24px] leading-[1.55]";
  const nameSizeClass = total <= 2 ? "text-[18px]" : "text-[16px]";
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
      <div className="pointer-events-none absolute left-6 top-6 text-[72px] font-black leading-none text-[#d8e6f7]/70">“</div>
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
}: {
  component: WorksheetComponent;
  answer?: StudentAnswerDetail;
  fillHeight?: boolean;
  isGallery?: boolean;
}) {
  if (component.type === "drawing") {
    return (
      <div className={cn(
        "overflow-hidden rounded-[14px]",
        isGallery ? "" : "border border-[#e4ebf5] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
      )}>
        <div className={cn(
          "flex min-h-[320px] items-center justify-center p-4",
          isGallery ? "" : "bg-[#fbfcff]"
        )}>
          {answer?.imageUrl ? (
            <div className="relative h-[320px] w-full overflow-hidden rounded-[12px]">
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

  return (
    <div className={cn(
      "overflow-hidden",
      isGallery ? "" : "rounded-[14px] border border-[#e4ebf5] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
      fillHeight ? "h-full" : ""
    )}>
      <div
        className={cn("px-2 py-2", fillHeight ? "h-full" : "")}
        style={{
          minHeight: fillHeight ? undefined : component.type === "short_text" ? "120px" : "240px",
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
  onTogglePaused: () => void;
  onClose: () => void;
}) {
  const visibleMessages = messages.filter((message) => !message.isDeleted);
  const highlightedCount = visibleMessages.filter((message) => message.isHighlighted).length;

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
          <SidebarAction label="초기화" tone="danger" onClick={onClear} />
          <SidebarAction label="익명" tone={anonymous ? "default-active" : "default"} onClick={onToggleAnonymous} />
          <SidebarAction label={paused ? "재개" : "정지"} tone="warning" onClick={onTogglePaused} />
          <SidebarAction label="초기화" tone="danger" onClick={onClear} />
          <SidebarAction label="익명" tone={anonymous ? "default-active" : "default"} onClick={onToggleAnonymous} />
          <SidebarAction label={paused ? "재개" : "정지"} tone="warning" onClick={onTogglePaused} />
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#8b9bb8] transition hover:bg-white/5 hover:text-white"
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

              return (
                <div key={message.id} className="flex items-start gap-3 text-[22px] leading-9">
                  <div className={cn("flex shrink-0 items-center gap-1 font-black", isTeacher ? "text-[#8f97ff]" : "text-[#ff9a24]")}>
                    <span>{displayName}</span>
                    {isTeacher ? <Shield className="h-4 w-4 fill-[#60a5fa] text-[#60a5fa]" /> : null}
                  </div>
                  <span className="text-[#4d5d7b]">|</span>
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
  onTogglePaused: () => void;
  onClose: () => void;
}) {
  const visibleMessages = messages.filter((message) => !message.isDeleted);
  const highlightedCount = visibleMessages.filter((message) => message.isHighlighted).length;

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-white/35" />
        </div>

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
          <SidebarAction label="초기화" tone="danger" onClick={onClear} />
          <SidebarAction label="익명" tone={anonymous ? "default-active" : "default"} onClick={onToggleAnonymous} />
          <SidebarAction label={paused ? "재개" : "정지"} tone="warning" onClick={onTogglePaused} />
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#8b9bb8] transition hover:bg-white/5 hover:text-white"
            aria-label="채팅창 닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {!enabled ? (
        <div className="flex flex-1 items-center justify-center px-6 text-center text-[18px] font-semibold text-[#7f90af]">
          채팅이 현재 비활성화되어 있습니다.
        </div>
      ) : visibleMessages.length === 0 ? (
        <div className="flex flex-1 items-end justify-center pb-10 text-[18px] text-[#6e7e9d]">
          아직 메시지가 없습니다
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto px-5 pb-5 pt-2">
          <div className="space-y-0.5">
            {visibleMessages.map((message) => {
              const isTeacher = message.isTeacher || message.senderName === "교사";
              const displayName = !isTeacher && anonymous && message.isAnonymous ? "익명" : message.senderName;
              const isHighlightable = highlightModeEnabled && !isTeacher;
              const isSelected = Boolean(message.isHighlighted);

              return (
                <button
                  key={message.id}
                  type="button"
                  disabled={!isHighlightable}
                  onClick={() => onToggleHighlighted(message.id)}
                  className={cn(
                    "w-full rounded-[18px] border border-transparent px-3 py-2 text-left transition-all",
                    isHighlightable ? "cursor-pointer hover:border-white/10 hover:bg-white/[0.04]" : "cursor-default",
                    isSelected ? "border-[#6be8dc]/40 bg-[#12263b] shadow-[0_0_0_1px_rgba(107,232,220,0.15)]" : "",
                  )}
                >
                  <div className="flex items-start gap-3 text-[22px] leading-9">
                    <div className={cn("flex shrink-0 items-center gap-1 font-black", isTeacher ? "text-[#8f97ff]" : "text-[#ff9a24]")}>
                      <span>{displayName}</span>
                      {isTeacher ? <Shield className="h-4 w-4 fill-[#60a5fa] text-[#60a5fa]" /> : null}
                    </div>
                    <span className="text-[#4d5d7b]">|</span>
                    <div className="min-w-0 flex-1 break-all text-white">{message.content}</div>
                    {isSelected ? (
                      <span className="shrink-0 rounded-full bg-[#0d3a3c] px-2 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#7af1e2]">
                        Pick
                      </span>
                    ) : null}
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

function TimerSidebar({
  seconds,
  running,
  compact,
  onClose,
}: {
  seconds: number;
  running: boolean;
  compact: boolean;
  onClose: () => void;
}) {
  const timerText = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <section className={cn("px-4 pb-4", compact ? "" : "flex-1 py-4")}>
      <div className={cn(PANEL_SURFACE, "overflow-hidden")}>
        <header className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <div className="flex items-center gap-2 text-[14px] font-black uppercase tracking-[0.16em] text-white">
            <Timer className="h-4 w-4" />
            <span>Timer</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#8b9bb8] transition hover:bg-white/5 hover:text-white"
            aria-label="타이머 닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex flex-col items-center justify-center gap-4 px-6 py-8 text-center">
          <div className="text-[64px] font-black leading-none tabular-nums text-white">{timerText}</div>
          {!running || seconds === 0 ? (
            <div className="rounded-full bg-[#6b3f14] px-5 py-2 text-[15px] font-black text-[#ff9d1a]">시간 종료</div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

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
            className="rounded-full p-2 text-[#8b9bb8] transition hover:bg-white/5 hover:text-white"
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
        tone === "default-active" && "border border-[#425375] bg-[#24304b] text-white",
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

  return (
    <article
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-[16px] border border-[#dce4f0] bg-[#fdfcf8] shadow-[0_12px_30px_rgba(0,0,0,0.1)]",
        shellClassName,
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
