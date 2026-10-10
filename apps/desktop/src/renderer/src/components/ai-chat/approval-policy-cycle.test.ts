/**
 * Shift+Tab 只在读取 / 编辑之间切；全部回落到读取。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { cyclePermissionMode } from "./approval-policy.ts"

const dir = dirname(fileURLToPath(import.meta.url))

const t = (path: string) => {
  if (path === "chat.approvalReads") return "读取"
  if (path === "chat.approvalEdits") return "编辑"
  if (path === "chat.approvalAll") return "全部"
  if (path === "common.permissionCustom") return "自定义"
  return path
}

test("循环到不了全部，从全部回到读取", () => {
  assert.equal(cyclePermissionMode("allow-reads"), "allow-edits")
  assert.equal(cyclePermissionMode("allow-edits"), "allow-reads")
  assert.equal(cyclePermissionMode("allow-all"), "allow-reads")
  assert.notEqual(cyclePermissionMode("allow-reads"), "allow-all")
  assert.notEqual(cyclePermissionMode("allow-edits"), "allow-all")
})

test("三档芯片都有文案，包括全部", () => {
  const toggle = readFileSync(join(dir, "approval-policy-toggle.tsx"), "utf8")
  const menu = readFileSync(join(dir, "approval-policy-menu.tsx"), "utf8")
  assert.match(toggle, /kind === "custom" \? t\("common\.permissionCustom"\) : titleCase\(kind, t\)/)
  assert.doesNotMatch(toggle, /kind === "allow-all" \? null/)
  assert.match(menu, /return t\("chat\.approvalAll"\)/)
  assert.match(menu, /if \(kind === "allow-reads"\) return t\("chat\.approvalReads"\)/)
  assert.match(menu, /if \(kind === "allow-edits"\) return t\("chat\.approvalEdits"\)/)
  assert.equal(t("chat.approvalAll"), "全部")
})
