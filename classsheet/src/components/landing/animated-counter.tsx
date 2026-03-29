'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

interface CounterProps {
  end: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  label: string;
  description: string;
}

function Counter({ end, suffix = '', prefix = '', duration = 2, label, description }: CounterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const step = end / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [isInView, end, duration]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="text-center"
    >
      <div className="text-5xl font-black tracking-tight text-zinc-950 sm:text-6xl">
        {prefix}{count.toLocaleString()}{suffix}
      </div>
      <div className="mt-2 text-base font-bold text-rose-600">{label}</div>
      <div className="mt-1 text-sm text-zinc-400">{description}</div>
    </motion.div>
  );
}

const STATS = [
  { end: 2400, suffix: '+', label: '활성 학생', description: '매일 수업에 참여하는 학생' },
  { end: 150, suffix: '+', label: '등록 교사', description: '클래스캐스트를 사용하는 선생님' },
  { end: 98, suffix: '%', label: '만족도', description: '교사 대상 설문 결과' },
  { end: 5000, suffix: '+', label: '진행된 수업', description: '누적 라이브 수업 횟수' },
];

export function StatsSection() {
  return (
    <section className="border-y border-zinc-100 bg-white py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4 md:gap-8">
          {STATS.map((stat) => (
            <Counter key={stat.label} {...stat} />
          ))}
        </div>
      </div>
    </section>
  );
}
