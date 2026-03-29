'use client';

import Link from 'next/link';
import { Radio } from 'lucide-react';
import { ScrollReveal } from './scroll-reveal';

export function CtaSection() {
  return (
    <section className="relative overflow-hidden bg-rose-600 py-24">
      {/* 배경 장식 */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-rose-500/30 blur-[120px]" />
        <div className="absolute -bottom-32 -right-32 h-[400px] w-[400px] rounded-full bg-rose-700/40 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <ScrollReveal>
          <h2 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
            지금 방송을 시작하세요
          </h2>
          <p className="mt-5 text-lg font-medium text-rose-100">
            별도의 설치 없이, 무료로, 즉시 시작할 수 있습니다.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/teacher/login"
              className="group inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-bold text-rose-700 shadow-xl shadow-rose-900/20 transition-all hover:-translate-y-0.5 hover:bg-rose-50 hover:shadow-2xl"
            >
              <Radio className="h-4 w-4 transition-transform group-hover:scale-110" />
              방송 시작하기
            </Link>
            <Link
              href="/join"
              className="rounded-2xl border border-rose-400/40 bg-white/10 px-8 py-4 text-base font-bold text-white backdrop-blur transition-all hover:bg-white/20"
            >
              학생 입장하기
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
