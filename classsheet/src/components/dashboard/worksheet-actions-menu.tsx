"use client";

import { MoreHorizontal, Copy, FileText, Layout, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";

import { duplicateWorksheetAction, saveAsTemplateAction, deleteWorksheetAction } from "@/app/actions/worksheets";
import { SubmitButton } from "@/components/shared/submit-button";

export function WorksheetActionsMenu({
  worksheetId,
  sessionCode,
}: {
  worksheetId: string;
  sessionCode: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-20 mt-1 w-48 origin-top-right rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
          <Link
            href={`/session/${sessionCode}`}
            target="_blank"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <Layout className="h-4 w-4 text-slate-400" />
            학생 화면
          </Link>

          <form action={duplicateWorksheetAction} onSubmit={() => setIsOpen(false)}>
            <input type="hidden" name="worksheetId" value={worksheetId} />
            <SubmitButton
              label={
                <div className="flex items-center gap-2">
                  <Copy className="h-4 w-4 text-slate-400" />
                  <span>수업 복사</span>
                </div>
              }
              pendingLabel="복사 중..."
              className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            />
          </form>

          <form action={saveAsTemplateAction} onSubmit={() => setIsOpen(false)}>
            <input type="hidden" name="worksheetId" value={worksheetId} />
            <SubmitButton
              label={
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <span>템플릿으로 저장</span>
                </div>
              }
              pendingLabel="저장 중..."
              className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            />
          </form>

          <div className="my-1 h-px bg-slate-100" />

          <form
            action={deleteWorksheetAction}
            onSubmit={(e) => {
              if (!confirm("정말 이 수업을 삭제하시겠습니까?")) {
                e.preventDefault();
              } else {
                setIsOpen(false);
              }
            }}
          >
            <input type="hidden" name="worksheetId" value={worksheetId} />
            <SubmitButton
              label={
                <div className="flex items-center gap-2 text-rose-600">
                  <Trash2 className="h-4 w-4" />
                  <span>삭제</span>
                </div>
              }
              pendingLabel="삭제 중..."
              className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-rose-50 transition-colors"
            />
          </form>
        </div>
      )}
    </div>
  );
}
