"use client";

import { useClassroomStore } from "@/lib/store/classroom-store";

export function GroupSelectorPreview() {
  const groups = useClassroomStore((state) => state.groups);
  const sessionMode = useClassroomStore((state) => state.sessionMode);
  const joinGroup = useClassroomStore((state) => state.joinGroup);

  return (
    <section className="surface rounded-2xl p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-sm font-medium text-slate-500">모둠 선택 화면</div>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950">이름 입력 후 모둠을 선택하는 흐름</h2>
        </div>
        <div className="rounded-full bg-teal-50 px-4 py-2 text-sm font-semibold text-slate-700">현재 모드: {sessionMode}</div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {groups.map((group) => (
          <button
            key={group.id}
            onClick={() => joinGroup(group.id)}
            className="rounded-2xl bg-slate-50 p-5 text-left ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="flex items-center gap-3">
              <div className="text-3xl">{group.icon}</div>
              <div>
                <div className="text-xl font-semibold text-slate-900">{group.name}</div>
                <div className="text-sm text-slate-500">현재 {group.count}명</div>
              </div>
            </div>
            <div className="mt-4 rounded-xl bg-white px-4 py-3 text-sm text-slate-600">
              클릭하면 학생 직접 선택 흐름을 시뮬레이션하며 인원을 반영합니다.
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
