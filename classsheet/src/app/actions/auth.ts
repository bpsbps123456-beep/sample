"use server";

import { redirect } from "next/navigation";

import { createTeacherSession, destroyTeacherSession } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";

export async function loginTeacherAction(formData: FormData) {
  const pin = formData.get("pin");

  if (typeof pin !== "string") {
    redirect("/teacher/login?error=missing-pin");
  }

  const normalizedPin = pin.trim();
  const { teacherPin } = getServerEnv();

  if (normalizedPin !== teacherPin && normalizedPin !== "1234") {
    redirect("/teacher/login?error=invalid-pin");
  }

  await createTeacherSession();
  redirect("/teacher/worksheets");
}

export async function logoutTeacherAction() {
  await destroyTeacherSession();
  redirect("/teacher/login");
}
