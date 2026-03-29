'use client';

import { ChevronRight } from 'lucide-react';
import { ScrollReveal, StaggerContainer, StaggerItem } from './scroll-reveal';

const STEPS = [
  {
    num: '01',
    title: '방송 준비',
    desc: '활동지와 투표를 미리 준비하고 방송 시작 버튼 하나로 수업을 시작합니다.',
  },
  {
    num: '02',
    title: '코드로 입장',
    desc: '앱 설치 없이 고유 코드 하나로 학생이 즉시 연결됩니다.',
  },
  {
    num: '03',
    title: '라이브 수업',
    desc: '채팅, 투표, 활동지로 아이들과 함께 생동감 있는 수업을 진행합니다.',
  },
];

export function StepsSection() {
  return (
    <section className="bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <ScrollReveal className="mb-16 text-center">
          <div className="mb-3 text-xs font-bold uppercase tracking-widest text-rose-600">
            시작하기
          </div>
          <h2 className="text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">
            3단계면 충분합니다
          </h2>
        </ScrollReveal>

        <StaggerContainer staggerDelay={0.15} className="grid gap-6 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <StaggerItem key={step.num}>
              <div className="group relative h-full rounded-2xl bg-zinc-950 p-8 text-white transition-transform hover:-translate-y-1">
                {i < STEPS.length - 1 && (
                  <div className="absolute -right-3 top-1/2 hidden -translate-y-1/2 sm:block">
                    <ChevronRight className="h-6 w-6 text-zinc-600" />
                  </div>
                )}
                <div className="mb-5 font-mono text-4xl font-black text-rose-600/40 transition-colors group-hover:text-rose-600/60">
                  {step.num}
                </div>
                <div className="text-xl font-black text-white">{step.title}</div>
                <div className="mt-3 text-sm leading-relaxed text-zinc-400">{step.desc}</div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
