"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { SessionSummaryCard } from "@/components/dashboard/session-summary-card";
import { useClassroomStore } from "@/lib/store/classroom-store";

export function SessionOperationsPanel() {
  const worksheetId = useClassroomStore((state) => state.worksheetId);
  const galleryCards = useClassroomStore((state) => state.galleryCards);
  const anonymousGallery = useClassroomStore((state) => state.anonymousGallery);
  const galleryOpen = useClassroomStore((state) => state.galleryOpen);
  const galleryFilterQuestion = useClassroomStore((state) => state.galleryFilterQuestion);
  const sessionMode = useClassroomStore((state) => state.sessionMode);
  const sessionClosed = useClassroomStore((state) => state.sessionClosed);
  const students = useClassroomStore((state) => state.students);
  const helpRequests = useClassroomStore((state) => state.helpRequests);
  const chatMessages = useClassroomStore((state) => state.chatMessages);
  const components = useClassroomStore((state) => state.components);
  const toggleGalleryOpen = useClassroomStore((state) => state.toggleGalleryOpen);
  const toggleAnonymousGallery = useClassroomStore((state) => state.toggleAnonymousGallery);
  const setGalleryFilterQuestion = useClassroomStore((state) => state.setGalleryFilterQuestion);
  const toggleGalleryCard = useClassroomStore((state) => state.toggleGalleryCard);
  const toggleGalleryProject = useClassroomStore((state) => state.toggleGalleryProject);
  const setSessionMode = useClassroomStore((state) => state.setSessionMode);
  const closeSession = useClassroomStore((state) => state.closeSession);
  const projectedType = useClassroomStore((state) => state.projectedType);
  const projectedTargetId = useClassroomStore((state) => state.projectedTargetId);
  const setProjection = useClassroomStore((state) => state.setProjection);

  const [galleryViewMode, setGalleryViewMode] = useState<"grid" | "slide">("grid");
  const [slideIndex, setSlideIndex] = useState(0);

  const visibleGalleryCount = galleryCards.filter((card) => card.visible).length;
  const galleryQuestions = useMemo(
    () => components.filter((component) => !["prompt", "divider"].includes(component.type)),
    [components],
  );

  return (
    <section className="grid gap-4 xl:grid-cols-2">

      {/* ── 세션 제어 ── */}
      <div className="surface rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="muted-label">세션 운영</div>
            <h2 className="mt-1 text-xl font-bold text-slate-950">세션 제어</h2>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            sessionClosed
              ? "bg-slate-100 text-slate-500"
              : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${sessionClosed ? "bg-slate-400" : "bg-emerald-500"}`} />
            {sessionClosed ? "세션 종료됨" : "진행 중"}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            onClick={closeSession}
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-left hover:bg-rose-100"
          >
            <div className="text-sm font-bold text-rose-700">세션 종료</div>
            <div className="mt-0.5 text-[11px] leading-relaxed text-rose-400">입력 잠금 + 채팅 정리</div>
          </button>
          <button
            onClick={() => setSessionMode("individual")}
            className={`rounded-xl border px-3 py-3 text-left transition-all ${
              sessionMode === "individual"
                ? "border-teal-300 bg-teal-50"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <div className={`text-sm font-bold ${sessionMode === "individual" ? "text-teal-700" : "text-slate-800"}`}>
              {sessionMode === "individual" ? "✓ " : ""}개인 모드
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">개별 활동</div>
          </button>
          <button
            onClick={() => setSessionMode("group")}
            className={`rounded-xl border px-3 py-3 text-left transition-all ${
              sessionMode === "group"
                ? "border-teal-300 bg-teal-50"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <div className={`text-sm font-bold ${sessionMode === "group" ? "text-teal-700" : "text-slate-800"}`}>
              {sessionMode === "group" ? "✓ " : ""}모둠 모드
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">팀 활동</div>
          </button>
        </div>

        <div className="mt-4">
          <SessionSummaryCard
            students={students}
            helpRequestCount={helpRequests.length}
            chatMessageCount={chatMessages.length}
            visibleGalleryCount={visibleGalleryCount}
            title="세션 요약"
            compact
          />
        </div>

        {sessionClosed ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="text-sm font-semibold text-amber-800">세션이 종료되었습니다.</div>
            <Link
              href={`/teacher/summary/${worksheetId}`}
              className="action-primary rounded-xl px-4 py-2 text-sm font-semibold"
            >
              요약 보기 →
            </Link>
          </div>
        ) : null}
      </div>

      {/* ── 갤러리 / 프로젝션 ── */}
      <div className="surface rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="muted-label">출력</div>
            <h2 className="mt-1 text-xl font-bold text-slate-950">활동 전체보기 / 수업 화면</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/projection/${worksheetId}`}
              className="action-primary rounded-xl px-4 py-2 text-sm font-semibold"
            >
              수업 화면 보기
            </Link>
            <Link
              href={`/teacher/summary/${worksheetId}`}
              className="action-secondary rounded-xl px-4 py-2 text-sm font-semibold"
            >
              요약 보기
            </Link>
            <button
              onClick={() => {
                if (projectedType === 'gallery_all') {
                  setProjection(null);
                } else {
                  setProjection('gallery_all');
                }
              }}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                projectedType === 'gallery_all'
                  ? "bg-teal-500 text-white shadow-md shadow-teal-500/20"
                  : "action-primary"
              }`}
            >
              {projectedType === 'gallery_all' ? "전체 송출 중 ✓" : "전체 송출"}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={toggleGalleryOpen}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              galleryOpen
                ? "action-primary"
                : "action-secondary"
            }`}
          >
            {galleryOpen ? "학생 간 답변 공유 중 ✓" : "활동지 공유하기"}
          </button>
          <button
            onClick={toggleAnonymousGallery}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              anonymousGallery ? "action-soft" : "action-secondary"
            }`}
          >
            익명 {anonymousGallery ? "ON" : "OFF"}
          </button>
        </div>

        <div className="mt-4 rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
          <div className="mb-2.5 text-xs font-semibold text-slate-500">공개 문항 필터</div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setGalleryFilterQuestion(null)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                galleryFilterQuestion === null
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100"
              }`}
            >
              전체
            </button>
            {galleryQuestions.map((component) => (
              <button
                key={component.id}
                onClick={() => setGalleryFilterQuestion(component.id)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                  galleryFilterQuestion === component.id
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100"
                }`}
              >
                {component.title}
              </button>
            ))}
          </div>
        </div>

        {galleryCards.length === 0 ? (
          <div className="mt-4 rounded-xl border-2 border-dashed border-slate-200 py-8 text-center">
            <svg className="mx-auto h-5 w-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            <p className="mt-2 text-sm text-slate-400">제출된 작품이 없습니다</p>
          </div>
        ) : (
          <>
            <div className="mt-4 flex gap-1.5">
              {(["grid", "slide"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => { setGalleryViewMode(mode); if (mode === "slide") setSlideIndex(0); }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    galleryViewMode === mode
                      ? "bg-slate-900 text-white"
                      : "action-secondary"
                  }`}
                >
                  {mode === "grid" ? "그리드" : "슬라이드"}
                </button>
              ))}
            </div>

            {galleryViewMode === "grid" ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {galleryCards.map((card) => (
                  <div key={card.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-xs font-semibold text-slate-700">{card.displayName}</div>
                      <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        card.visible ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                      }`}>
                        {card.visible ? "공개" : "비공개"}
                      </span>
                    </div>
                    {card.excerpt ? (
                      <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-slate-400">{card.excerpt}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <button
                        onClick={() => toggleGalleryCard(card.id)}
                        className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${card.visible ? "bg-emerald-500 text-white" : "action-secondary"}`}
                      >
                        {card.visible ? "학생공개됨 ✓" : "학생공개"}
                      </button>
                      <button
                        onClick={() => toggleGalleryProject(card.id)}
                        className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${card.isProjected ? "bg-indigo-500 text-white" : "action-secondary"}`}
                      >
                        {card.isProjected ? "송출선택됨 ✓" : "송출선택"}
                      </button>
                      <button
                        onClick={() => {
                          if (projectedType === 'gallery' && projectedTargetId === card.id) {
                            setProjection(null);
                          } else {
                            setProjection("gallery", card.id);
                          }
                        }}
                        className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                          projectedType === 'gallery' && projectedTargetId === card.id 
                            ? "bg-teal-500 text-white shadow-sm" 
                            : "action-secondary"
                        }`}
                      >
                        {projectedType === 'gallery' && projectedTargetId === card.id ? "단독 송출 중" : "단독 송출"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              (() => {
                const clampedIdx = Math.min(Math.max(slideIndex, 0), galleryCards.length - 1);
                const card = galleryCards[clampedIdx];
                return (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <button
                        onClick={() => setSlideIndex((i) => Math.max(0, i - 1))}
                        disabled={clampedIdx === 0}
                        className="action-secondary rounded-lg px-3 py-1.5 text-sm font-bold disabled:opacity-30"
                      >←</button>
                      <div className="text-xs text-slate-400">{clampedIdx + 1} / {galleryCards.length}</div>
                      <button
                        onClick={() => setSlideIndex((i) => Math.min(galleryCards.length - 1, i + 1))}
                        disabled={clampedIdx === galleryCards.length - 1}
                        className="action-secondary rounded-lg px-3 py-1.5 text-sm font-bold disabled:opacity-30"
                      >→</button>
                    </div>
                    <div className="mt-3">
                      <div className="text-sm font-semibold text-slate-900">{card.displayName}</div>
                      {card.excerpt ? (
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.excerpt}</p>
                      ) : null}
                      {card.imageUrl ? (
                        <div className="relative mt-3 h-40 w-full overflow-hidden rounded-lg border border-slate-200 bg-white">
                          <Image src={card.imageUrl} alt={card.displayName} fill className="object-contain" unoptimized />
                        </div>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => toggleGalleryCard(card.id)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${card.visible ? "bg-emerald-500 text-white" : "action-secondary"}`}
                        >
                          {card.visible ? "공개됨 ✓" : "학생공개"}
                        </button>
                        <button
                          onClick={() => toggleGalleryProject(card.id)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${card.isProjected ? "bg-indigo-500 text-white" : "action-secondary"}`}
                        >
                          {card.isProjected ? "송출됨 ✓" : "송출선택"}
                        </button>
                        <button
                          onClick={() => {
                            if (projectedType === 'gallery' && projectedTargetId === card.id) {
                              setProjection(null);
                            } else {
                              setProjection("gallery", card.id);
                            }
                          }}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                            projectedType === 'gallery' && projectedTargetId === card.id 
                              ? "bg-teal-500 text-white shadow-sm" 
                              : "action-secondary"
                          }`}
                        >
                          {projectedType === 'gallery' && projectedTargetId === card.id ? "단독 송출 중" : "단독 송출"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </>
        )}
      </div>
    </section>
  );
}
