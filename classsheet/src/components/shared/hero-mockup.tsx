'use client';

import { useRef, useCallback } from 'react';
import { BarChart2, FileText } from 'lucide-react';

const MOCK_STUDENTS = [
  { name: '지우', bg: 'bg-violet-500' },
  { name: '민준', bg: 'bg-sky-500' },
  { name: '서연', bg: 'bg-amber-500' },
  { name: '현우', bg: 'bg-emerald-500' },
  { name: '수아', bg: 'bg-rose-400' },
  { name: '태양', bg: 'bg-orange-500' },
];

const MOCK_CHAT = [
  { name: '지우', msg: '잘 들려요!' },
  { name: '민준', msg: '재미있어요' },
  { name: '서연', msg: '손들기 눌렀어요' },
];

export function HeroMockup() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    const card = cardRef.current;
    const glow = glowRef.current;
    const shadow = shadowRef.current;
    if (!container || !card) return;

    const rect = container.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width;
    const yPct = (e.clientY - rect.top) / rect.height;
    const x = xPct - 0.5;
    const y = yPct - 0.5;

    card.style.transform = `rotateX(${-y * 18}deg) rotateY(${x * 18}deg) translateZ(20px)`;
    card.style.transition = 'transform 0.12s ease-out';

    if (glow) {
      glow.style.background = `radial-gradient(circle at ${xPct * 100}% ${yPct * 100}%, rgba(225,29,72,0.18) 0%, transparent 65%)`;
      glow.style.transition = 'background 0.15s ease-out';
    }

    if (shadow) {
      const sx = x * 24;
      const sy = y * 24 + 28;
      shadow.style.transform = `translateX(${sx}px) translateY(${sy}px) scaleX(${1 - Math.abs(x) * 0.2})`;
      shadow.style.transition = 'transform 0.12s ease-out';
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    const glow = glowRef.current;
    const shadow = shadowRef.current;
    if (!card) return;

    card.style.transform = 'rotateX(6deg) rotateY(-14deg) translateZ(0px)';
    card.style.transition = 'transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)';

    if (glow) {
      glow.style.background = 'radial-gradient(circle at 70% 35%, rgba(225,29,72,0.10) 0%, transparent 60%)';
      glow.style.transition = 'background 0.6s ease-out';
    }

    if (shadow) {
      shadow.style.transform = 'translateX(12px) translateY(28px) scaleX(0.88)';
      shadow.style.transition = 'transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)';
    }
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative flex w-full max-w-[420px] select-none items-center justify-center py-10"
      style={{ perspective: '1100px', perspectiveOrigin: 'center 40%' }}
    >
      {/* Ambient glow that tracks the mouse */}
      <div
        ref={glowRef}
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 70% 35%, rgba(225,29,72,0.10) 0%, transparent 60%)',
        }}
      />

      {/* Dynamic shadow beneath the card */}
      <div
        ref={shadowRef}
        className="pointer-events-none absolute bottom-4 left-1/2 h-8 w-4/5 -translate-x-1/2 rounded-full bg-black/50 blur-2xl"
        style={{ transform: 'translateX(12px) translateY(28px) scaleX(0.88)' }}
      />

      {/* 3D card wrapper — CSS float animation + JS-driven rotation */}
      <div className="w-full" style={{ animation: 'heroFloat 5s ease-in-out infinite' }}>
        <div
          ref={cardRef}
          style={{
            transform: 'rotateX(6deg) rotateY(-14deg) translateZ(0px)',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
            willChange: 'transform',
          }}
          className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl shadow-black/70"
        >
          {/* Inner top-edge highlight — simulates light hitting the card rim */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {/* ── Top bar ── */}
          <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-1.5 rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                LIVE
              </span>
              <span className="text-xs font-medium text-zinc-400">학생 24명 시청 중</span>
            </div>
            <span className="font-mono text-[11px] text-zinc-500">00:23:14</span>
          </div>

          <div className="flex">
            {/* ── Main area ── */}
            <div className="flex-1 p-4">
              {/* Teacher video */}
              <div className="relative mb-3 flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-zinc-800">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-600 text-sm font-bold text-zinc-200">
                    김선생
                  </div>
                  <span className="text-[11px] text-zinc-400">3학년 2반 수학</span>
                </div>
                <div className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
                  김○○ 선생님
                </div>
                <div className="absolute top-2 right-2 h-2 w-2 animate-pulse rounded-full bg-rose-500" />
                {/* Subtle inner glow on video frame */}
                <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/5" />
              </div>

              {/* Student thumbnails */}
              <div className="grid grid-cols-6 gap-1.5">
                {MOCK_STUDENTS.map((s) => (
                  <div
                    key={s.name}
                    className={`${s.bg} flex aspect-square items-center justify-center rounded-lg text-[10px] font-bold text-white`}
                  >
                    {s.name[0]}
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="mt-3 flex gap-2">
                <div className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-zinc-800 text-[11px] font-medium text-zinc-300">
                  <BarChart2 className="h-3 w-3" />
                  투표
                </div>
                <div className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-zinc-800 text-[11px] font-medium text-zinc-300">
                  <FileText className="h-3 w-3" />
                  활동지
                </div>
              </div>
            </div>

            {/* ── Chat panel ── */}
            <div className="flex w-[120px] flex-col border-l border-white/8">
              <div className="border-b border-white/8 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                채팅
              </div>
              <div className="flex-1 space-y-2.5 overflow-hidden px-3 py-3">
                {MOCK_CHAT.map((c, i) => (
                  <div key={i} className="space-y-0.5">
                    <div className="text-[10px] font-bold text-zinc-400">{c.name}</div>
                    <div className="text-[11px] leading-tight text-zinc-300">{c.msg}</div>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/8 p-2">
                <div className="rounded-lg bg-zinc-800 px-2.5 py-2 text-[10px] text-zinc-500">
                  메시지 입력...
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
