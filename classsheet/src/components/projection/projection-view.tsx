"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Minimize2, 
  MessageSquare, 
  Timer, 
  BarChart3, 
  RefreshCcw,
  ZoomIn,
  ZoomOut,
  MousePointer2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  User,
  Users,
  Grid,
  Map as MapIcon,
  Heart,
  ThumbsUp,
  Smile,
  Zap,
} from "lucide-react";

import { useClassroomStore } from "@/lib/store/classroom-store";
import { cn } from "@/lib/utils";
import { ProjectionVoteDisplay } from "./projection-vote-display";

interface ComponentPage {
  pageNumber: number;
  components: any[];
}

export default function ProjectionView({
  worksheetId,
  initialType,
  initialTargetId,
  initialWorksheetData
}: {
  worksheetId: string;
  initialType?: string | null;
  initialTargetId?: string | null;
  initialWorksheetData?: any;
}) {
  const activeType = useClassroomStore((s) => s.projectedType);
  const activeTargetId = useClassroomStore((s) => s.projectedTargetId);
  const students = useClassroomStore((s) => s.students);
  const galleryCards = useClassroomStore((s) => s.galleryCards);
  const chatMessages = useClassroomStore((s) => s.chatMessages);
  const chatEnabled = useClassroomStore((s) => s.chatEnabled);
  const chatPaused = useClassroomStore((s) => s.chatPaused);
  const chatAnonymousMode = useClassroomStore((s) => s.chatAnonymousMode);
  const toggleChatPaused = useClassroomStore((s) => s.toggleChatPaused);
  const toggleChatAnonymousMode = useClassroomStore((s) => s.toggleChatAnonymousMode);
  const clearChat = useClassroomStore((s) => s.clearChat);
  const components = useClassroomStore((s) => s.components);
  const worksheetTitle = useClassroomStore((s) => s.worksheetTitle);

  const pages = useMemo(() => {
    const list: ComponentPage[] = [];
    if (!components) return list;
    const maxPage = Math.max(...components.map((c) => c.page ?? 1), 1);
    for (let i = 1; i <= maxPage; i++) {
      list.push({
        pageNumber: i,
        components: components.filter((c) => (c.page ?? 1) === i),
      });
    }
    return list;
  }, [components]);

  const activeStudent =
    activeType === "student" && activeTargetId
      ? students.find((s) => s.id === activeTargetId)
      : null;

  const projectedGallery =
    activeType === "gallery" && activeTargetId
      ? galleryCards.find((c) => c.id === activeTargetId)
      : null;

  const projectedGalleryGrid =
    activeType === "gallery_all"
      ? galleryCards
      : activeType === "gallery_partial"
      ? galleryCards.filter((c) => c.isProjected)
      : null;

  const showVote = activeType === "vote";
  const showChat = activeType === "chat";
  const showTimer = activeType === "timer";
  const showWorksheet = activeType === "worksheet";

  const timerSecondsRemaining = useClassroomStore((s) => s.timerSecondsRemaining);
  const focusMode = useClassroomStore((s) => s.focusMode);
  const isLocked = useClassroomStore((s) => s.isLocked);
  const toggleFocusMode = useClassroomStore((s) => s.toggleFocusMode);
  const toggleWritingLock = useClassroomStore((s) => s.toggleWritingLock);

  const [showSideChat, setShowSideChat] = useState(false);
  const [showSideTimer, setShowSideTimer] = useState(false);
  const [showSideVote, setShowSideVote] = useState(false);
  const [userZoom, setUserZoom] = useState(1.0);
  const [baseScale, setBaseScale] = useState(1.0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOffsetStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const hasSidePanel = showSideChat || showSideTimer || showSideVote;

  useEffect(() => {
    const compute = () => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const availableWidth = rect.width;
      const scale = availableWidth / 1000; 
      setBaseScale(scale > 0 ? scale : 1);
    };
    compute();
    const ro = new ResizeObserver(compute);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [showWorksheet, activeTargetId, showSideChat, showSideTimer, showSideVote, hasSidePanel]);

  const effectiveScale = baseScale * userZoom;

  const jumpToTop = () => {
    setPanOffset({ x: 0, y: 0 });
  };

  const handlePanStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsPanning(true);
    const point = 'touches' in e ? e.touches[0] : e;
    panStart.current.x = point.clientX;
    panStart.current.y = point.clientY;
    panOffsetStart.current.x = panOffset.x;
    panOffsetStart.current.y = panOffset.y;
    const handleMove = (me: MouseEvent | TouchEvent) => {
      const mp = 'touches' in me ? (me as TouchEvent).touches[0] : me as MouseEvent;
      setPanOffset({
        x: panOffsetStart.current.x + mp.clientX - panStart.current.x,
        y: panOffsetStart.current.y + mp.clientY - panStart.current.y,
      });
    };
    const handleEnd = () => {
      setIsPanning(false);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleEnd);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0A0B10] text-slate-200">
      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-h-0 relative">
        {(showWorksheet || activeStudent || showChat || showTimer || showVote || projectedGalleryGrid) && (
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/5 bg-black/40 px-6 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/20">
                <Grid className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white/90 truncate max-w-[200px] sm:max-w-none">
                {activeStudent ? `${activeStudent.studentName}의 답안` : worksheetTitle}
              </h1>
            </div>

            <div className="flex items-center gap-2 text-white">
              <button 
                onClick={() => setShowSideChat(!showSideChat)}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300",
                  showSideChat ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20 scale-105" : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                )}
              >
                <MessageSquare className="h-5 w-5" />
              </button>
              <button 
                onClick={() => setShowSideTimer(!showSideTimer)}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300",
                  showSideTimer ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20 scale-105" : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                )}
              >
                <Timer className="h-5 w-5" />
              </button>
              <button 
                onClick={() => setShowSideVote(!showSideVote)}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300",
                  showSideVote ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20 scale-105" : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                )}
              >
                <BarChart3 className="h-5 w-5" />
              </button>
              <div className="mx-2 h-6 w-px bg-white/10" />
              <div className="flex bg-white/5 rounded-xl p-1 gap-1 ring-1 ring-white/10 shadow-inner">
                <button onClick={() => setUserZoom(Math.max(0.5, userZoom - 0.1))} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"><ZoomOut className="h-4 w-4" /></button>
                <span className="flex items-center px-2 text-xs font-medium text-slate-400 min-w-[3rem] justify-center">{Math.round(userZoom * 100)}%</span>
                <button onClick={() => setUserZoom(Math.min(3, userZoom + 0.1))} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"><ZoomIn className="h-4 w-4" /></button>
              </div>
              <button onClick={jumpToTop} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white ring-1 ring-white/10"><MousePointer2 className="h-4 w-4" /></button>
            </div>
          </div>
        )}

        <div ref={containerRef} className={cn(
          "relative flex flex-1 flex-col min-h-0 custom-scrollbar animate-in fade-in zoom-in-95 duration-700 delay-200 pr-1",
          showChat ? "overflow-hidden" : "overflow-y-auto"
        )}>
          {activeType === "gallery_all" && projectedGalleryGrid && (
            <div className="p-8 h-full overflow-y-auto">
              <ProjectionGalleryGrid cards={projectedGalleryGrid} />
            </div>
          )}

          {activeType === "gallery" && projectedGallery && (
            <div className="p-8 h-full flex flex-col items-center justify-center">
              <ProjectionGallerySingle card={projectedGallery} />
            </div>
          )}

          {showVote && (
            <div className="p-8 h-full flex flex-col">
              <ProjectionVoteDisplay />
            </div>
          )}

          {showChat && (
            <section className="flex flex-1 flex-col min-h-0 bg-[#0F1117]">
              <div className="flex items-center justify-end gap-2 px-8 py-3 border-b border-white/10 bg-black/20 backdrop-blur-sm">
                <button onClick={clearChat} className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-500 ring-1 ring-red-500/20 hover:bg-red-500 hover:text-white"><RefreshCcw className="h-3.5 w-3.5" />초기화</button>
                <button onClick={toggleChatAnonymousMode} className={cn("flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold ring-1", chatAnonymousMode ? "bg-purple-500/10 text-purple-400 ring-purple-500/20" : "bg-white/5 text-slate-400 ring-white/10")}><User className="h-3.5 w-3.5" />익명</button>
                <button onClick={toggleChatPaused} className={cn("flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold ring-1", chatPaused ? "bg-orange-500/10 text-orange-400 ring-orange-500/20" : "bg-white/5 text-slate-400 ring-white/10")}><Lock className="h-3.5 w-3.5" />정지</button>
              </div>

              <div className="flex flex-col-reverse flex-1 min-h-0 overflow-y-auto w-full px-8 py-6 gap-4 custom-scrollbar">
                {chatMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-500 italic text-lg">아직 대화 내용이 없습니다.</div>
                ) : (
                  chatMessages.slice(-100).reverse().map((msg, i, arr) => {
                    const isLatest = i === 0;
                    const FULL = 13;
                    const opacity = (arr.length <= FULL || i < FULL) ? 1 : 1.0 - ((i - FULL) / Math.max(arr.length - 1 - FULL, 1)) * 0.30;
                    return (
                      <div key={msg.id} className="flex w-full animate-in slide-in-from-bottom-2 duration-300" style={{ opacity }}>
                        <div className={cn("max-w-[85%] rounded-[2rem] px-8 py-4 shadow-xl ring-1", msg.isTeacher ? "bg-gradient-to-br from-orange-400 to-orange-600 text-white ring-orange-400 ml-auto rounded-tr-lg" : "bg-white/5 text-slate-200 ring-white/10 rounded-tl-lg")}>
                          <div className="mb-1 flex items-center gap-2">
                            <span className={cn("text-sm font-bold", msg.isTeacher ? "text-white" : "text-orange-400")}>{msg.senderName}</span>
                            {msg.isTeacher && <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] uppercase font-bold text-white">선생님</span>}
                          </div>
                          <p className="text-xl font-medium">{msg.content}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          )}

          {(showWorksheet || activeStudent) && (
            <div className="flex-1 w-full flex flex-col items-center py-12 px-4 cursor-grab active:cursor-grabbing" onMouseDown={handlePanStart} onTouchStart={handlePanStart}>
              <div style={{ transform: `scale(${effectiveScale}) translate(${panOffset.x}px, ${panOffset.y}px)`, transformOrigin: "top center", transition: isPanning ? "none" : "transform 0.5s cubic-bezier(0.2, 0, 0, 1)"}} className="flex flex-col gap-12 w-[800px]">
                {pages.map((page) => (
                  <div key={page.pageNumber} className="relative bg-white shadow-2xl rounded-[2.5rem] overflow-hidden min-h-[1000px]">
                     <div className="absolute inset-0 bg-[#f9fafb]" />
                     <div className="relative h-20 bg-gradient-to-r from-orange-50 to-white px-10 flex items-center justify-between border-b border-orange-100">
                        <div className="flex items-center gap-4"><div className="h-8 w-1 bg-orange-500 rounded-full" /> <span className="text-xs font-black uppercase text-orange-500/50">Lesson Worksheet</span></div>
                        <div className="flex items-center gap-2"><span className="text-xs font-bold text-slate-400">Page</span><div className="h-8 w-8 flex items-center justify-center rounded-lg bg-orange-500 text-white font-black">{page.pageNumber}</div></div>
                     </div>
                     <div className="relative p-12 flex flex-col gap-10">
                        {page.components.map((c: any, index: number) => {
                          const studentAnswer = activeStudent?.answers?.find((a: any) => a.componentId === c.id);
                          return (
                            <div key={c.id} className="relative group">
                              <div className="mb-6 flex items-center gap-4"><div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-slate-900 text-white font-bold">{index + 1}</div><h3 className="text-xl font-bold text-slate-900">{c.title}</h3></div>
                              <div className="relative rounded-3xl border-2 border-slate-100 bg-slate-50/50 p-8">
                                {c.type === "prompt" ? <p className="text-lg text-slate-600 whitespace-pre-wrap">{c.content}</p> : (
                                  <div className="flex flex-col gap-4">
                                    <div className="text-[10px] font-black uppercase text-slate-400">Response</div>
                                    <div className="p-6 rounded-2xl bg-white border-2 border-orange-100 min-h-[80px] flex items-center">
                                      {studentAnswer ? (
                                        <div className="w-full">
                                          {c.type === "drawing" ? <img src={studentAnswer.imageUrl} className="max-h-[300px] object-contain" /> : studentAnswer.choiceValues ? (
                                            <div className="flex flex-wrap gap-2">{studentAnswer.choiceValues.map((v: string) => <span key={v} className="px-4 py-2 rounded-full bg-orange-500 text-white font-bold">{v}</span>)}</div>
                                          ) : <p className="text-2xl font-bold text-slate-900">{studentAnswer.textValue}</p>}
                                        </div>
                                      ) : <p className="text-slate-300 italic">No Answer</p>}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                     </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Control Overlay */}
      <div className="fixed bottom-10 left-10 flex gap-4 pointer-events-none">
        {showTimer && (
          <div className="pointer-events-auto flex items-center gap-6 rounded-[2.5rem] bg-black/60 px-10 py-6 text-white shadow-2xl backdrop-blur-3xl ring-2 ring-white/10">
            <Timer className="h-8 w-8 text-orange-500" />
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">Timer</span>
              <span className={cn("text-6xl font-black tabular-nums", timerSecondsRemaining < 10 ? "text-red-500 animate-pulse" : "")}>{formatTime(timerSecondsRemaining)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Side Panel */}
      {hasSidePanel && (
        <aside className="w-[400px] shrink-0 border-l border-white/5 bg-black/60 backdrop-blur-2xl flex flex-col min-h-0">
          {showSideChat && (
            <div className="flex flex-1 flex-col min-h-0">
               <div className="flex h-16 items-center justify-between border-b border-white/5 px-6 shrink-0">
                <div className="flex items-center gap-3"><MessageSquare className="h-4 w-4 text-orange-400" /><h3 className="text-sm font-bold uppercase">Live Chat</h3></div>
                <button onClick={() => setShowSideChat(false)} className="rounded-lg p-2 hover:bg-white/5 text-slate-400"><ChevronRight className="h-4 w-4" /></button>
              </div>
              <div className="flex flex-col-reverse flex-1 min-h-0 overflow-y-auto px-4 py-6 gap-3 custom-scrollbar">
                {chatMessages.slice(-100).reverse().map((msg, i, arr) => {
                  const FULL = 13;
                  const opacity = (arr.length <= FULL || i < FULL) ? 1 : 1.0 - ((i - FULL) / Math.max(arr.length - 1 - FULL, 1)) * 0.30;
                  return (
                    <div key={msg.id} style={{ opacity }} className={cn("flex flex-col rounded-2xl px-4 py-3 ring-1", msg.isTeacher ? "bg-orange-500/10 ring-orange-500/10" : "bg-white/5 ring-white/5")}>
                       <div className="flex items-center justify-between mb-1"><span className={cn("text-xs font-black", msg.isTeacher ? "text-orange-400" : "text-white/70")}>{msg.senderName}</span></div>
                       <p className="text-sm font-medium">{msg.content}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}

function ProjectionGalleryGrid({ cards }: { cards: any[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {cards.map((card) => (
        <div key={card.id} className="bg-white/5 rounded-3xl p-6 border border-white/10">
          <div className="text-xs font-bold text-orange-400 mb-2">{card.displayName}</div>
          {card.imageUrl ? <img src={card.imageUrl} className="w-full rounded-xl" /> : <p className="text-sm">{card.excerpt}</p>}
        </div>
      ))}
    </div>
  );
}

function ProjectionGallerySingle({ card }: { card: any }) {
  return (
    <div className="bg-white/5 rounded-[3rem] p-12 border border-white/10 max-w-4xl w-full">
       <div className="text-2xl font-black text-orange-400 mb-6">{card.displayName}</div>
       {card.imageUrl ? <img src={card.imageUrl} className="w-full rounded-2xl" /> : <p className="text-3xl font-medium leading-relaxed">{card.excerpt}</p>}
    </div>
  );
}
