import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const TEACHER_SESSION_COOKIE = "classsheet_teacher_session";

export async function createTeacherSession(role: "active" | "demo" = "active") {
  const cookieStore = await cookies();

  cookieStore.set(TEACHER_SESSION_COOKIE, role, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function destroyTeacherSession() {
  const cookieStore = await cookies();
  cookieStore.delete(TEACHER_SESSION_COOKIE);
}

export async function requireTeacherSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get(TEACHER_SESSION_COOKIE)?.value;

  if (session !== "active" && session !== "demo") {
    redirect("/teacher/login");
  }
}

export async function getTeacherSessionRole(): Promise<"active" | "demo" | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(TEACHER_SESSION_COOKIE)?.value;
  if (session === "active" || session === "demo") return session;
  return null;
}
