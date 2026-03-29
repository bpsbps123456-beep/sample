import Link from "next/link";
import {
  Radio,
  MessageSquare,
  BarChart2,
  FileText,
  ChevronRight,
  MonitorPlay,
  Zap,
  Shield,
  Smartphone,
} from "lucide-react";
import { HeroMockup } from "@/components/shared/hero-mockup";
import { HeroText } from "@/components/landing/hero-text";
import { ScrollProgress } from "@/components/landing/scroll-progress";
import { StatsSection } from "@/components/landing/animated-counter";
import { FeaturesSection } from "@/components/landing/features";
import { StepsSection } from "@/components/landing/steps";
import { TestimonialsSection } from "@/components/landing/testimonials";
import { FaqSection } from "@/components/landing/faq";
import { FloatingParticles } from "@/components/landing/floating-particles";
import { CtaSection } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";

/* ─── Page ───────────────────────────────────────────────────── */

export default function Home() {
  return (
    <main className="overflow-x-hidden bg-white">
      <ScrollProgress />
      <Navbar />

      {/* ── Hero — Split Screen ── */}
      <section className="relative grid min-h-[100dvh] grid-cols-1 lg:grid-cols-2">
        {/* Left: copy */}
        <div className="flex flex-col justify-center px-8 py-24 lg:px-16 lg:py-0 xl:px-24">
          <HeroText />
        </div>

        {/* Right: 3D mockup */}
        <div className="relative flex items-center justify-center bg-zinc-950 px-6 py-16 lg:px-12">
          <FloatingParticles />
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-32 top-1/2 h-[600px] w-[600px] -translate-y-1/2 rounded-full bg-rose-600/6 blur-[140px]" />
            <div className="absolute -left-20 bottom-1/4 h-[300px] w-[300px] rounded-full bg-indigo-600/4 blur-[100px]" />
          </div>
          <HeroMockup />
        </div>
      </section>

      {/* ── Highlights strip ── */}
      <section className="border-y border-zinc-100 bg-zinc-50/50">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-8 px-6 py-6 sm:gap-16">
          {[
            { icon: Zap, text: "실시간 동기화" },
            { icon: Shield, text: "보안 접속" },
            { icon: Smartphone, text: "앱 설치 불필요" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2.5 text-sm font-semibold text-zinc-500">
              <Icon className="h-4 w-4 text-rose-500" strokeWidth={2} />
              {text}
            </div>
          ))}
        </div>
      </section>

      <StatsSection />
      <FeaturesSection />
      <StepsSection />
      <TestimonialsSection />
      <FaqSection />
      <CtaSection />
      <Footer />
    </main>
  );
}
