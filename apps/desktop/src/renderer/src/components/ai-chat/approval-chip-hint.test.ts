/**
 * 盾牌悬停白话：三档各一句，禁止工具名与工程术语。
 * 全部档用既有警告色（status-yellow），不是红底，且必须带文案。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { zh } from "../../i18n/catalogs/zh/index.ts"
import { chipHintForPolicy, toneForPolicy } from "./approval-policy.ts"

const dir = dirname(fileURLToPath(import.meta.url))
const ENGINEERING_TERM_RE =
  /\b(?:write_file|edit_file|read_file|git_commit|git_push|bash|sudo|allow-reads|allow-edits|allow-all|permissionMode|YOLO|ToolLoop|HMAC)\b|rm\s+-rf/

const HINTS = {
  "allow-reads": "读取：助手改文件或运行命令前会逐条问你",
  "allow-edits": "编辑：助手可直接改文件，运行命令前仍会问你",
  "allow-all": "全部：助手可直接改文件、运行命令，不再逐条问你"
} as const

test("三档悬停白话钉死，且不含工程术语", () => {
  const chat = zh.chat as Record<string, string>
  assert.equal(chat.approvalChipHintReads, HINTS["allow-reads"])
  assert.equal(chat.approvalChipHintEdits, HINTS["allow-edits"])
  assert.equal(chat.approvalChipHintAll, HINTS["allow-all"])
  assert.equal(chipHintForPolicy("allow-reads"), "chat.approvalChipHintReads")
  assert.equal(chipHintForPolicy("allow-edits"), "chat.approvalChipHintEdits")
  assert.equal(chipHintForPolicy("allow-all"), "chat.approvalChipHintAll")
  for (const text of Object.values(HINTS)) {
    assert.doesNotMatch(text, ENGINEERING_TERM_RE)
  }
})

test("全部芯片用警告色带文案，不是红底", () => {
  const tone = toneForPolicy("allow-all")
  assert.match(tone.bgClass, /status-yellow/)
  assert.doesNotMatch(tone.bgClass, /status-red|bg-red|destructive/)
  assert.match(tone.colorClass, /status-yellow/)
  const toggle = readFileSync(join(dir, "approval-policy-toggle.tsx"), "utf8")
  assert.match(toggle, /title=\{t\(chipHintForPolicy\(kind\)\)\}/)
  assert.match(toggle, /titleCase\(kind, t\)/)
  assert.doesNotMatch(toggle, /kind === "allow-all" \? null/)
})
