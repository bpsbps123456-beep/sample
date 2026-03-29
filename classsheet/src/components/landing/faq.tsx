'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { ScrollReveal, StaggerContainer, StaggerItem } from './scroll-reveal';

const FAQ_ITEMS = [
  {
    q: '클래스캐스트는 무료인가요?',
    a: '네, 클래스캐스트는 완전 무료입니다. 별도의 결제나 구독 없이 모든 기능을 자유롭게 사용할 수 있습니다.',
  },
  {
    q: '학생들이 앱을 설치해야 하나요?',
    a: '아니요. 학생들은 웹 브라우저에서 참여 코드만 입력하면 즉시 수업에 참여할 수 있습니다. 별도의 앱 설치가 필요 없습니다.',
  },
  {
    q: '한 수업에 몇 명까지 참여할 수 있나요?',
    a: '현재 한 수업당 최대 40명의 학생이 동시에 참여할 수 있습니다. 실시간 채팅, 투표, 활동지 모두 동시 참여가 가능합니다.',
  },
  {
    q: '어떤 기기에서 사용할 수 있나요?',
    a: '데스크톱, 노트북, 태블릿, 스마트폰 등 웹 브라우저가 있는 모든 기기에서 사용 가능합니다. 크롬, 사파리, 엣지 등 최신 브라우저를 지원합니다.',
  },
  {
    q: '수업 자료를 미리 준비할 수 있나요?',
    a: '네, 활동지와 투표를 미리 작성해두고 방송 중에 원하는 타이밍에 공개할 수 있습니다. 수업 흐름에 맞춰 유연하게 활용하세요.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-zinc-200 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-6 text-left"
        aria-expanded={open}
      >
        <span className="pr-8 text-base font-bold text-zinc-900">{q}</span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="shrink-0"
        >
          <ChevronDown className="h-5 w-5 text-zinc-400" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-sm leading-relaxed text-zinc-500">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FaqSection() {
  return (
    <section className="bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-3xl px-6">
        <ScrollReveal className="mb-16 text-center">
          <div className="mb-3 text-xs font-bold uppercase tracking-widest text-rose-600">
            FAQ
          </div>
          <h2 className="text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">
            자주 묻는 질문
          </h2>
        </ScrollReveal>

        <StaggerContainer staggerDelay={0.08}>
          {FAQ_ITEMS.map((item) => (
            <StaggerItem key={item.q}>
              <FaqItem {...item} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
