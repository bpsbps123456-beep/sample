"use client";

import { useMemo, useState } from "react";

import { SubmitButton } from "@/components/shared/submit-button";
import {
  createComponentByType,
  createDefaultWorksheetDraft,
  type EditableWorksheetDraft,
} from "@/lib/worksheet-editor";
import type { FontSizeMode, WorksheetComponent, WorksheetComponentType } from "@/lib/types/domain";

const FONT_SIZE_CLASSES = {
  title: { sm: "text-xl",   md: "text-2xl", lg: "text-3xl" },
  body:  { sm: "text-base", md: "text-lg",  lg: "text-xl"  },
} as const;

// 미리보기 렌더 — student-workspace의 FS와 동일한 값 사용
const FS = {
  title:  { sm: "text-xl",     md: "text-2xl",    lg: "text-3xl"     },
  body:   { sm: "text-base",   md: "text-lg",     lg: "text-xl"      },
  input:  { sm: "text-lg",     md: "text-xl",     lg: "text-2xl"     },
  choice: { sm: "text-lg",     md: "text-xl",     lg: "text-2xl"     },
  ox:     { sm: "text-[72px]", md: "text-[96px]", lg: "text-[120px]" },
} as const;

function fsp(ctx: keyof typeof FS, mode: FontSizeMode | undefined): string {
  return FS[ctx][mode ?? "sm"];
}

