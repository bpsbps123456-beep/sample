import { StudentJoinForm } from "@/components/student/student-join-form";

export default function JoinPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#0f172a_0%,#020617_40%,#064e3b_100%)] animate-aurora relative overflow-hidden">
      {/* Decorative Blur Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-6 py-12 lg:grid-cols-[1fr_480px]">

        {/* Left — branding/info */}
        <div className="text-white animate-in fade-in slide-in-from-left-8 duration-1000">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-400/10 px-4 py-2 text-[13px] font-black uppercase tracking-[0.2em] text-teal-300">
            클래스<span className="text-white">ON</span> · 학생 입장
          </div>
          <h1 className="mt-8 text-5xl font-black tracking-[-0.04em] leading-[1.1] sm:text-7xl">
            수업에<br />
            <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">참여하세요</span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-400 max-w-md font-medium">
            선생님이 알려준 6자리 코드와 이름을 입력하면<br className="hidden sm:block" />
            번거로운 가입 없이 바로 수업에 합류합니다.
          </p>
          
          <div className="mt-12 space-y-5">
            {[
              { num: "01", text: "6자리 코드 입력", sub: "교실 입장 코드" },
              { num: "02", text: "이름 입력 후 입장", sub: "실명 권장" },
              { num: "03", text: "수업 시작까지 대기", sub: "실시간 동기화" },
            ].map((step, i) => (
              <div key={step.num} 
                className="flex items-center gap-5 group transition-transform hover:translate-x-2"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-teal-400/20 bg-teal-400/5 text-sm font-black text-teal-400 transition-colors group-hover:bg-teal-400/20 group-hover:text-white">
                  {step.num}
                </div>
                <div>
                  <div className="text-base font-bold text-slate-200">{step.text}</div>
                  <div className="text-[12px] font-semibold text-slate-500 tracking-wide uppercase">{step.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — form */}
        <div className="glass-panel rounded-[32px] p-8 md:p-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
          <div className="mb-8">
            <div className="muted-label text-teal-400 font-black">LOGIN</div>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white leading-tight">수업 입장을 위해<br/>정보를 확인해주세요</h2>
          </div>
          <StudentJoinForm defaultCode="AB1234" />
          
          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-xs font-semibold text-slate-500 tracking-wide">
              REAL-TIME LEARNING PLATFORM
            </p>
          </div>
        </div>

      </div>
    </main>
  );
}
