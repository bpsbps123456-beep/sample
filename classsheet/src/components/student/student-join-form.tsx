"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  clearStoredStudentEntry,
  readStoredStudentEntry,
  writeStoredStudentEntry,
} from "@/lib/student-session";

interface StudentJoinFormProps {
  defaultCode: string;
}

export function StudentJoinForm({ defaultCode }: StudentJoinFormProps) {
  const router = useRouter();
  const [sessionCode, setSessionCode] = useState(defaultCode);
  const [studentName, setStudentName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const existingEntry = useMemo(() => readStoredStudentEntry(), []);

  async function handleResetEntry() {
    clearStoredStudentEntry();
    const supabase = createSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    window.location.reload();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedCode = sessionCode.trim().toUpperCase();
    const normalizedName = studentName.trim();

    if (!normalizedCode || !normalizedName) {
      setError("수업코드와 이름을 모두 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const supabase = createSupabaseBrowserClient();
      let authUserId: string | undefined;

      if (supabase) {
        const existingUser = await supabase.auth.getUser();

        if (existingUser.data.user?.id) {
          authUserId = existingUser.data.user.id;
        } else {
          const anonymousSignIn = await supabase.auth.signInAnonymously();
          if (!anonymousSignIn.error) {
            authUserId = anonymousSignIn.data.user?.id;
          }
        }
      }

      const response = await fetch("/api/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionCode: normalizedCode,
          studentName: normalizedName,
          authUserId,
        }),
      });

      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
        sessionCode?: string;
        studentName?: string;
        studentToken?: string;
        submissionId?: string | null;
        authUserId?: string;
        groupId?: string | null;
      };

      if (!response.ok || !result.ok || !result.sessionCode || !result.studentName) {
        setError(result.error === "invalid-session" ? "유효한 수업코드가 아닙니다." : "입장 처리에 실패했습니다.");
        return;
      }

      writeStoredStudentEntry({
        sessionCode: result.sessionCode,
        studentName: result.studentName,
        studentToken: result.studentToken,
        submissionId: result.submissionId ?? null,
        authUserId: result.authUserId ?? authUserId,
        groupId: result.groupId ?? null,
      });

      router.push(`/session/${result.sessionCode}`);
    } catch {
      setError("입장 처리 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {existingEntry ? (
        <div className="rounded-2xl border border-teal-500/20 bg-teal-500/10 p-5 text-sm ring-1 ring-teal-500/20 animate-in zoom-in-95 duration-500">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
            <div className="font-semibold text-slate-300">최근 입장 정보가 있습니다</div>
          </div>
          <div className="mt-2 text-lg font-bold text-white">
            {existingEntry.studentName} <span className="text-teal-400/60 font-medium">· {existingEntry.sessionCode}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => router.push(`/session/${existingEntry.sessionCode}`)}
              className="flex-1 bg-teal-500 text-white rounded-xl px-4 py-3 text-sm font-bold shadow-lg shadow-teal-500/20 hover:bg-teal-400 active:scale-95 transition-all"
            >
              그대로 입장
            </button>
            <button
              type="button"
              onClick={handleResetEntry}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white hover:bg-white/10 active:scale-95 transition-all"
            >
              이름 바꾸기
            </button>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-400 tracking-wider uppercase ml-1">수업 코드</label>
          <input
            value={sessionCode}
            onChange={(event) => {
              setSessionCode(event.target.value);
              setError("");
            }}
            placeholder="코드를 입력하세요"
            className="w-full bg-white/5 border-2 border-white/10 rounded-2xl px-5 py-4 text-xl font-black tracking-[0.3em] text-white uppercase outline-none focus:border-teal-500/50 focus:bg-white/10 focus:ring-4 focus:ring-teal-500/10 transition-all placeholder:text-slate-600 placeholder:tracking-normal placeholder:font-bold"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-400 tracking-wider uppercase ml-1">이름</label>
          <input
            value={studentName}
            onChange={(event) => {
              setStudentName(event.target.value);
              setError("");
            }}
            placeholder="실명을 입력해 주세요"
            className="w-full bg-white/5 border-2 border-white/10 rounded-2xl px-5 py-4 text-lg font-bold text-white outline-none focus:border-teal-500/50 focus:bg-white/10 focus:ring-4 focus:ring-teal-500/10 transition-all placeholder:text-slate-600"
          />
        </div>
        
        {error ? (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm font-bold text-rose-400 animate-in shake-in duration-300">
            ⚠ {error}
          </div>
        ) : null}

        <button
          disabled={isSubmitting}
          className="relative group w-full overflow-hidden rounded-2xl bg-white px-5 py-5 text-base font-black text-slate-950 shadow-xl transition-all hover:bg-teal-400 active:scale-[0.98] disabled:opacity-50"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {isSubmitting ? "입장 중..." : "수업 입장하기"}
            {!isSubmitting && <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>}
          </span>
        </button>
      </form>
    </div>
  );
}
