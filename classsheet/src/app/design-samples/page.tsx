import React from "react";

export default function DesignSamplesPage() {
  return (
    <div className="min-h-screen bg-slate-100 p-8 lg:p-12 font-sans space-y-24 pb-32">
      <div className="max-w-4xl mx-auto space-y-2">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">학습지 UI 디자인 샘플</h1>
        <p className="text-lg text-slate-600">제안해드린 4가지 스타일의 미리보기입니다. 마음에 드는 스타일을 골라주세요.</p>
      </div>

      {/* =========================================================================
                                     OPTION 1 (Realism)
         ========================================================================= */}
      <section className="max-w-4xl mx-auto space-y-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <span className="bg-slate-800 text-white px-3 py-1 rounded-md text-sm">옵션 1</span>
            종이 학습지 / 리얼리즘 노트 스타일 📝
          </h2>
          <p className="text-slate-500 mt-2">전통적인 종이의 느낌을 살려, 진짜 글씨를 써야 할 것 같은 몰입감을 줍니다.</p>
        </div>

        {/* Option 1: Container */}
        <div className="rounded-sm border border-slate-300 bg-[#faf9f6] p-8 md:p-12 shadow-md space-y-10 relative">
          
          {/* Option 1: Prompt */}
          <div className="relative rounded-none border-l-[6px] border-amber-400 bg-amber-50 p-6 shadow-sm">
            <div className="absolute top-0 right-0 p-3 opacity-20">
              📌
            </div>
            <h3 className="font-bold text-amber-900 mb-2 truncate text-lg">학습 안내</h3>
            <p className="text-amber-800/80 leading-relaxed font-medium">
              오늘 배울 내용의 핵심은 '동사형 문장'입니다.<br/>
              아래 예시를 읽고 스스로 문장을 만들어보세요.
            </p>
          </div>

          {/* Option 1: Question */}
          <div>
            <div className="flex items-start gap-4">
              <span className="flex-shrink-0 mt-0.5 text-3xl font-serif font-black italic text-slate-800">1.</span>
              <div className="flex-1">
                <h3 className="text-[1.35rem] font-bold text-slate-900 leading-snug">위의 동사를 보고 동사형 문장을 생각해보세요.</h3>
                <p className="mt-2 text-slate-500 font-medium">자신의 생각을 자유롭게 적어봅시다.</p>
              </div>
            </div>
            
            <div className="mt-6 ml-10">
              {/* Note lined paper pattern */}
              <textarea
                className="w-full resize-none border-none outline-none text-xl p-0 min-h-[160px] text-slate-700 font-medium"
                style={{
                  background: 'transparent',
                  backgroundImage: 'linear-gradient(transparent 39px, #cbd5e1 40px)',
                  backgroundSize: '100% 40px',
                  lineHeight: '40px',
                }}
                defaultValue="질문하다, 고생하다 등 동사를 활용해서..."
                placeholder="여기에 답을 적어주세요..."
              ></textarea>
            </div>
          </div>
        </div>
      </section>


      {/* =========================================================================
                                     OPTION 2 (Trendy)
         ========================================================================= */}
      <section className="max-w-4xl mx-auto space-y-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <span className="bg-slate-800 text-white px-3 py-1 rounded-md text-sm">옵션 2</span>
            트렌디 / 모던 앱 스타일 📱
          </h2>
          <p className="text-slate-500 mt-2">요즘 학생들이 많이 쓰는 트렌디한 앱(토스, 당근)처럼 깔끔하고 둥글둥글한 느낌입니다.</p>
        </div>

        {/* Option 2: Container */}
        <div className="rounded-[40px] bg-white p-8 md:p-10 shadow-[0_8px_40px_rgb(0,0,0,0.06)] space-y-8">
          
          {/* Option 2: Prompt */}
          <div className="rounded-[28px] bg-gradient-to-br from-indigo-500 to-purple-500 p-8 text-white shadow-lg shadow-indigo-500/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                💡
              </div>
              <h3 className="font-bold text-xl">학습 안내</h3>
            </div>
            <p className="text-indigo-50 leading-relaxed text-lg font-medium">
              오늘 배울 내용의 핵심은 '동사형 문장'입니다.<br/>
              아래 예시를 읽고 스스로 문장을 만들어보세요.
            </p>
          </div>

          {/* Option 2: Question */}
          <div className="bg-slate-50 rounded-[32px] p-8 border border-slate-100">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center justify-center h-10 w-10 shrink-0 rounded-[14px] bg-indigo-600 text-white font-black text-lg shadow-sm shadow-indigo-600/30">
                1
              </div>
              <h3 className="text-2xl font-black tracking-tight text-slate-800">위의 동사를 보고 문장 생각하기</h3>
            </div>
            <p className="mb-5 pl-14 text-slate-500 font-medium">자신의 생각을 자유롭게 적어봅시다.</p>
            
            <div className="pl-14">
              <textarea
                className="w-full resize-none rounded-[24px] border-2 border-transparent bg-white px-6 py-5 text-xl font-medium text-slate-700 shadow-sm transition-all focus:border-indigo-400 focus:shadow-[0_0_0_6px_rgba(79,70,229,0.15)] outline-none"
                rows={4}
                defaultValue="질문하다, 고생하다 등 동사를 활용해서..."
                placeholder="답변을 입력하세요"
              ></textarea>
            </div>
          </div>
        </div>
      </section>


      {/* =========================================================================
                                     OPTION 3 (Neumorphism / BrutalPop)
         ========================================================================= */}
      <section className="max-w-4xl mx-auto space-y-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <span className="bg-slate-800 text-white px-3 py-1 rounded-md text-sm">옵션 3</span>
            팝아트 / 볼드 스타일 🎨
          </h2>
          <p className="text-slate-500 mt-2">두꺼운 테두리와 강렬한 시각적 대비로, 지루함을 없애고 마치 게임을 하는 듯한 느낌을 줍니다.</p>
        </div>

        {/* Option 3: Container */}
        <div className="rounded-3xl border-4 border-slate-900 bg-[#f4f0ea] p-8 md:p-12 space-y-10 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
          
          {/* Option 3: Prompt */}
          <div className="rounded-2xl border-4 border-slate-900 bg-teal-300 p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
            <div className="flex items-center gap-2 mb-3 border-b-4 border-slate-900 pb-2 inline-flex">
              <span className="text-xl font-black uppercase tracking-widest text-slate-900">Notice</span>
            </div>
            <p className="text-slate-900 leading-relaxed font-bold text-lg">
              오늘 배울 내용의 핵심은 '동사형 문장'입니다.<br/>
              아래 예시를 읽고 스스로 문장을 만들어보세요.
            </p>
          </div>

          {/* Option 3: Question */}
          <div className="rounded-2xl border-4 border-slate-900 bg-white p-8">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex items-center justify-center h-12 w-12 shrink-0 rounded-full border-4 border-slate-900 bg-rose-400 text-slate-900 font-black text-2xl">
                1
              </div>
              <div className="mt-1">
                <h3 className="text-xl font-black tracking-tight text-slate-900 leading-snug">위의 동사를 보고 동사형 문장 생각하기</h3>
                <p className="mt-1 text-slate-600 font-bold">자신의 생각을 자유롭게 적어봅시다.</p>
              </div>
            </div>
            
            <div className="mt-6">
              <textarea
                className="w-full resize-none rounded-xl border-4 border-slate-900 bg-amber-50 px-5 py-4 text-xl font-bold text-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] focus:translate-x-[4px] focus:translate-y-[4px] focus:shadow-none outline-none transition-all"
                rows={4}
                defaultValue="질문하다, 고생하다 등 동사를 활용해서..."
                placeholder="답변을 입력하세요"
              ></textarea>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
                                     OPTION 4 (Hybrid)
         ========================================================================= */}
      <section className="max-w-4xl mx-auto space-y-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <span className="bg-teal-600 text-white px-3 py-1 rounded-md text-sm shadow-sm shadow-teal-600/30">강력 추천!</span>
            모던 ➕ 페이퍼 (하이브리드) ✨
          </h2>
          <p className="text-slate-500 mt-2">깔끔한 모던 앱 디자인에, 정교하고 섬세한 디테일(그라데이션, 미세한 입체감)을 추가했습니다.</p>
        </div>

        {/* Hybrid: Container */}
        <div className="rounded-[32px] bg-white ring-1 ring-slate-100 p-8 md:p-10 shadow-xl shadow-slate-200/40 space-y-8">
          
          {/* Hybrid: Prompt */}
          <div className="relative overflow-hidden rounded-2xl border border-teal-100 bg-gradient-to-r from-teal-50/80 to-emerald-50/50 p-6 md:p-8">
            <div className="absolute -right-6 -top-6 text-[100px] opacity-5">📋</div>
            <div className="relative flex items-center gap-3 mb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500 text-white shadow-sm shadow-teal-500/20">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </span>
              <h3 className="font-bold text-teal-900 tracking-tight text-lg">교사 안내</h3>
            </div>
            <p className="relative text-teal-800/90 leading-relaxed text-[17px] font-medium">
              오늘 배울 내용의 핵심은 '동사형 문장'입니다.<br/>
              아래 예시를 읽고 스스로 문장을 만들어보세요.
            </p>
          </div>

          {/* Hybrid: Question */}
          <div className="relative">
            <div className="flex gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-slate-900 text-white font-bold shadow-md shadow-slate-900/20 mt-0.5">
                1
              </div>
              <div className="flex-1">
                <h3 className="text-[1.35rem] font-bold text-slate-800 leading-snug">위의 동사를 보고 동사형 문장 생각하기</h3>
                <p className="mt-1.5 text-slate-500 font-medium text-[15px]">자신의 생각을 자유롭게 적어봅시다.</p>
                
                <div className="mt-5 relative group">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100 opacity-50 pointer-events-none" />
                  <textarea
                    className="relative w-full resize-none rounded-2xl border border-slate-200 bg-transparent px-6 py-5 text-[17px] font-medium text-slate-700 shadow-inner 
                    outline-none focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-400/10 transition-all z-10"
                    rows={4}
                    defaultValue="질문하다, 고생하다 등 동사를 활용해서..."
                    placeholder="여기에 답변을 입력하세요"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
    </div>
  );
}
