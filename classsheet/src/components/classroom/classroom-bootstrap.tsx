"use client";

import { useEffect } from "react";

import { useClassroomStore } from "@/lib/store/classroom-store";
import type { Worksheet } from "@/lib/types/domain";

interface ClassroomBootstrapProps {
  worksheet: Worksheet;
}

export function ClassroomBootstrap({ worksheet }: ClassroomBootstrapProps) {
  const initializeFromWorksheet = useClassroomStore(
    (state) => state.initializeFromWorksheet,
  );

  useEffect(() => {
    initializeFromWorksheet(worksheet);
  }, [initializeFromWorksheet, worksheet]);

  return null;
}