function SMLToggle({
  value,
  onChange,
}: {
  value: FontSizeMode | undefined;
  onChange: (v: FontSizeMode) => void;
}) {
  const current = value ?? "sm";
  return (
    <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
      {(["S", "M", "L"] as const).map((label) => {
        const mode: FontSizeMode = label === "S" ? "sm" : label === "M" ? "md" : "lg";
        const active = current === mode;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onChange(mode)}
            className={`w-6 h-6 rounded-md text-[10px] font-black transition-all ${
              active
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

const TYPE_LABELS: Record<WorksheetComponentType, string> = {
  prompt: "안내문",
  short_text: "단답형",
  long_text: "장문형",
  drawing: "그림",
  single_choice: "단일선택",
  multi_choice: "복수선택",
  ox: "O/X",
  divider: "구분선",
};

const TYPE_COLORS: Record<WorksheetComponentType, string> = {
  prompt: "bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100",
  short_text: "bg-teal-50 text-teal-700 border-teal-100 hover:bg-teal-100",
  long_text: "bg-sky-50 text-sky-700 border-sky-100 hover:bg-sky-100",
  drawing: "bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100",
  single_choice: "bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100",
  multi_choice: "bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-100",
  ox: "bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100",
  divider: "bg-slate-50 text-slate-700 border-slate-100 hover:bg-slate-100",
};

const TYPE_BADGE: Record<WorksheetComponentType, string> = {
  prompt: "bg-indigo-100 text-indigo-700",
  short_text: "bg-teal-100 text-teal-700",
  long_text: "bg-sky-100 text-sky-700",
  drawing: "bg-purple-100 text-purple-700",
  single_choice: "bg-amber-100 text-amber-700",
  multi_choice: "bg-orange-100 text-orange-700",
  ox: "bg-rose-100 text-rose-700",
  divider: "bg-slate-100 text-slate-700",
};

const TYPE_TITLE_PLACEHOLDER: Record<WorksheetComponentType, string> = {
  prompt: "안내 제목을 입력하세요. (예: 오늘의 활동 안내)",
  short_text: "질문을 입력하세요. (예: 이 단어의 뜻은 무엇인가요?)",
  long_text: "질문을 입력하세요. (예: 오늘 배운 내용을 자신의 언어로 서술하세요.)",
  drawing: "활동 지시를 입력하세요. (예: 개념을 도식으로 표현해 보세요.)",
  single_choice: "질문을 입력하세요. (예: 다음 중 올바른 설명은?)",
  multi_choice: "질문을 입력하세요. (예: 해당하는 것을 모두 고르세요.)",
  ox: "진술문을 입력하세요. (예: 물은 100°C에서 끓는다.)",
  divider: "",
};

interface WorksheetEditorFormProps {
  action: (formData: FormData) => void;
  initialDraft?: EditableWorksheetDraft;
  worksheetId?: string;
  submitLabel?: string;
}

function updateComponentValue(
  component: WorksheetComponent,
  key: string,
  value: string,
): WorksheetComponent {
  if (key === "titleFontSize") return { ...component, titleFontSize: value as FontSizeMode } as WorksheetComponent;
  if (key === "bodyFontSize")  return { ...component, bodyFontSize: value as FontSizeMode } as WorksheetComponent;
  if (key === "title") return { ...component, title: value } as WorksheetComponent;
  if (key === "page")  return { ...component, page: Math.max(1, Number(value) || 1) } as WorksheetComponent;

  if (component.type === "prompt" && key === "body") return { ...component, body: value };
  if ((component.type === "short_text" || component.type === "long_text") && key === "placeholder")
    return { ...component, placeholder: value };
  if (
    (component.type === "short_text" || component.type === "long_text" ||
      component.type === "drawing" || component.type === "single_choice" ||
      component.type === "multi_choice" || component.type === "ox") &&
    key === "description"
  ) return { ...component, description: value } as WorksheetComponent;
  if ((component.type === "single_choice" || component.type === "multi_choice") && key === "options")
    return { ...component, options: value.split("\n").map((o) => o.trim()).filter(Boolean) };

  return component;
}

export function WorksheetEditorForm({
  action,
  initialDraft,
  worksheetId,
  submitLabel = "수업 저장하고 대시보드로 이동",
}: WorksheetEditorFormProps) {
  const [draft, setDraft] = useState(initialDraft ?? createDefaultWorksheetDraft());
  const [sessionCode, setSessionCode] = useState(initialDraft?.sessionCode ?? "");
  const [previewMode, setPreviewMode] = useState(false);
  const [activePage, setActivePage] = useState<number>(1); // 0 means 'ALL'
  const [pageCount, setPageCount] = useState(() =>
    Math.max(...(initialDraft?.components.map((c) => c.page) ?? [1]), 1),
  );

  const componentJson = useMemo(() => JSON.stringify(draft.components), [draft.components]);
  const pageComponents = useMemo(
    () => activePage === 0 
      ? draft.components 
      : draft.components.filter((c) => c.page === activePage),
    [draft.components, activePage],
  );

  function updateComponent(componentId: string, key: string, value: string) {
    setDraft((cur) => ({
      ...cur,
      components: cur.components.map((c) =>
        c.id === componentId ? updateComponentValue(c, key, value) : c,
      ),
    }));
  }

  function removeComponent(componentId: string) {
    setDraft((cur) => ({ ...cur, components: cur.components.filter((c) => c.id !== componentId) }));
  }

  function moveComponent(componentId: string, direction: "up" | "down" | "top" | "bottom") {
    setDraft((cur) => {
      const pageComps = activePage === 0 
        ? cur.components 
        : cur.components.filter((c) => c.page === activePage);
      const idxInPage = pageComps.findIndex((c) => c.id === componentId);
      if (idxInPage === -1) return cur;

      let newPageComps = [...pageComps];
      if (direction === "up" && idxInPage > 0) {
        [newPageComps[idxInPage], newPageComps[idxInPage - 1]] = [newPageComps[idxInPage - 1], newPageComps[idxInPage]];
      } else if (direction === "down" && idxInPage < pageComps.length - 1) {
        [newPageComps[idxInPage], newPageComps[idxInPage + 1]] = [newPageComps[idxInPage + 1], newPageComps[idxInPage]];
      } else if (direction === "top") {
        const [removed] = newPageComps.splice(idxInPage, 1);
        newPageComps.unshift(removed);
      } else if (direction === "bottom") {
        const [removed] = newPageComps.splice(idxInPage, 1);
        newPageComps.push(removed);
      } else {
        return cur;
      }

      let pageCompIdx = 0;
      const components = cur.components.map((c) => {
        if (activePage === 0 || c.page === activePage) {
          return newPageComps[pageCompIdx++];
        }
        return c;
      });

      return { ...cur, components };
    });
  }

  function addComponent(type: WorksheetComponentType) {
    setDraft((cur) => ({
      ...cur,
      components: [...cur.components, { ...createComponentByType(type), page: activePage === 0 ? 1 : activePage }],
    }));
  }

  function addComponentOption(componentId: string) {
    setDraft((cur) => ({
      ...cur,
      components: cur.components.map((c) => {
        if (c.id !== componentId) return c;
        if (c.type !== "single_choice" && c.type !== "multi_choice") return c;
        return { ...c, options: [...c.options, ""] };
      }),
    }));
  }

  function removeComponentOption(componentId: string, index: number) {
    setDraft((cur) => ({
      ...cur,
      components: cur.components.map((c) => {
        if (c.id !== componentId) return c;
        if (c.type !== "single_choice" && c.type !== "multi_choice") return c;
        return { ...c, options: c.options.filter((_, i) => i !== index) };
      }),
    }));
  }

  function updateComponentOption(componentId: string, index: number, value: string) {
    setDraft((cur) => ({
      ...cur,
      components: cur.components.map((c) => {
        if (c.id !== componentId) return c;
        if (c.type !== "single_choice" && c.type !== "multi_choice") return c;
        const newOptions = [...c.options];
        newOptions[index] = value;
        return { ...c, options: newOptions };
      }),
    }));
  }

  function addPage() {
    const next = pageCount + 1;
    setPageCount(next);
    setActivePage(next);
  }

  function deletePage(page: number) {
    if (page === 0) return; // Cannot delete 'ALL'
    setDraft((cur) => ({
      ...cur,
      components: cur.components
        .filter((c) => c.page !== page)
        .map((c) => (c.page > page ? { ...c, page: c.page - 1 } : c)),
    }));
    const next = pageCount - 1;
    setPageCount(next);
    setActivePage((prev) => (prev === 0 ? 0 : Math.min(prev, next) || 1));
  }

  return (
    <form action={action} className="grid xl:grid-cols-[400px_1fr] bg-white min-h-screen">

      {/* ── Left panel: metadata ── */}
      <section className="border-r border-slate-200 bg-slate-50 shadow-inner overflow-y-auto h-screen sticky top-0">
        <div className="bg-slate-950 px-8 py-10">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Configuration</p>
          <h1 className="mt-2 text-2xl font-black tracking-tighter text-white">기본 정보 설정</h1>
        </div>

        <div className="space-y-6 p-8">
          {/* 수업 제목 */}
          <div>
            <label className="mb-3 block text-xs font-black uppercase tracking-widest text-slate-400">수업 제목</label>
            <textarea
              name="title"
              value={draft.title}
              onChange={(e) => setDraft((c) => ({ ...c, title: e.target.value }))}
              placeholder="예) 1학기 1단원 핵심 정리 수업"
              rows={Math.max(1, draft.title.split('\n').length)}
              className="w-full resize-none rounded-2xl border-2 border-slate-100 bg-white/50 px-6 py-4 text-lg font-bold text-slate-900 outline-none transition-all placeholder:text-slate-300 focus:border-teal-500/30 focus:bg-white focus:ring-4 focus:ring-teal-500/5"
            />
          </div>

          {/* 학습 목표 */}
          <div>
            <label className="mb-3 block text-xs font-black uppercase tracking-widest text-slate-400">학습 목표</label>
            <textarea
              name="learningGoal"
              value={draft.learningGoal}
              onChange={(e) => setDraft((c) => ({ ...c, learningGoal: e.target.value }))}
              rows={Math.max(2, draft.learningGoal.split('\n').length)}
              placeholder="본 차시를 통해 학생들이 도달해야 할 최종 목표를 명시해 주세요."
              className="w-full resize-none rounded-2xl border-2 border-slate-100 bg-white/50 px-6 py-4 text-base font-medium text-slate-900 outline-none transition-all placeholder:text-slate-300 focus:border-teal-500/30 focus:bg-white focus:ring-4 focus:ring-teal-500/5"
            />
          </div>

          {/* 진행 모드 */}
          <div>
            <label className="mb-3 block text-xs font-black uppercase tracking-widest text-slate-400">진행 모드</label>
            <input type="hidden" name="mode" value={draft.mode} />
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: "individual", label: "개인 활동" },
                { value: "group",      label: "모둠 활동" },
              ] as const).map((opt) => {
                const active = draft.mode === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDraft((c) => ({ ...c, mode: opt.value }))}
                    className={`rounded-2xl border-2 px-5 py-3.5 text-sm font-black transition-all ${
                      active
                        ? "border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-950/15"
                        : "border-slate-100 bg-white text-slate-700 hover:border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 수업 코드 — 편집 중일 때만 표시 */}
          {worksheetId && (
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">수업 참여 코드</label>
              <div className="flex items-center gap-2 rounded-2xl border-2 border-slate-100 bg-white px-4 py-3">
                <input
                  name="sessionCode"
                  value={sessionCode}
                  onChange={(e) => setSessionCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
                  placeholder="예: ABC123"
                  maxLength={8}
                  className="flex-1 bg-transparent text-xl font-black tracking-[0.2em] text-slate-900 outline-none placeholder:text-slate-300"
                />
                <span className="text-xs font-bold text-slate-300">{sessionCode.length}/8</span>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400">학생이 입력하는 수업 참여 코드입니다. 영문·숫자만 사용 가능해요.</p>
            </div>
          )}

          {worksheetId ? <input type="hidden" name="worksheetId" value={worksheetId} /> : null}
          <input type="hidden" name="components" value={componentJson} />

          {/* Save buttons */}
          <div className="border-t border-slate-200 pt-8 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setPreviewMode((v) => !v)}
                className={`rounded-2xl border-2 px-6 py-5 text-lg font-black transition-all active:scale-95 ${
                  previewMode
                    ? "border-teal-600 bg-teal-600 text-white shadow-lg shadow-teal-600/20"
                    : "border-slate-200 bg-white text-slate-700 hover:border-teal-500/30 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {previewMode ? "편집하기" : "미리보기"}
              </button>
              <SubmitButton
                label="수업 저장"
                pendingLabel="저장 중..."
                name="_intent"
                value="stay"
                className="rounded-2xl border-2 border-slate-200 bg-white px-6 py-5 text-lg font-black text-slate-700 transition-all hover:border-teal-500/30 hover:bg-slate-50 hover:text-slate-900 active:scale-95"
              />
            </div>
            <div className="mt-4">
              <SubmitButton
                label="대시보드로"
                pendingLabel="이동 중..."
                name="_intent"
                value="dashboard"
                className="w-full rounded-2xl bg-slate-950 px-8 py-5 text-lg font-black text-white shadow-xl shadow-slate-950/20 transition-all hover:bg-slate-800 hover:scale-[1.02] active:scale-95"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Right panel: component builder ── */}
      <section className="flex flex-col min-h-screen bg-white">

        <div className="p-8 flex-1">
          {/* ── Page tabs ── */}
          <div className="mb-8 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActivePage(0)}
              className={`rounded-2xl px-6 py-3 text-sm font-black transition-all ${
                activePage === 0
                  ? "bg-slate-950 text-white shadow-xl shadow-slate-950/20 scale-105"
                  : "bg-teal-50 text-teal-600 hover:bg-teal-100"
              }`}
            >
              ALL
            </button>
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setActivePage(page)}
                className={`rounded-2xl px-6 py-3 text-sm font-black transition-all ${
                  activePage === page
                    ? "bg-slate-950 text-white shadow-xl shadow-slate-950/20 scale-105"
                    : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                }`}
              >
                {page} PAGE
              </button>
            ))}
            <button
              type="button"
              onClick={addPage}
              className="group flex items-center justify-center rounded-2xl bg-white border-2 border-dashed border-slate-200 px-6 py-3 text-sm font-black text-slate-400 hover:border-teal-500/30 hover:bg-teal-50/50 hover:text-teal-600 transition-all"
            >
              <span className="mr-2 opacity-50 group-hover:opacity-100">+</span> PAGE
            </button>
            {pageCount > 1 && activePage !== 0 ? (
              <button
                type="button"
                onClick={() => deletePage(activePage)}
                className="ml-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all active:scale-90"
                title="Delete Current Page"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            ) : null}
          </div>

          {!previewMode ? (
            <>
              {/* Component type buttons */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
                {(["prompt", "short_text", "long_text", "drawing", "single_choice", "multi_choice", "ox", "divider"] as WorksheetComponentType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => addComponent(type)}
                    className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-black border-2 transition-all active:scale-95 ${TYPE_COLORS[type]}`}
                  >
                    <span className="text-base leading-none">+</span>
                    {TYPE_LABELS[type]}
                  </button>
                ))}
              </div>

              {/* Component cards */}
              <div className="mt-8 space-y-4">
                {pageComponents.map((component, index) => (
                  <div key={component.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/5">
                    {/* Card header */}
                    <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50 px-5 py-3">
                      <div className="flex items-center gap-4">
                        <span className={`rounded-lg px-2.5 py-1 text-xs font-black ${TYPE_BADGE[component.type]}`}>
                          {TYPE_LABELS[component.type]}
                        </span>
                        <span className="text-sm font-black text-slate-500">#{index + 1}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 mr-2 px-2 py-1 bg-slate-200/50 rounded-xl">
                          <button
                            type="button"
                            onClick={() => moveComponent(component.id, "top")}
                            disabled={index === 0}
                            title="Move to Top"
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-white hover:text-slate-900 disabled:opacity-30 transition-colors"
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 11l7-7 7 7M5 19l7-7 7 7" /></svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => moveComponent(component.id, "up")}
                            disabled={index === 0}
                            title="Move Up"
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-white hover:text-slate-900 disabled:opacity-30 transition-colors"
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => moveComponent(component.id, "down")}
                            disabled={index === pageComponents.length - 1}
                            title="Move Down"
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-white hover:text-slate-900 disabled:opacity-30 transition-colors"
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => moveComponent(component.id, "bottom")}
                            disabled={index === pageComponents.length - 1}
                            title="Move to Bottom"
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-white hover:text-slate-900 disabled:opacity-30 transition-colors"
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 13l-7 7-7-7M19 5l-7 7-7-7" /></svg>
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeComponent(component.id)}
                          className="flex h-10 items-center justify-center rounded-xl bg-rose-500/10 px-5 text-xs font-black text-rose-500 hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                        >
                          DELETE
                        </button>
                      </div>
                    </div>

                    {/* Card body */}
                    <div className="space-y-3 p-5">
                      {component.type !== "divider" && (
                        <div className="relative">
                          <textarea
                            value={component.title}
                            onChange={(e) => updateComponent(component.id, "title", e.target.value)}
                            placeholder={TYPE_TITLE_PLACEHOLDER[component.type]}
                            rows={Math.max(1, component.title.split('\n').length)}
                            className={`w-full resize-none rounded-2xl bg-slate-50 border border-slate-100 px-6 py-4 pr-28 font-bold text-slate-900 outline-none placeholder:text-slate-300 focus:border-teal-500/50 focus:bg-white focus:ring-4 focus:ring-teal-500/5 transition-all ${FONT_SIZE_CLASSES.title[component.titleFontSize ?? "sm"]}`}
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <SMLToggle
                              value={component.titleFontSize}
                              onChange={(v) => updateComponent(component.id, "titleFontSize", v)}
                            />
                          </div>
                        </div>
                      )}

                      {component.type === "prompt" && (
                        <div className="relative">
                          <textarea
                            value={component.body}
                            onChange={(e) => updateComponent(component.id, "body", e.target.value)}
                            rows={Math.max(4, component.body.split('\n').length)}
                            placeholder="학생들에게 보여줄 안내 사항이나 학습 자료 내용을 입력하세요."
                            className={`w-full rounded-2xl bg-slate-50 border border-slate-100 px-6 py-4 pr-28 font-medium text-slate-900 outline-none placeholder:text-slate-300 focus:border-teal-500/50 focus:bg-white focus:ring-4 focus:ring-teal-500/5 transition-all resize-none ${FONT_SIZE_CLASSES.body[component.bodyFontSize ?? "sm"]}`}
                          />
                          <div className="absolute right-3 top-4">
                            <SMLToggle
                              value={component.bodyFontSize}
                              onChange={(v) => updateComponent(component.id, "bodyFontSize", v)}
                            />
                          </div>
                        </div>
                      )}

                      {(component.type === "short_text" || component.type === "long_text" ||
                        component.type === "drawing" || component.type === "single_choice" ||
                        component.type === "multi_choice" || component.type === "ox") && (
                        <div>
                          <p className="mb-1.5 text-xs font-black uppercase tracking-widest text-slate-400">
                            문항 답변 가이드(선택)
                          </p>
                          <div className="relative">
                            <textarea
                              value={component.description ?? ""}
                              onChange={(e) => updateComponent(component.id, "description", e.target.value)}
                              rows={Math.max(2, (component.description ?? "").split('\n').length)}
                              placeholder="문항에 대한 부연 설명이나 답변 가이드를 입력하세요."
                              className={`w-full resize-none rounded-xl bg-slate-50 border border-slate-100 px-5 py-4 pr-24 font-medium text-slate-600 outline-none placeholder:text-slate-300 focus:border-teal-500/30 focus:bg-white transition-all placeholder:italic ${FONT_SIZE_CLASSES.body[component.bodyFontSize ?? "sm"]}`}
                            />
                            <div className="absolute right-3 top-3">
                              <SMLToggle
                                value={component.bodyFontSize}
                                onChange={(v) => updateComponent(component.id, "bodyFontSize", v)}
                              />
                            </div>
                          </div>
                        </div>
                      )}


                      {component.type === "divider" && (
                        <div className="flex items-center gap-6 py-4">
                          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                          <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">구분선 (Divider)</span>
                          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                        </div>
                      )}

                      {(component.type === "single_choice" || component.type === "multi_choice") && (
                        <div className="space-y-3 mt-4">
                          <p className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">선택지 항목 설정</p>
                          {component.options.map((opt, idx) => (
                            <div key={idx} className="flex items-center gap-3 group/opt">
                              <span className={`flex h-5 w-5 shrink-0 rounded-${component.type === "single_choice" ? "full" : "lg"} border-2 border-slate-200 bg-slate-50`} />
                              <input
                                value={opt}
                                onChange={(e) => updateComponentOption(component.id, idx, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") { e.preventDefault(); addComponentOption(component.id); }
                                  if (e.key === "Backspace" && opt === "" && component.options.length > 1) {
                                    e.preventDefault(); removeComponentOption(component.id, idx);
                                  }
                                }}
                                placeholder={`옵션 ${idx + 1}`}
                                className="w-full rounded-xl bg-slate-50 border border-slate-100 px-5 py-3 text-sm font-bold text-slate-900 outline-none placeholder:text-slate-300 focus:border-teal-500/50 focus:bg-white transition-all"
                              />
                              <button
                                type="button"
                                onClick={() => removeComponentOption(component.id, idx)}
                                disabled={component.options.length <= 1}
                                className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-300 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-0 transition-all"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addComponentOption(component.id)}
                            className="mt-4 flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-4 text-sm font-black text-slate-400 hover:border-teal-500/30 hover:bg-teal-50 hover:text-teal-600 transition-all"
                          >
                            <span className="text-lg">+</span> ADD OPTION
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {pageComponents.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-[32px] border-2 border-dashed border-slate-100 py-24 text-center bg-white/50">
                  <div className="text-5xl opacity-10 mb-6 font-black tracking-tighter scale-150 text-slate-900">+</div>
                  <p className="text-xl font-black text-slate-300 uppercase tracking-widest">{activePage === 0 ? "WORKSHEET" : `${activePage} PAGE`} IS EMPTY</p>
                  <p className="mt-2 text-sm text-slate-400 font-bold uppercase tracking-tight">Select a component above to start</p>
                </div>
              )}
            </>
          ) : (
            /* Preview mode — 학생 화면과 동일한 스타일 */
            <div className="animate-in fade-in duration-500">
              {/* 학생 상단 네비 모형 */}
              <div className="mb-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-3 px-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold text-slate-900">{draft.title || "학생 활동지"}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {pageCount > 1 && (
                      <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 opacity-40">‹</span>
                        <span className="min-w-[44px] text-center text-xs font-bold text-slate-700">{activePage === 0 ? "ALL" : `${activePage} / ${pageCount}`}</span>
                        <span className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 opacity-40">›</span>
                      </div>
                    )}
                    <span className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white opacity-60">제출하기 →</span>
                  </div>
                </div>
                {/* progress bar (0%) */}
                <div className="h-0.5 bg-slate-100" />
              </div>

              {/* 페이지별 컴포넌트 */}
              {Array.from({ length: pageCount }, (_, i) => i + 1)
                .filter((p) => activePage === 0 || p === activePage)
                .map((page) => {
                  const comps = draft.components.filter((c) => c.page === page);
                  let qNum = 0;
                  return (
                    <div key={page} className="mb-5">
                      {(pageCount > 1 || activePage === 0) && (
                        <div className="mb-2 flex items-center gap-3">
                          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-500">{page} PAGE</span>
                          <div className="flex-1 h-px bg-slate-100" />
                        </div>
                      )}
                    <section className="overflow-hidden border border-slate-300 bg-[#faf9f6] shadow-sm min-h-[500px] relative rounded-sm">
                      {/* Notebook red margin lines */}
                      <div className="absolute left-8 sm:left-14 top-0 bottom-0 w-[1.5px] bg-rose-400/30 z-0 pointer-events-none" />
                      <div className="absolute left-10 sm:left-16 top-0 bottom-0 w-[1.5px] bg-rose-400/30 z-0 pointer-events-none" />

                      {comps.length === 0 ? (
                        <div className="flex flex-col items-center justify-center px-6 py-20 text-center relative z-10 h-full">
                          <p className="text-sm font-bold text-slate-400">비어 있는 페이지입니다.</p>
                        </div>
                      ) : (
                        <div className="flex flex-col px-6 py-4 md:px-12 md:py-8 sm:pl-24 md:pl-28 relative z-10 w-full">
                          {comps.map((component) => {
                            const isQuestion = !["prompt", "divider"].includes(component.type);
                            if (isQuestion) qNum++;
                            const qn = isQuestion ? qNum : undefined;

                            /* ── 안내문 ── */
                            if (component.type === "prompt") {
                              return (
                                <div key={component.id} className="mb-10 mt-2 z-10 w-full relative">
                                  {component.title && (
                                    <div className="mb-4">
                                      <h3 className={`inline-flex items-center ${fsp("title", component.titleFontSize)} font-black text-slate-900 tracking-tight border-b-4 border-slate-700 pb-1.5 pr-8 relative`}>
                                        {component.title}
                                        <div className="absolute -top-3 right-0 text-2xl opacity-90 drop-shadow-sm rotate-12">📌</div>
                                      </h3>
                                    </div>
                                  )}
                                  <div className="px-1">
                                    <p className={`whitespace-pre-wrap text-slate-800 leading-[1.8] font-bold ${fsp("body", component.bodyFontSize)}`}>
                                      {component.body || <span className="italic opacity-50">안내 내용 없음</span>}
                                    </p>
                                  </div>
                                </div>
                              );
                            }

                            /* ── 구분선 ── */
                            if (component.type === "divider") {
                              return (
                                <div key={component.id} className="my-10 w-full z-10 relative flex justify-center">
                                  <div className="w-full h-px" style={{ backgroundImage: "linear-gradient(to right, #cbd5e1 50%, transparent 50%)", backgroundSize: "14px 1px" }} />
                                </div>
                              );
                            }

                            /* ── 답변형 공통 ── */
                            return (
                              <div key={component.id} className="py-8 border-b-2 border-slate-200/50 border-dashed last:border-0 relative z-10 w-full">
                                <div className="flex items-start gap-3 sm:gap-4 w-full">
                                  {qn !== undefined && (
                                    <span className="flex-shrink-0 mt-0.5 text-3xl md:text-4xl font-serif font-black italic text-slate-800 tracking-tighter drop-shadow-sm">{qn}.</span>
                                  )}
                                  <div className="flex-1 min-w-0 pt-1 w-full">
                                    <div className={`${fsp("title", component.titleFontSize)} font-black leading-snug text-slate-900 break-words tracking-tight`}>
                                      {component.title || <span className="text-slate-300">제목 없음</span>}
                                    </div>
                                    {component.description ? (
                                      <p className={`mt-2.5 ${fsp("body", component.bodyFontSize)} leading-relaxed text-slate-600 font-bold bg-white/50 inline-block px-3 py-1.5 rounded-sm`}>{component.description}</p>
                                    ) : null}

                                    {(component.type === "short_text" || component.type === "long_text") ? (
                                      <div className="mt-6 ml-0 w-full">
                                        <textarea
                                          disabled
                                          placeholder={component.placeholder || ""}
                                          className={`w-full resize-none border-none outline-none ${fsp("input", component.titleFontSize)} p-0 text-slate-800 font-bold disabled:bg-transparent bg-transparent placeholder:font-medium placeholder:text-slate-300`}
                                          style={{
                                            backgroundImage: 'linear-gradient(transparent 38px, #94a3b8 38px, #94a3b8 40px)',
                                            backgroundSize: '100% 40px',
                                            lineHeight: '40px',
                                            minHeight: component.type === "short_text" ? '120px' : '240px'
                                          }}
                                        />
                                      </div>
                                    ) : null}

                                    {component.type === "drawing" && (
                                      <div className="mt-6 ml-0 overflow-hidden border-[3px] border-slate-300/60 rounded-sm bg-white shadow-sm ring-4 ring-white/50 relative flex h-44 flex-col items-center justify-center text-slate-300 w-full">
                                        <span className="text-3xl mb-2">🖊️</span>
                                        <span className="text-xs font-bold">학생 그림 입력칸</span>
                                      </div>
                                    )}

                                    {(component.type === "single_choice" || component.type === "multi_choice") && "options" in component && (
                                      <div className="mt-6 ml-0 flex flex-col gap-3 w-full">
                                        {component.options.map((opt, idx) => (
                                          <div key={opt} className="flex items-center gap-4 text-left px-5 py-4 rounded-sm border-2 border-slate-300 bg-white/50 text-slate-500 w-full">
                                            <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-slate-300 text-slate-400 shrink-0">
                                              <span className="font-bold">{idx + 1}</span>
                                            </div>
                                            <span className={`${fsp("choice", component.titleFontSize)} font-bold`}>
                                              {opt}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {component.type === "ox" && (
                                      <div className="mt-6 ml-0 flex gap-4 w-full">
                                        {["O", "X"].map((opt) => (
                                          <div key={opt} className="flex-1 flex flex-col items-center justify-center py-6 border-4 border-slate-300 bg-white/50 text-slate-300 rounded-sm">
                                            <span className={`${fsp("ox", component.titleFontSize)} font-black leading-none font-serif`}>{opt}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </form>
  );
}
