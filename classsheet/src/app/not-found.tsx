import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-8">
      <div className="surface max-w-xl rounded-2xl p-8 text-center ring-1 ring-slate-200">
        <div className="text-sm font-medium uppercase tracking-[0.28em] text-slate-500">404</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-slate-950">요청한 수업을 찾을 수 없습니다</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          세션 코드가 올바른지 확인하거나 교사 대시보드에서 다시 입장 링크를 확인해 주세요.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
            홈으로 이동
          </Link>
          <Link href="/join" className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700">
            학생 입장으로 이동
          </Link>
        </div>
      </div>
    </main>
  );
}
