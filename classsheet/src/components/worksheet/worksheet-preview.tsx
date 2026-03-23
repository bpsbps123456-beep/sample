import type { Worksheet, WorksheetComponent } from "@/lib/types/domain";

function renderComponent(component: WorksheetComponent) {
  switch (component.type) {
    case "prompt":
      return (
        <div className="rounded-2xl bg-teal-50 p-5">
          <div className="text-sm font-medium text-slate-500">{component.title}</div>
          <p className="mt-2 text-base leading-7 text-slate-700">{component.body}</p>
        </div>
      );
    case "divider":
      return <div className="h-px bg-slate-200" />;
    case "drawing":
      return <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 text-sm text-slate-500">드로잉 입력 영역</div>;
    case "single_choice":
    case "multi_choice":
      return (
        <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
          <div className="font-semibold text-slate-900">{component.title}</div>
          <div className="mt-4 flex flex-wrap gap-2">
            {component.options.map((option) => (
              <div key={option} className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">{option}</div>
            ))}
          </div>
        </div>
      );
    default:
      return (
        <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
          <div className="font-semibold text-slate-900">{component.title}</div>
          {component.description ? <p className="mt-2 text-sm text-slate-500">{component.description}</p> : null}
        </div>
      );
  }
}

interface WorksheetPreviewProps {
  worksheet: Worksheet;
}

export function WorksheetPreview({ worksheet }: WorksheetPreviewProps) {
  const currentPageComponents = worksheet.components.filter(
    (component) => component.page === worksheet.currentPage,
  );

  return (
    <section className="surface rounded-2xl p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-sm font-medium text-slate-500">학생 화면 미리보기</div>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950">{worksheet.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{worksheet.learningGoal || worksheet.description}</p>
        </div>
        <div className="flex items-center gap-3 rounded-full bg-slate-950 px-5 py-3 text-sm text-white">
          <span>페이지 {worksheet.currentPage} / {worksheet.totalPages}</span>
        </div>
      </div>
      <div className="mt-8 space-y-4">
        {currentPageComponents.map((component) => (
          <div key={component.id}>{renderComponent(component)}</div>
        ))}
      </div>
    </section>
  );
}
