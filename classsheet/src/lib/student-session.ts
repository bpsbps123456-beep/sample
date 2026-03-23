export const STUDENT_ENTRY_STORAGE_KEY = "classsheet-student-entry";

export interface StoredStudentEntry {
  sessionCode: string;
  studentName: string;
  studentToken?: string;
  submissionId?: string | null;
  authUserId?: string;
  groupId?: string | null;
}

export function readStoredStudentEntry(): StoredStudentEntry | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STUDENT_ENTRY_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredStudentEntry;
  } catch {
    return null;
  }
}

export function writeStoredStudentEntry(entry: StoredStudentEntry) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STUDENT_ENTRY_STORAGE_KEY, JSON.stringify(entry));
}

export function clearStoredStudentEntry() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STUDENT_ENTRY_STORAGE_KEY);
}
