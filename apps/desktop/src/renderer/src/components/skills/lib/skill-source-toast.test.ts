/**
 * toast 只分 updated / missed，文案走 t()，不带错误原文。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { skillSourceToastMessage } from "./skill-source-toast.ts"

test("showSkillSourceToast 文案只含 kind 与 count", () => {
  const t = (path: string, vars?: Record<string, string | number>) =>
    path === "settings.skillSources.toastUpdated" ? `updated:${vars?.count}` : "missed"
  assert.equal(skillSourceToastMessage("updated", 3, t), "updated:3")
  assert.equal(skillSourceToastMessage("missed", 0, t), "missed")
})
