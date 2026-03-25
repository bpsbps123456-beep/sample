"use client";

import Image from "next/image";
import type { WorksheetComponent, FontSizeMode } from "@/lib/types/domain";
import { LiveDrawingOverlay } from "@/components/shared/live-drawing-overlay";

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

interface WorksheetOriginalPageProps {
  worksheetId: string;
  items: WorksheetComponent[];
  pageNumber: number;
}

export function WorksheetOriginalPage({ worksheetId, items, pageNumber }: WorksheetOriginalPageProps) {
  let qNum = 0;

  return (
    <section 
      id={`p-${pageNumber}-top`}
      className="border-2 border-slate-300 bg-[#faf9f6] shadow-2xl relative rounded-sm text-slate-900 min-h-[80vh] flex-shrink-0"
    >
      {/* Notebook red margin lines */}
      <div className="absolute left-10 sm:left-14 top-0 bottom-0 w-[1.5px] bg-rose-400/40 z-0 pointer-events-none" />
      <div className="absolute left-12 sm:left-16 top-0 bottom-0 w-[1.5px] bg-rose-400/40 z-0 pointer-events-none" />

      <div className="absolute top-4 right-6 text-xs font-black text-slate-300 tracking-widest uppercase z-10">PAGE {pageNumber}</div>

      <div className="flex flex-col px-10 py-10 md:px-16 md:py-12 sm:pl-28 md:pl-32 relative z-10">
        {items.map((c) => {
          const isQuestion = !["prompt", "divider"].includes(c.type);
          if (isQuestion) qNum++;
          const qn = isQuestion ? qNum : undefined;

          if (c.type === "prompt") {
            return (
              <div key={c.id} className="mb-12 mt-2 w-full relative">
                {c.title && (
                  <div className="mb-6">
                    <h3 className={`inline-flex items-center font-black text-slate-900 tracking-tight border-b-4 border-slate-700 pb-2 pr-10 relative ${fs("title", c.titleFontSize)}`}>
                      {c.title}
                      <div className="absolute -top-4 right-0 text-3xl opacity-90 drop-shadow-sm rotate-12">📌</div>
                    </h3>
                  </div>
                )}
                <div className="px-1">
                  <p className={`whitespace-pre-wrap text-slate-800 leading-[1.8] font-bold ${fs("body", c.bodyFontSize)}`}>{c.body}</p>
                </div>
              </div>
            );
          }

          if (c.type === "divider") {
            return (
              <div key={c.id} className="my-12 w-full relative flex justify-center">
                <div className="w-full h-px" style={{ backgroundImage: "linear-gradient(to right, #cbd5e1 50%, transparent 50%)", backgroundSize: "16px 1px" }} />
              </div>
            );
          }

          return (
            <div 
              key={c.id} 
              id={`q-${pageNumber}-${qn}`}
              className="py-10 border-b-2 border-slate-200/50 border-dashed last:border-0 relative"
            >
              <div className="flex items-start gap-4 sm:gap-6">
                {qn !== undefined && (
                  <span className="flex-shrink-0 mt-0.5 text-4xl md:text-5xl font-serif font-black italic text-slate-800 tracking-tighter drop-shadow-sm">{qn}.</span>
                )}
                <div className="flex-1 min-w-0 pt-1">
                  <div className={`font-black leading-snug text-slate-900 break-words tracking-tight ${fs("title", c.titleFontSize)}`}>
                    {c.title}
                  </div>
                  {c.description ? (
                    <p className={`mt-3 leading-relaxed text-slate-600 font-bold bg-white/50 inline-block px-4 py-2 rounded-sm border border-slate-100 ${fs("body", c.bodyFontSize)}`}>{c.description}</p>
                  ) : null}

                  {c.type === "short_text" || c.type === "long_text" ? (
                    <div className="mt-8">
                       <div 
                        className="w-full h-40 border-2 border-slate-200/50 rounded-sm bg-white/30 border-dashed flex items-center justify-center text-slate-300 font-bold italic"
                        style={{
                          backgroundImage: 'linear-gradient(transparent 38px, #e2e8f0 38px, #e2e8f0 40px)',
                          backgroundSize: '100% 40px',
                          minHeight: c.type === "short_text" ? '120px' : '240px'
                        }}
                      >
                        {/* 답변 입력란 */}
                      </div>
                    </div>
                  ) : null}

                  {c.type === "drawing" ? (
                    <div className="mt-8 overflow-hidden border-[3px] border-slate-300/60 rounded-sm bg-white shadow-md aspect-[3/2] max-h-[60vh] flex items-center justify-center relative">
                      <div className="text-slate-200 font-black text-4xl opacity-20">🎨</div>
                    </div>
                  ) : null}

                  {(c.type === "single_choice" || c.type === "multi_choice") && "options" in c ? (
                    <div className="mt-8 flex flex-col gap-4">
                      {c.options.map((opt, idx) => (
                        <div
                          key={opt}
                          className="flex items-center gap-5 text-left px-6 py-5 rounded-sm border-2 border-slate-300 bg-white/50 text-slate-700"
                        >
                          <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-slate-300 shrink-0 font-bold text-slate-400">
                            {idx + 1}
                          </div>
                          <span className={`${fs("choice", c.titleFontSize)} font-bold`}>
                            {opt}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {c.type === "ox" ? (
                    <div className="mt-8 flex gap-6">
                      {(["O", "X"] as const).map((opt) => (
                        <div
                          key={opt}
                          className="flex-1 flex flex-col items-center justify-center py-10 border-4 border-slate-300 bg-white/50 text-slate-200 rounded-sm"
                        >
                          <span className={`font-black leading-none font-serif ${fs("ox", c.titleFontSize)} opacity-20`}>{opt}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
