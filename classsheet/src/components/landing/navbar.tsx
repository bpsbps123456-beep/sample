'use client';

import Link from 'next/link';
import { Radio } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';

export function Navbar() {
  const { scrollY } = useScroll();
  const borderOpacity = useTransform(scrollY, [0, 100], [0, 1]);

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl">
      <motion.div
        className="absolute inset-x-0 bottom-0 h-px bg-zinc-200"
        style={{ opacity: borderOpacity }}
      />
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600">
            <Radio className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-black tracking-tighter text-zinc-950">
            클래스<span className="text-rose-600">캐스트</span>
          </span>
        </Link>
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
  );
}
