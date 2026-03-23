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
  const clearChat = useClassroomStore((state) => state.clearChat);
  const toggleShowChat = useClassroomStore((state) => state.toggleShowChat);
  const toggleShowTimer = useClassroomStore((state) => state.toggleShowTimer);
  const toggleShowVote = useClassroomStore((state) => state.toggleShowVote);

  const [zoomPercent, setZoomPercent] = useState(100);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
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

  const studentAnswers = useMemo(() => {
    if (!activeStudent?.answers) return {};
    return Object.fromEntries(activeStudent.answers.map((answer) => [answer.componentId, answer])) as Record<
      string,
      StudentAnswerDetail
    >;
  }, [activeStudent]);

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
              onClick={toggleShowChat}
            />
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="relative min-w-0 flex-1">
          <div ref={scrollRef} className="h-full overflow-auto pl-0 pr-1 py-0">
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
          </div>

          {(projectionMode === "worksheet" || projectionMode === "student") && answerableSections.length > 0 ? (
            <section className="absolute right-3 top-1/2 flex -translate-y-1/2 flex-col items-center gap-7">
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
          <aside className="flex w-[430px] shrink-0 flex-col border-l border-white/8 bg-[#141c31]">
            {showChat ? (
              <ChatSidebar
                enabled={chatEnabled}
                messages={chatMessages}
                paused={chatPaused}
                anonymous={chatAnonymousMode}
                onClear={clearChat}
                onToggleAnonymous={toggleChatAnonymousMode}
                onTogglePaused={toggleChatPaused}
                onClose={toggleShowChat}
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

    return (
      <div className="flex h-full items-start justify-center px-0 py-1">
        <div className={cn("grid w-full gap-3", galleryGridClassName(cardCount))}>
          {galleryCards.map((card) => (
            <ProjectionGalleryCard key={card.id} card={card} variant={variant} />
          ))}
        </div>
      </div>
    );
  }

  if (mode === "gallery" && galleryCard) {
    return (
      <div className="flex h-full items-center justify-center px-0 py-1">
        <div className="w-full">
          <ProjectionGalleryCard card={galleryCard} expanded variant="single" />
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
}: {
  component: WorksheetComponent;
  answer?: StudentAnswerDetail;
}) {
  if (component.type === "drawing") {
    return (
      <div className="overflow-hidden rounded-[14px] border border-[#e4ebf5] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
        <div className="flex min-h-[320px] items-center justify-center bg-[#fbfcff] px-8 py-8">
          {answer?.imageUrl ? (
            <div className="relative h-[320px] w-full overflow-hidden rounded-[12px]">
              <Image src={answer.imageUrl} alt={component.title} fill className="object-contain" unoptimized />
            </div>
          ) : (
            <div className="text-[18px] font-semibold text-[#b2c0d6]">그림 답안 영역</div>
          )}
        </div>
      </div>
    );
  }

  if (component.type === "single_choice" || component.type === "multi_choice" || component.type === "ox") {
    const options = component.type === "ox" ? ["O", "X"] : "options" in component ? component.options : [];
    const selected = new Set(answer?.choiceValues ?? []);

    return (
      <div className="grid gap-4">
        {options.map((option, index) => {
          const isSelected = selected.has(option);
          return (
            <div
              key={option}
              className={cn(
                "flex items-center gap-5 rounded-[14px] border px-6 py-5 text-[24px] font-bold",
                isSelected ? "border-[#0f6170] bg-[#ebfffb] text-[#12355d]" : "border-[#dfe6f2] bg-white text-[#415980]",
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full text-[18px]",
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

  const lineCount = component.type === "long_text" ? 6 : 4;
  const textValue = answer?.textValue?.trim() ?? "";

  return (
    <div className="overflow-hidden rounded-[14px] border border-[#e4ebf5] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
      <div
        className="px-8 py-4"
        style={{
          minHeight: `${lineCount * 78}px`,
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0, transparent 56px, #dde6f3 56px, #dde6f3 59px)",
        }}
      >
        {textValue ? (
          <div className="whitespace-pre-line pt-1 text-[26px] font-bold leading-[59px] text-[#10274b]">{textValue}</div>
        ) : (
          <div className="pt-1 text-[24px] font-semibold leading-[59px] text-transparent">.</div>
        )}
      </div>
    </div>
  );
}

function ChatSidebar({
  enabled,
  messages,
  paused,
  anonymous,
  onClear,
  onToggleAnonymous,
  onTogglePaused,
  onClose,
}: {
  enabled: boolean;
  messages: ChatMessage[];
  paused: boolean;
  anonymous: boolean;
  onClear: () => void;
  onToggleAnonymous: () => void;
  onTogglePaused: () => void;
  onClose: () => void;
}) {
  const visibleMessages = messages.filter((message) => !message.isDeleted);

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-2 text-[17px] font-black uppercase tracking-[0.16em] text-[#9aa7c3]">
          <span className="h-2 w-2 rounded-full bg-white/35" />
          <span>Chat</span>
          <span className="text-[#6f7f9f]">{countVisibleMessages(messages)}</span>
        </div>

        <div className="flex items-center gap-2">
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
          <div className="space-y-2">
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
      {tone === "warning" ? (
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
  expanded = false,
  variant = "grid",
}: {
  card: GalleryCard;
  expanded?: boolean;
  variant?: "single" | "duo" | "trio" | "quad" | "grid";
}) {
  const shellClassName =
    variant === "single"
      ? "min-h-[calc(100vh-84px)] p-10"
      : variant === "duo"
        ? "min-h-[calc(100vh-92px)] p-8"
        : variant === "trio"
          ? "min-h-[calc(100vh-96px)] p-7"
          : variant === "quad"
            ? "min-h-[calc(50vh-52px)] p-6"
            : "min-h-[calc(33vh-44px)] p-5";
  const titleClassName =
    variant === "single"
      ? "text-[32px] tracking-[0.08em]"
      : variant === "duo"
        ? "text-[26px] tracking-[0.08em]"
        : variant === "trio"
          ? "text-[22px] tracking-[0.07em]"
          : "text-[18px] tracking-[0.06em]";
  const textShellClassName =
    variant === "single"
      ? "min-h-[calc(100vh-220px)] rounded-[22px] px-8 py-8 text-[42px] leading-[1.65]"
      : variant === "duo"
        ? "min-h-[calc(100vh-210px)] rounded-[20px] px-7 py-7 text-[34px] leading-[1.6]"
        : variant === "trio"
          ? "min-h-[calc(100vh-240px)] rounded-[18px] px-6 py-6 text-[26px] leading-[1.55]"
          : variant === "quad"
            ? "min-h-[calc(50vh-120px)] rounded-[18px] px-5 py-5 text-[21px] leading-[1.5]"
            : "min-h-[220px] rounded-[16px] px-4 py-4 text-[18px] leading-[1.45]";
  const imageHeightClassName =
    variant === "single"
      ? "h-[calc(100vh-240px)]"
      : variant === "duo"
        ? "h-[calc(100vh-240px)]"
        : variant === "trio"
          ? "h-[calc(100vh-280px)]"
          : variant === "quad"
            ? "h-[calc(50vh-130px)]"
            : "h-[220px]";
  const answerFrameClassName =
    variant === "single"
      ? "rounded-[24px] px-7 py-7"
      : variant === "duo"
        ? "rounded-[20px] px-6 py-6"
        : variant === "trio"
          ? "rounded-[18px] px-5 py-5"
          : "rounded-[16px] px-4 py-4";
  const questionTitleClassName =
    variant === "single"
      ? "text-[34px]"
      : variant === "duo"
        ? "text-[28px]"
        : variant === "trio"
          ? "text-[24px]"
          : "text-[20px]";
  const answerTextClassName =
    variant === "single"
      ? "pt-1 text-[34px] leading-[62px]"
      : variant === "duo"
        ? "pt-1 text-[28px] leading-[54px]"
        : variant === "trio"
          ? "pt-1 text-[23px] leading-[46px]"
          : "pt-1 text-[19px] leading-[38px]";
  const lineHeightPx =
    variant === "single" ? 62 : variant === "duo" ? 54 : variant === "trio" ? 46 : 38;
  const textMinHeight =
    variant === "single"
      ? "min-h-[360px]"
      : variant === "duo"
        ? "min-h-[300px]"
        : variant === "trio"
          ? "min-h-[250px]"
          : "min-h-[210px]";

  return (
    <article
      className={cn(
        "rounded-[24px] border border-white/10 bg-[#11192d] shadow-[0_16px_40px_rgba(0,0,0,0.24)]",
        shellClassName,
        expanded ? "p-10" : undefined,
      )}
    >
      <div className={cn("mb-3 font-black uppercase text-[#8ca0c4]", titleClassName)}>
        {card.displayName}
      </div>
      {card.questionTitle ? (
        <div className="mb-4">
          <div className={cn("font-black leading-tight text-[#f4f8ff]", questionTitleClassName)}>
            {card.questionTitle}
          </div>
        </div>
      ) : null}
      {card.imageUrl ? (
        <div
          className={cn(
            "overflow-hidden border border-[#e4ebf5] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
            answerFrameClassName,
          )}
        >
          <div
            className={cn(
              "relative overflow-hidden rounded-[14px] border border-[#dce6f3] bg-[#fbfcff]",
              imageHeightClassName,
            )}
          >
            <Image src={card.imageUrl} alt={card.displayName} fill className="object-contain" unoptimized />
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "overflow-hidden border border-[#e4ebf5] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
            answerFrameClassName,
          )}
        >
          <div
            className={cn("bg-white text-[#10274b]", textMinHeight)}
            style={{
              backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${lineHeightPx - 3}px, #dde6f3 ${lineHeightPx - 3}px, #dde6f3 ${lineHeightPx}px)`,
            }}
          >
            <div className={cn("whitespace-pre-line font-bold", answerTextClassName)}>
              {card.excerpt}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
