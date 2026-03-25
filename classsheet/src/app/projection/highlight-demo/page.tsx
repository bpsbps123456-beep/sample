import { ProjectionHighlightCanvas, type HighlightVariant } from "@/components/projection/projection-view";

const MOCK_MESSAGES = [
  {
    id: "1",
    senderName: "김민준",
    content: "지구 온난화는 인간 활동으로 인한 온실가스 배출이 주요 원인이며, 해수면 상승과 기상 이변을 일으킵니다.",
    isHighlighted: true,
    highlightedAt: "2024-01-01T00:00:01Z",
  },
  {
    id: "2",
    senderName: "이서연",
    content: "재생에너지로의 전환과 에너지 효율 개선이 탄소 중립 달성의 핵심 전략이라고 생각합니다.",
    isHighlighted: true,
    highlightedAt: "2024-01-01T00:00:02Z",
  },
  {
    id: "3",
    senderName: "박지호",
    content: "개인의 생활 습관 변화뿐 아니라 정책적 지원과 기업의 ESG 실천이 함께 이루어져야 효과적입니다.",
    isHighlighted: true,
    highlightedAt: "2024-01-01T00:00:03Z",
  },
];

const VARIANTS: { id: HighlightVariant; label: string; desc: string; bg: string }[] = [
  {
    id: "A",
    label: "A. 드라마틱 등장",
    desc: "튀어오르는 bounce 애니메이션 + 글로우 테두리 + Pick 번호 배지",
    bg: "bg-[#0d1520]",
  },
  {
    id: "B",
    label: "B. 스포트라이트 무대",
    desc: "어두운 배경 + 카드 위 빛줄기 + 슬라이드업 입장",
    bg: "bg-[#05070e]",
  },
  {
    id: "C",
    label: "C. 트로피 & 배지",
    desc: "트로피 아이콘 + 금색 이름 강조 + shimmer 빛 효과",
    bg: "bg-[#0f1015]",
  },
  {
    id: "D",
    label: "D. 컬러풀 & 에너제틱",
    desc: "네온 컬러 카드 + 별 파티클 + 무지개 테두리",
    bg: "bg-[#0d0f1a]",
  },
];

export default function HighlightDemoPage() {
  return (
    <div className="min-h-screen bg-[#080c14] py-10">
      <div className="mx-auto max-w-[1400px] px-6">
        <div className="mb-10 text-center">
          <div className="text-[13px] font-black uppercase tracking-[0.25em] text-[#6ee7db]">
            Highlight Style Preview
          </div>
          <h1 className="mt-3 text-[36px] font-black tracking-tight text-white">
            하이라이트 4가지 샘플
          </h1>
          <p className="mt-3 text-[16px] text-[#7a8cad]">
            마음에 드는 스타일을 선택하면 실제 송출 화면에 적용합니다
          </p>
        </div>

        <div className="flex flex-col gap-16">
          {VARIANTS.map(({ id, label, desc, bg }) => (
            <section key={id}>
              <div className="mb-4 flex items-end gap-4">
                <h2 className="text-[22px] font-black text-white">{label}</h2>
                <span className="mb-0.5 text-[14px] text-[#6a7ea0]">{desc}</span>
              </div>
              <div className={`overflow-hidden rounded-[28px] border border-white/8 ${bg}`}>
                <ProjectionHighlightCanvas
                  messages={MOCK_MESSAGES}
                  anonymous={false}
                  questionTitle="기후 변화 대응 방안은 무엇인가요?"
                  variant={id}
                />
              </div>
            </section>
          ))}
        </div>

        <div className="mt-16 text-center">
          <div className="inline-block rounded-[20px] border border-white/10 bg-white/5 px-8 py-5">
            <div className="text-[14px] font-bold text-[#8da0c4]">
              원하는 스타일을 선택하면 실제 하이라이트 화면에 적용해 드립니다
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
