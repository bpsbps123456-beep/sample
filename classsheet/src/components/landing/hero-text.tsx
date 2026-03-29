'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Radio } from 'lucide-react';

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

export function HeroText() {
  return (
    <motion.div variants={container} initial="hidden" animate="visible">
      <motion.div
        variants={item}
        className="mb-8 inline-flex w-fit items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700"
      >
        <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />
        아이들을 위한 라이브 수업 플랫폼
      </motion.div>

      <motion.h1
        variants={item}
        className="text-5xl font-black leading-[1.05] tracking-[-0.04em] text-zinc-950 sm:text-6xl xl:text-[4.5rem]"
      >
        아이들과
        <br />
        함께하는
        <br />
        <span className="bg-gradient-to-r from-rose-600 to-rose-400 bg-clip-text text-transparent">
          라이브 수업
        </span>
      </motion.h1>

      <motion.p
        variants={item}
        className="mt-7 max-w-sm text-lg leading-relaxed text-zinc-500"
      >
        선생님이 방송을 시작하면 학생들이 실시간으로 참여합니다. 채팅, 투표, 활동지로 수업이 살아납니다.
      </motion.p>

      <motion.div variants={item} className="mt-10 flex flex-wrap gap-4">
        <Link
          href="/teacher/login"
          className="group inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-rose-600/25 transition-all hover:-translate-y-0.5 hover:bg-rose-500 hover:shadow-2xl hover:shadow-rose-600/30 active:scale-[0.98]"
        >
          <Radio className="h-4 w-4 transition-transform group-hover:scale-110" />
          방송 시작하기
        </Link>
        <Link
          href="/join"
          className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-8 py-4 text-base font-bold text-zinc-700 transition-all hover:border-zinc-300 hover:bg-zinc-50"
        >
          학생 입장하기
        </Link>
      </motion.div>

      <motion.div
        variants={item}
        className="mt-12 flex flex-wrap gap-6 text-sm text-zinc-400"
      >
        {['무료로 시작', '앱 설치 불필요', '실시간 동기화'].map((t) => (
          <span key={t} className="flex items-center gap-1.5 font-medium">
            <svg
              className="h-4 w-4 text-rose-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {t}
          </span>
        ))}
      </motion.div>
    </motion.div>
  );
}
