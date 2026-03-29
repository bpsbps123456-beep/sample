import Link from 'next/link';
import { Radio } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-zinc-950 py-14">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-wrap items-start justify-between gap-10">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600">
                <Radio className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
              </div>
              <div className="text-xl font-black text-white">
                클래스<span className="text-rose-500">캐스트</span>
              </div>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-500">
              아이들과 함께하는 라이브 수업 플랫폼
            </p>
          </div>
          <div className="flex gap-16">
            <div className="space-y-4">
              <div className="text-[11px] font-bold uppercase tracking-widest text-zinc-600">
                서비스
              </div>
              <div className="flex flex-col gap-3">
                <Link
                  href="/join"
                  className="text-sm font-medium text-zinc-400 transition-colors hover:text-white"
                >
                  학생 입장
                </Link>
                <Link
                  href="/teacher/login"
                  className="text-sm font-medium text-zinc-400 transition-colors hover:text-white"
                >
                  교사 로그인
                </Link>
                <Link
                  href="/teacher/worksheets"
                  className="text-sm font-medium text-zinc-400 transition-colors hover:text-white"
                >
                  활동지 센터
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/8 pt-8">
          <p className="text-xs text-zinc-600">&copy; 2025 클래스캐스트. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
