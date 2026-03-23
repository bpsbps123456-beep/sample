"use client";

import Link from "next/link";
import { useClassroomStore } from "@/lib/store/classroom-store";
import { SessionCodeBadge } from "./session-code-badge";
import { logoutTeacherAction } from "@/app/actions/auth";
import { deleteWorksheetAction } from "@/app/actions/worksheets";

interface TeacherDashboardNavbarProps {
  worksheetId: string;
  initialTitle: string;
  initialSessionCode: string;
}

export function TeacherDashboardNavbar({
  worksheetId,
  initialTitle,
  initialSessionCode,
}: TeacherDashboardNavbarProps) {

  // Store state
  const isActive = useClassroomStore((s) => s.isActive);
  const isLocked = useClassroomStore((s) => s.isLocked);
  const sessionMode = useClassroomStore((s) => s.sessionMode);
  const focusMode = useClassroomStore((s) => s.focusMode);
  const currentPage = useClassroomStore((s) => s.currentPage);
  const totalPages = useClassroomStore((s) => s.totalPages);
  const students = useClassroomStore((s) => s.students);
  const onlineCount = students.filter((s) => s.status === "online" || s.status === "idle").length;
  const sessionClosed = useClassroomStore((s) => s.sessionClosed);

  // Store actions
  const startSession = useClassroomStore((s) => s.startSession);
  const closeSession = useClassroomStore((s) => s.closeSession);
  const setSessionMode = useClassroomStore((s) => s.setSessionMode);
  const toggleFocusMode = useClassroomStore((s) => s.toggleFocusMode);
  const toggleWritingLock = useClassroomStore((s) => s.toggleWritingLock);
  const setCurrentPage = useClassroomStore((s) => s.setCurrentPage);

  const showChat = useClassroomStore((s) => s.showChat);
  const showTimer = useClassroomStore((s) => s.showTimer);
  const showVote = useClassroomStore((s) => s.showVote);
  const toggleShowChat = useClassroomStore((s) => s.toggleShowChat);
  const toggleShowTimer = useClassroomStore((s) => s.toggleShowTimer);
  const toggleShowVote = useClassroomStore((s) => s.toggleShowVote);

  const projectedType = useClassroomStore((s) => s.projectedType);
  const setProjection = useClassroomStore((s) => s.setProjection);

  return (
    <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex h-18 items-center justify-between gap-5 px-5">
        {/* Left: Title */}
        <div className="flex min-w-0 flex-1 items-center gap-5">
          <div className="hidden lg:block">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[14px] font-black tracking-tighter text-slate-900">클래스<span className="text-teal-600">ON</span></span>
            </div>
            <h1 className="truncate text-base font-bold leading-tight text-slate-950">{initialTitle}</h1>
          </div>
          
          <div className="h-8 w-px bg-slate-200 hidden lg:block" />

          {/* Center-Left: Classroom Controls */}
          <div className="flex items-center gap-2">
            {/* 수업 세션 그룹: 수업 버튼 + 세션 코드 */}
            <div className={`flex items-center gap-1.5 rounded-2xl p-1.5 ring-1 transition-all ${
              isActive
                ? "bg-emerald-50/60 ring-emerald-200/60"
                : sessionClosed
                ? "bg-slate-50 ring-slate-200/50"
                : "bg-slate-50 ring-slate-200/60"
            }`}>
              <button
                onClick={() => {
                  if (sessionClosed) return;
                  if (isActive) {
                    if (confirm("수업을 종료하시겠습니까?")) closeSession();
                  } else {
                    startSession();
                  }
                }}
                className={`h-10 rounded-xl px-4 text-sm font-bold transition-all ${
                  sessionClosed
                    ? "bg-slate-100 text-slate-400 cursor-default"
                    : isActive
                    ? "bg-emerald-500 text-white shadow-sm hover:bg-rose-500 group"
                    : "action-primary shadow-sm"
                }`}
              >
                {sessionClosed
                  ? "종료됨"
                  : isActive
                  ? (
                      <>
                        <span className="group-hover:hidden flex items-center gap-2">
                          <span className="rounded-lg border border-emerald-200/50 bg-white/60 px-2 py-1 text-xs font-bold text-emerald-700">{onlineCount}명 접속</span>
                          수업 중
                        </span>
                        <span className="hidden group-hover:inline">종료하기</span>
                      </>
                    )
                  : "수업 시작"}
              </button>
              <div className="h-5 w-px bg-slate-200/80 mx-1" />
              <div className="px-1">
                <SessionCodeBadge initialCode={initialSessionCode} />
              </div>
            </div>

            {/* Projection button */}
            {projectedType ? (
              <button
                onClick={() => setProjection(null)}
                className="h-11 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-bold text-rose-600 hover:bg-rose-100 transition-all group"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                <span className="group-hover:hidden text-xs">화면 송출 중</span>
                <span className="hidden group-hover:inline text-xs">송출 종료</span>
              </button>
            ) : (
              <Link
                href={`/projection/${worksheetId}`}
                target="_blank"
                className="h-11 flex items-center gap-2 rounded-2xl bg-white ring-1 ring-slate-200 px-4 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                화면 보기</Link>
            )}

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5 ml-1.5 bg-slate-50 p-1.5 rounded-2xl ring-1 ring-slate-200/50">
                <button 
                  onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))} 
                  disabled={currentPage <= 1}
                  className="h-9 w-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-900 hover:bg-white transition-all disabled:opacity-30"
                >&larr;</button>
                <span className="min-w-[52px] text-center text-[13px] font-black text-slate-700">{currentPage} / {totalPages}</span>
                <button 
                  onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))} 
                  disabled={currentPage >= totalPages}
                  className="h-9 w-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-900 hover:bg-white transition-all disabled:opacity-30"
                >&rarr;</button>
              </div>
            )}
          </div>
        </div>

        {/* Center-Right: Mode & Feature Controls */}
        <div className="flex items-center gap-2">
          {/* Widget toggles */}
          <div className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1.5 ring-1 ring-slate-200/60">
            <button
              onClick={() => {
                toggleShowChat();
                if (!showChat) {
                  setProjection("chat");
                } else if (projectedType === "chat") {
                  setProjection(null);
                }
              }}
              className={`h-11 rounded-xl px-4 text-sm font-bold transition-all ${
                showChat ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              채팅
            </button>
            <button
              onClick={() => {
                toggleShowTimer();
                if (!showTimer) {
                  setProjection("timer");
                } else if (projectedType === "timer") {
                  setProjection(null);
                }
              }}
              className={`h-11 rounded-xl px-4 text-sm font-bold transition-all ${
                showTimer ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              타이머
            </button>
            <button
              onClick={() => {
                toggleShowVote();
                if (!showVote) {
                  setProjection("vote");
                } else if (projectedType === "vote") {
                  setProjection(null);
                }
              }}
              className={`h-11 rounded-xl px-4 text-sm font-bold transition-all ${
                showVote ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              투표
            </button>
          </div>

          <div className="h-8 w-px bg-slate-200" />

          <button
            onClick={toggleFocusMode}
            className={`h-11 rounded-2xl px-4 text-sm font-bold transition-all ${
              focusMode
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {focusMode ? "집중 해제" : "집중 모드"}
          </button>

          <button
            onClick={toggleWritingLock}
            className={`h-11 rounded-2xl px-4 text-sm font-bold transition-all ${
              isLocked
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {isLocked ? "잠금 해제" : "쓰기 잠금"}
          </button>

          <div className="h-8 w-px bg-slate-200 mx-1" />

          <div className="flex bg-slate-100 p-1.5 rounded-2xl ring-1 ring-slate-200/50">
            <button
              onClick={() => setSessionMode("individual")}
              className={`h-9 px-4 rounded-xl text-sm font-bold transition-all ${
                sessionMode === "individual"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >개인</button>
            <button
              onClick={() => setSessionMode("group")}
              className={`h-9 px-4 rounded-xl text-sm font-bold transition-all ${
                sessionMode === "group"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >모둠</button>
          </div>

        </div>

        {/* Right: Meta Actions */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <Link
            href={`/teacher/worksheets/${worksheetId}/edit`}
            className="h-10 flex items-center px-3.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
          >
            수정
          </Link>
          <Link
            href="/teacher/worksheets"
            className="h-10 flex items-center px-3.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
          >
            목록
          </Link>
          
          <div className="relative group">
            <button className="h-10 w-10 flex items-center justify-center text-slate-400 hover:bg-slate-100 rounded-xl transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover:block pointer-events-auto">
              <div className="w-36 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 animate-in fade-in slide-in-from-top-2">
                <form action={logoutTeacherAction}>
                  <button className="w-full text-left px-3.5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl">로그아웃</button>
                </form>
                <div className="h-px bg-slate-100 my-1.5" />
                <form action={deleteWorksheetAction}>
                  <input type="hidden" name="worksheetId" value={worksheetId} />
                  <button className="w-full text-left px-3.5 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50 rounded-xl">활동지 삭제</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

    </nav>
  );
}
