"use client";

import { useRef, useState } from "react";

import { useClassroomStore } from "@/lib/store/classroom-store";

export function SessionCodeBadge({ initialCode }: { initialCode: string }) {
  const sessionCode = useClassroomStore((s) => s.sessionCode) || initialCode;
  const changeSessionCode = useClassroomStore((s) => s.changeSessionCode);
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setInput(sessionCode);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function commit() {
    const code = input.trim().toUpperCase();
    if (code && code !== sessionCode) {
      changeSessionCode(code);
    }
    setEditing(false);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase().slice(0, 8))}
          onBlur={commit}
          onKeyDown={handleKey}
          className="w-28 rounded-xl border border-teal-400 bg-slate-950 px-3 py-2 text-center text-sm font-bold tracking-[0.1em] text-white outline-none"
          autoFocus
        />
        <button
          onMouseDown={(e) => { e.preventDefault(); commit(); }}
          className="rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700"
        >
          저장
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={startEdit}
      title="클릭하여 수업 코드 변경"
      className="group flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold tracking-[0.1em] text-white hover:bg-slate-800"
    >
      {sessionCode}
      <span className="text-slate-500 group-hover:text-slate-300">✎</span>
    </button>
  );
}
