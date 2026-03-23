"use client";

import { useRef, useState, useTransition } from "react";
import { updateSessionCodeAction } from "@/app/actions/worksheets";

export function InlineSessionCodeEdit({
  worksheetId,
  initialCode,
}: {
  worksheetId: string;
  initialCode: string;
}) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  function startEdit() {
    setInput(initialCode);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function commit() {
    const code = input.trim().toUpperCase();
    if (code && code !== initialCode) {
      startTransition(async () => {
        const formData = new FormData();
        formData.append("worksheetId", worksheetId);
        formData.append("sessionCode", code);
        await updateSessionCodeAction(formData);
      });
    }
    setEditing(false);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") setEditing(false);
  }

  return (
    <div className="relative inline-flex items-center">
      {editing ? (
        <div className="flex items-center gap-1">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase().slice(0, 8))}
            onBlur={commit}
            onKeyDown={handleKey}
            className="w-24 rounded-full border border-teal-400 bg-slate-950 px-3 py-0.5 text-center text-[11px] font-bold tracking-[0.1em] text-white outline-none"
            autoFocus
            disabled={isPending}
          />
        </div>
      ) : (
        <button
          onClick={startEdit}
          title="클릭하여 수업 코드 변경"
          className="group flex items-center gap-1.5 rounded-full bg-slate-950 px-3 py-0.5 text-[11px] font-bold tracking-[0.1em] text-white hover:bg-slate-800 transition-colors"
        >
          {initialCode}
          <span className="text-slate-500 group-hover:text-slate-300">✎</span>
        </button>
      )}
    </div>
  );
}
