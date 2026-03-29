import Link from "next/link";
import { Radio, MessageSquare, BarChart2, FileText, ChevronRight, MonitorPlay } from "lucide-react";
import { HeroMockup } from "@/components/shared/hero-mockup";

/* ─── Static data ────────────────────────────────────────────── */

const STEPS = [
  {
    num: "01",
    title: "방송 준비",
    desc: "활동지와 투표를 미리 준비하고 방송 시작 버튼 하나로 수업을 시작합니다.",
  },
  {
    num: "02",
    title: "코드로 입장",
    desc: "앱 설치 없이 고유 코드 하나로 학생이 즉시 연결됩니다.",
  },
  {
    num: "03",
    title: "라이브 수업",
    desc: "채팅, 투표, 활동지로 아이들과 함께 생동감 있는 수업을 진행합니다.",
  },
];

/* ─── Page ───────────────────────────────────────────────────── */

export default function Home() {
  return (
    <main className="overflow-x-hidden bg-white">

      {/* ── Nav ── */}
      <header className="sticky top-0 z-30 border-b border-zinc-100 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600">
              <Radio className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-xl font-black tracking-tighter text-zinc-950">
              클래스<span className="text-rose-600">캐스트</span>
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/teacher/login"
              className="hidden text-sm font-semibold text-zinc-500 transition-colors hover:text-zinc-900 sm:block"
            >
              교사 로그인
            </Link>
            <Link
              href="/join"
              className="rounded-xl bg-zinc-950 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-zinc-950/20 transition-all hover:bg-zinc-800 active:scale-[0.98]"
            >
              학생 입장하기
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero — Split Screen ── */}
      <section className="grid min-h-[100dvh] grid-cols-1 lg:grid-cols-2">

        {/* Left: copy */}
        <div className="flex flex-col justify-center px-8 py-24 lg:px-16 lg:py-0 xl:px-24">
          <div className="mb-8 inline-flex w-fit items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />
            아이들을 위한 라이브 수업 플랫폼
          </div>

          <h1 className="text-5xl font-black leading-[1.05] tracking-[-0.04em] text-zinc-950 sm:text-6xl xl:text-[4.5rem]">
            아이들과<br />
            함께하는<br />
            <span className="text-rose-600">라이브 수업</span>
          </h1>

          <p className="mt-7 max-w-sm text-lg leading-relaxed text-zinc-500">
            선생님이 방송을 시작하면 학생들이 실시간으로 참여합니다. 채팅, 투표, 활동지로 수업이 살아납니다.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/teacher/login"
              className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-rose-600/25 transition-all hover:-translate-y-0.5 hover:bg-rose-500 active:scale-[0.98]"
            >
              <Radio className="h-4 w-4" />
              방송 시작하기
            </Link>
            <Link
              href="/join"
              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-8 py-4 text-base font-bold text-zinc-700 transition-all hover:border-zinc-300 hover:bg-zinc-50"
            >
              학생 입장하기
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap gap-6 text-sm text-zinc-400">
            {["무료로 시작", "앱 설치 불필요", "실시간 동기화"].map((t) => (
              <span key={t} className="flex items-center gap-1.5 font-medium">
                <svg className="h-4 w-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Right: 3D mockup */}
        <div className="relative flex items-center justify-center bg-zinc-950 px-6 py-16 lg:px-12">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-32 top-1/2 h-[600px] w-[600px] -translate-y-1/2 rounded-full bg-rose-600/6 blur-[140px]" />
            <div className="absolute -left-20 bottom-1/4 h-[300px] w-[300px] rounded-full bg-indigo-600/4 blur-[100px]" />
          </div>
          <HeroMockup />
        </div>
      </section>

      {/* ── Features — Asymmetric grid ── */}
      <section className="bg-zinc-50 py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6">

          {/* Left-aligned header */}
          <div className="mb-16 max-w-xl">
            <div className="mb-3 text-xs font-bold uppercase tracking-widest text-rose-600">주요 기능</div>
            <h2 className="text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">
              수업을 방송으로
            </h2>
            <p className="mt-4 text-lg text-zinc-500">
              라이브 방송의 역동성을 교실로 가져옵니다.
            </p>
          </div>

          {/* Row 1: 2-col wide + 1-col */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div className="group relative overflow-hidden rounded-3xl bg-zinc-950 p-8 text-white md:col-span-2">
              <div className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 rounded-full bg-rose-600/12 blur-2xl" />
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-rose-600/20">
                <MonitorPlay className="h-6 w-6 text-rose-400" strokeWidth={1.5} />
              </div>
              <div className="text-xl font-black">라이브 방송 수업</div>
              <div className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-400">
                선생님이 방송을 시작하면 학생들이 실시간으로 참여합니다. 앱 설치 없이 코드 하나로 즉시 입장. 방송 중 모든 상호작용이 실시간으로 동기화됩니다.
              </div>
              <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-rose-400">
                방송 시작하기
                <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-7 transition-all hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/10">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50">
                <MessageSquare className="h-6 w-6 text-indigo-600" strokeWidth={1.5} />
              </div>
              <div className="text-lg font-black text-zinc-900">실시간 채팅</div>
              <div className="mt-2 text-sm leading-relaxed text-zinc-500">
                방송 중 학생과 교사가 자유롭게 소통합니다. 익명 모드와 메시지 고정 기능 지원.
              </div>
            </div>
          </div>

          {/* Row 2: 1-col + 2-col wide */}
          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
            <div className="group relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-7 transition-all hover:-translate-y-1 hover:border-amber-200 hover:shadow-lg hover:shadow-amber-500/10">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50">
                <BarChart2 className="h-6 w-6 text-amber-600" strokeWidth={1.5} />
              </div>
              <div className="text-lg font-black text-zinc-900">즉석 투표</div>
              <div className="mt-2 text-sm leading-relaxed text-zinc-500">
                O/X, 객관식으로 학생의 즉각적인 반응을 수집합니다.
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-7 transition-all hover:-translate-y-1 hover:border-violet-200 hover:shadow-lg hover:shadow-violet-500/10 md:col-span-2">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50">
                <FileText className="h-6 w-6 text-violet-600" strokeWidth={1.5} />
              </div>
              <div className="text-lg font-black text-zinc-900">활동지 공유 & 중계</div>
              <div className="mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
                학생의 답안을 선별해 방송 화면에 공개하고 실시간 반응을 수집합니다. 타이머로 활동 시간을 제어하고 전체 또는 학생별로 입력을 잠글 수 있습니다.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="bg-white py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-3 text-xs font-bold uppercase tracking-widest text-rose-600">시작하기</div>
            <h2 className="text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">
              3단계면 충분합니다
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.num} className="relative rounded-2xl bg-zinc-950 p-8 text-white">
                {i < STEPS.length - 1 && (
                  <div className="absolute -right-3 top-1/2 hidden -translate-y-1/2 sm:block">
                    <ChevronRight className="h-6 w-6 text-zinc-600" />
                  </div>
                )}
                <div className="mb-5 font-mono text-4xl font-black text-rose-600/40">{step.num}</div>
                <div className="text-xl font-black text-white">{step.title}</div>
                <div className="mt-3 text-sm leading-relaxed text-zinc-400">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-rose-600 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
            지금 방송을 시작하세요
          </h2>
          <p className="mt-5 text-lg font-medium text-rose-100">
            별도의 설치 없이, 무료로, 즉시 시작할 수 있습니다.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/teacher/login"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-bold text-rose-700 shadow-xl shadow-rose-900/20 transition-all hover:-translate-y-0.5 hover:bg-rose-50"
            >
              <Radio className="h-4 w-4" />
              방송 시작하기
            </Link>
            <Link
              href="/join"
              className="rounded-2xl border border-rose-400/40 bg-white/10 px-8 py-4 text-base font-bold text-white backdrop-blur transition-all hover:bg-white/20"
            >
              학생 입장하기
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-zinc-950 py-14">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-wrap items-start justify-between gap-10">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600">
                  <Radio className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                </div>
                <div className="text-xl font-black text-white">
                  클래스<span className="text-rose-500">캐스트</span>
                </div>
              </div>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-500">
                아이들과 함께하는 라이브 수업 플랫폼
              </p>
            </div>
            <div className="flex gap-16">
              <div className="space-y-4">
                <div className="text-[11px] font-bold uppercase tracking-widest text-zinc-600">서비스</div>
                <div className="flex flex-col gap-3">
                  <Link href="/join" className="text-sm font-medium text-zinc-400 transition-colors hover:text-white">학생 입장</Link>
                  <Link href="/teacher/login" className="text-sm font-medium text-zinc-400 transition-colors hover:text-white">교사 로그인</Link>
                  <Link href="/teacher/worksheets" className="text-sm font-medium text-zinc-400 transition-colors hover:text-white">활동지 센터</Link>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/8 pt-8">
            <p className="text-xs text-zinc-600">© 2025 클래스캐스트. All rights reserved.</p>
          </div>
        </div>
      </footer>

    </main>
  );
}
