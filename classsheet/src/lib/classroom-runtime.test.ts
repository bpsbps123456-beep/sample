import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAnonymousLabel,
  countCompletedAnswers,
  getPageAccessState,
  restoreActiveVote,
} from "@/lib/classroom-runtime";
import type { WorksheetComponent } from "@/lib/types/domain";

const components: WorksheetComponent[] = [
  {
    id: "prompt-1",
    type: "prompt",
    page: 1,
    title: "안내",
    body: "안내 문구",
  },
  {
    id: "q1",
    type: "short_text",
    page: 1,
    title: "질문 1",
  },
  {
    id: "q2",
    type: "multi_choice",
    page: 2,
    title: "질문 2",
    options: ["A", "B"],
  },
];

test("countCompletedAnswers ignores prompts and counts filled answers", () => {
  assert.equal(
    countCompletedAnswers(components, {
      q1: "답안",
      q2: ["A"],
    }),
    2,
  );
});

test("getPageAccessState returns the expected visibility state", () => {
  assert.equal(getPageAccessState(1, 2), "past");
  assert.equal(getPageAccessState(2, 2), "current");
  assert.equal(getPageAccessState(3, 2), "future");
});

test("buildAnonymousLabel generates stable friend labels", () => {
  assert.equal(buildAnonymousLabel(0), "친구 1");
  assert.equal(buildAnonymousLabel(3), "친구 4");
});

test("restoreActiveVote returns only active votes", () => {
  assert.equal(
    restoreActiveVote({
      id: "vote-1",
      type: "choice",
      question: "질문",
      options: ["A", "B"],
      isResultPublic: true,
      isActive: true,
    })?.question,
    "질문",
  );
  assert.equal(
    restoreActiveVote({
      id: "vote-2",
      type: "choice",
      question: "종료된 투표",
      options: ["A", "B"],
      isResultPublic: true,
      isActive: false,
    }),
    null,
  );
});
