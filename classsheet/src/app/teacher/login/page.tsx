import Link from "next/link";

import { loginTeacherAction } from "@/app/actions/auth";

interface TeacherLoginPageProps {
  searchParams?: Promise<{
    error?: string;
  }>;
}

export default async function TeacherLoginPage({ searchParams }: TeacherLoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const errorMessage =
    resolvedSearchParams?.error === "invalid-pin"
      ? "PIN이 올바르지 않습니다."
      : resolvedSearchParams?.error === "missing-pin"
        ? "PIN을 입력해 주세요."
        : "";

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#020617_0%,#0f172a_50%,#064e3b_100%)] animate-aurora relative overflow-hidden flex flex-col">
      {/* Decorative Blur Blobs */}
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-teal-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <nav className="relative z-10 border-b border-white/5 bg-white/5 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto max-w-6xl">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-black text-slate-400 hover:text-white transition-colors group">
            <span className="transition-transform group-hover:-translate-x-1">←</span>
            클래스<span className="text-teal-400">ON</span>
          </Link>
        </div>
      </nav>

      <div className="relative z-10 mx-auto flex flex-1 items-center justify-center px-6 py-12">
        <section className="glass-panel w-full max-w-md rounded-[32px] p-8 md:p-12 animate-in fade-in zoom-in-95 duration-700">
          <div className="space-y-8">
            <div className="text-center">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/10 mb-6 group transition-transform hover:scale-110">
                <svg className="w-7 h-7 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="muted-label text-teal-400 font-black tracking-[0.2em] mb-2">TEACHER ACCESS</div>
              <h2 className="text-4xl font-black tracking-tight text-white">PIN 입력</h2>
              <p className="mt-3 text-slate-400 font-medium">관리자 권한을 위해 PIN을 입력하세요</p>
            </div>

            <form action={loginTeacherAction} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 tracking-wider uppercase ml-1" htmlFor="teacher-pin">
                  PIN CODE
                </label>
                <div className="relative group">
                  <input
                    id="teacher-pin"
                    name="pin"
                    type="password"
                    autoFocus
                    placeholder="••••••"
                    className="w-full bg-white/5 border-2 border-white/10 rounded-2xl px-6 py-5 text-2xl font-black tracking-[0.6em] text-white text-center outline-none focus:border-teal-500/50 focus:bg-white/10 focus:ring-4 focus:ring-teal-500/5 transition-all placeholder:text-slate-700 placeholder:tracking-normal"
                  />
                  <div className="absolute inset-0 rounded-2xl pointer-events-none border border-teal-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity" />
                </div>
              </div>

              <button className="relative group w-full overflow-hidden rounded-2xl bg-teal-500 py-5 text-base font-black text-white shadow-xl shadow-teal-900/40 transition-all hover:bg-teal-400 hover:scale-[1.02] active:scale-[0.98]">
                <span className="relative z-10 flex items-center justify-center gap-2">
                  로그인하기
                  <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M11 16l4-4m0 0l-4-4m4 4H9" />
                  </svg>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </button>

              {errorMessage ? (
                <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 px-5 py-4 text-sm font-bold text-rose-400 text-center animate-in shake-in duration-300">
                  ⚠ {errorMessage}
                </div>
              ) : null}
            </form>

            <div className="pt-6 text-center">
              <p className="text-[11px] font-bold text-slate-500 leading-relaxed uppercase tracking-widest">
                Protected by ClassON Core
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
