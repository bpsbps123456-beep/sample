'use client';

import { MonitorPlay, MessageSquare, BarChart2, FileText, ChevronRight } from 'lucide-react';
import { ScrollReveal, StaggerContainer, StaggerItem } from './scroll-reveal';

export function FeaturesSection() {
  return (
    <section className="bg-zinc-50 py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <ScrollReveal className="mb-16 max-w-xl">
          <div className="mb-3 text-xs font-bold uppercase tracking-widest text-rose-600">
            주요 기능
          </div>
          <h2 className="text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">
            수업을 방송으로
          </h2>
          <p className="mt-4 text-lg text-zinc-500">
            라이브 방송의 역동성을 교실로 가져옵니다.
          </p>
        </ScrollReveal>

        {/* Row 1 */}
        <StaggerContainer staggerDelay={0.12} className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <StaggerItem className="md:col-span-2">
            <div className="group relative h-full overflow-hidden rounded-3xl bg-zinc-950 p-8 text-white transition-transform hover:-translate-y-1">
              <div className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 rounded-full bg-rose-600/12 blur-2xl transition-all group-hover:bg-rose-600/20" />
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-rose-600/20 transition-colors group-hover:bg-rose-600/30">
                <MonitorPlay className="h-6 w-6 text-rose-400" strokeWidth={1.5} />
              </div>
              <div className="text-xl font-black">라이브 방송 수업</div>
              <div className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-400">
                선생님이 방송을 시작하면 학생들이 실시간으로 참여합니다. 앱 설치 없이 코드 하나로 즉시 입장.
                방송 중 모든 상호작용이 실시간으로 동기화됩니다.
              </div>
              <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-rose-400 transition-colors group-hover:text-rose-300">
                방송 시작하기
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </StaggerItem>

          <StaggerItem>
            <div className="group relative h-full overflow-hidden rounded-3xl border border-zinc-200 bg-white p-7 transition-all hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/10">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 transition-colors group-hover:bg-indigo-100">
                <MessageSquare className="h-6 w-6 text-indigo-600" strokeWidth={1.5} />
              </div>
              <div className="text-lg font-black text-zinc-900">실시간 채팅</div>
              <div className="mt-2 text-sm leading-relaxed text-zinc-500">
                방송 중 학생과 교사가 자유롭게 소통합니다. 익명 모드와 메시지 고정 기능 지원.
              </div>
            </div>
          </StaggerItem>
        </StaggerContainer>

        {/* Row 2 */}
        <StaggerContainer staggerDelay={0.12} className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
          <StaggerItem>
            <div className="group relative h-full overflow-hidden rounded-3xl border border-zinc-200 bg-white p-7 transition-all hover:-translate-y-1 hover:border-amber-200 hover:shadow-lg hover:shadow-amber-500/10">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 transition-colors group-hover:bg-amber-100">
                <BarChart2 className="h-6 w-6 text-amber-600" strokeWidth={1.5} />
              </div>
              <div className="text-lg font-black text-zinc-900">즉석 투표</div>
              <div className="mt-2 text-sm leading-relaxed text-zinc-500">
                O/X, 객관식으로 학생의 즉각적인 반응을 수집합니다.
              </div>
            </div>
          </StaggerItem>

          <StaggerItem className="md:col-span-2">
            <div className="group relative h-full overflow-hidden rounded-3xl border border-zinc-200 bg-white p-7 transition-all hover:-translate-y-1 hover:border-violet-200 hover:shadow-lg hover:shadow-violet-500/10">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 transition-colors group-hover:bg-violet-100">
                <FileText className="h-6 w-6 text-violet-600" strokeWidth={1.5} />
              </div>
              <div className="text-lg font-black text-zinc-900">활동지 공유 & 중계</div>
              <div className="mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
                학생의 답안을 선별해 방송 화면에 공개하고 실시간 반응을 수집합니다. 타이머로 활동 시간을
                제어하고 전체 또는 학생별로 입력을 잠글 수 있습니다.
              </div>
            </div>
          </StaggerItem>
        </StaggerContainer>
      </div>
    </section>
  );
}
