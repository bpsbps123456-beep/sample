import Link from "next/link";

const FEATURES = [
  {
    icon: "⏱",
    title: "타이머",
    desc: "카운트다운으로 활동 시간을 제어하고, 시간 종료 시 자동 잠금까지 한 번에.",
    color: "teal",
  },
  {
    icon: "💬",
    title: "실시간 채팅",
    desc: "학생·교사 양방향 소통. 익명 모드, 메시지 고정, 일시정지 기능 지원.",
    color: "indigo",
  },
  {
    icon: "🖼",
    title: "활동지 공유",
    desc: "학생 답안을 선별해 화면에 공개하고 실시간 반응을 수집합니다.",
    color: "violet",
  },
  {
    icon: "📊",
    title: "즉석 투표",
    desc: "O/X, 객관식, 슬라이더, 워드클라우드로 즉각적인 의견을 수집합니다.",
    color: "amber",
  },
  {
    icon: "🔒",
    title: "쓰기 잠금",
    desc: "전체 또는 학생별로 입력을 제어해 집중 시간을 만들어냅니다.",
    color: "rose",
  },
  {
    icon: "📋",
    title: "템플릿 저장",
    desc: "자주 쓰는 활동지를 템플릿으로 저장하고 다음 수업에 바로 재사용.",
    color: "sky",
  },
];

const STEPS = [
  {
    num: "01",
    title: "활동지 제작",
    desc: "텍스트, 선택지, 그림 그리기 등 다양한 형식의 문항을 드래그 없이 빠르게 구성합니다.",
  },
  {
    num: "02",
    title: "코드로 입장",
    desc: "앱 설치 없이 고유 코드 하나로 학생이 즉시 연결됩니다.",
  },
  {
    num: "03",
    title: "실시간 대시보드",
    desc: "학생 답변·참여 현황을 한눈에 보며 수업 흐름을 자유롭게 조율합니다.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white">

      {/* ── Nav ── */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl font-black tracking-tighter text-slate-950">
              클래스<span className="text-teal-600">ON</span>
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/teacher/login"
              className="hidden text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors sm:block"
            >
              교사 로그인
            </Link>
            <Link
              href="/join"
              className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-950/20 hover:bg-slate-800 transition-all"
            >
              학생 입장하기
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-white">
        {/* bg decoration */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-teal-500/6 blur-[120px]" />
          <div className="absolute top-1/3 -right-32 h-[400px] w-[400px] rounded-full bg-indigo-500/5 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-24 text-center lg:pb-32 lg:pt-36">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-bold text-teal-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-500" />
            실시간 수업 플랫폼
          </div>

          <h1 className="mt-8 text-5xl font-black leading-[1.05] tracking-[-0.04em] text-slate-950 sm:text-6xl lg:text-7xl xl:text-8xl">
            모든 수업을<br />
            <span className="bg-gradient-to-r from-teal-500 to-emerald-600 bg-clip-text text-transparent">
              실시간으로
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-slate-500 sm:text-xl">
            활동지 배포부터 실시간 소통까지.<br className="hidden sm:block" />
            교사와 학생이 하나의 공간에서 연결됩니다.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/teacher/login"
              className="rounded-2xl bg-teal-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-teal-600/30 hover:bg-teal-500 transition-all hover:-translate-y-0.5"
            >
              교사로 시작하기 →
            </Link>
            <Link
              href="/join"
              className="rounded-2xl border border-slate-200 bg-white px-8 py-4 text-base font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all"
            >
              학생 입장하기
            </Link>
          </div>

          {/* Trust badges */}
          <div className="mt-14 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
            {["무료로 시작", "앱 설치 불필요", "실시간 동기화"].map((t) => (
              <span key={t} className="flex items-center gap-1.5 font-medium">
                <svg className="h-4 w-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>


      {/* ── Features ── */}
      <section className="bg-slate-50 py-24 lg:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-3 text-xs font-bold uppercase tracking-widest text-teal-600">주요 기능</div>
            <h2 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              수업에 필요한 모든 것
            </h2>
            <p className="mt-4 text-lg text-slate-500">복잡한 설정 없이 바로 시작할 수 있습니다.</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-7 transition-all hover:-translate-y-1 hover:border-teal-200 hover:shadow-lg hover:shadow-teal-500/10"
              >
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-2xl transition-colors group-hover:bg-teal-50">
                  {f.icon}
                </div>
                <div className="text-lg font-black text-slate-900">{f.title}</div>
                <div className="mt-2 text-sm leading-relaxed text-slate-500">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="bg-white py-24 lg:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <div className="mb-3 text-xs font-bold uppercase tracking-widest text-teal-600">시작하기</div>
            <h2 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              3단계면 충분합니다
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.num} className="relative rounded-2xl bg-slate-950 p-8 text-white">
                {i < STEPS.length - 1 && (
                  <div className="absolute -right-3 top-1/2 hidden -translate-y-1/2 sm:block">
                    <svg className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
                <div className="mb-5 text-4xl font-black text-teal-500/40">{step.num}</div>
                <div className="text-xl font-black text-white">{step.title}</div>
                <div className="mt-3 text-sm leading-relaxed text-slate-400">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-teal-600 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
            지금 바로 시작해 보세요
          </h2>
          <p className="mt-5 text-lg font-medium text-teal-100">
            별도의 설치 없이, 무료로, 즉시 사용할 수 있습니다.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/teacher/login"
              className="rounded-2xl bg-white px-8 py-4 text-base font-bold text-teal-700 shadow-xl shadow-teal-900/20 hover:bg-teal-50 transition-all hover:-translate-y-0.5"
            >
              교사로 시작하기 →
            </Link>
            <Link
              href="/join"
              className="rounded-2xl border border-teal-400/40 bg-white/10 px-8 py-4 text-base font-bold text-white backdrop-blur hover:bg-white/20 transition-all"
            >
              학생 입장하기
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-950 py-14">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-wrap items-start justify-between gap-10">
            <div>
              <div className="text-2xl font-black text-white">
                클래스<span className="text-teal-500">ON</span>
              </div>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-500">
                교사와 학생이 하나의 공간에서 연결되는 실시간 수업 플랫폼
              </p>
            </div>
            <div className="flex gap-16">
              <div className="space-y-4">
                <div className="text-[11px] font-bold uppercase tracking-widest text-slate-600">서비스</div>
                <div className="flex flex-col gap-3">
                  <Link href="/join" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">학생 입장</Link>
                  <Link href="/teacher/login" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">교사 로그인</Link>
                  <Link href="/teacher/worksheets" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">활동지 센터</Link>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-12 border-t border-white/8 pt-8 flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-slate-600">© 2025 클래스ON. All rights reserved.</p>
          </div>
        </div>
      </footer>

    </main>
  );
}
