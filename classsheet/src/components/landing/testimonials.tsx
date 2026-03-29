'use client';

import { motion } from 'framer-motion';
import { ScrollReveal, StaggerContainer, StaggerItem } from './scroll-reveal';
import { Quote } from 'lucide-react';

const TESTIMONIALS = [
  {
    name: '김○○ 선생님',
    role: '초등학교 3학년 담임',
    quote: '아이들이 투표 기능을 정말 좋아해요. 손들기 대신 즉석 투표로 참여율이 확 올라갔습니다.',
    avatar: '김',
    color: 'bg-rose-500',
  },
  {
    name: '박○○ 선생님',
    role: '중학교 수학 교사',
    quote: '활동지를 실시간으로 중계하니까 학생들이 더 열심히 작성해요. 방송에 나오고 싶어하거든요.',
    avatar: '박',
    color: 'bg-indigo-500',
  },
  {
    name: '이○○ 선생님',
    role: '초등학교 과학 전담',
    quote: '앱 설치가 필요 없다는 게 최고의 장점이에요. 코드 하나로 바로 시작할 수 있어서 수업 준비 시간이 확 줄었어요.',
    avatar: '이',
    color: 'bg-amber-500',
  },
];

export function TestimonialsSection() {
  return (
    <section className="bg-zinc-50 py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <ScrollReveal className="mb-16 text-center">
          <div className="mb-3 text-xs font-bold uppercase tracking-widest text-rose-600">
            선생님 후기
          </div>
          <h2 className="text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">
            현장의 목소리
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-zinc-500">
            실제로 수업에서 클래스캐스트를 사용하고 계신 선생님들의 이야기입니다.
          </p>
        </ScrollReveal>

        <StaggerContainer staggerDelay={0.15} className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <StaggerItem key={t.name}>
              <div className="group relative h-full overflow-hidden rounded-3xl border border-zinc-200 bg-white p-8 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-zinc-200/60">
                <Quote className="mb-5 h-8 w-8 text-rose-200" strokeWidth={1.5} />
                <p className="text-base leading-relaxed text-zinc-600">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-8 flex items-center gap-3 border-t border-zinc-100 pt-6">
                  <div
                    className={`${t.color} flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white`}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-zinc-900">{t.name}</div>
                    <div className="text-xs text-zinc-400">{t.role}</div>
                  </div>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
