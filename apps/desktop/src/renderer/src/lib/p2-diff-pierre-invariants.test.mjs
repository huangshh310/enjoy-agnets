/**
 * P2 Diff soft · Must×6 源码不变式（不启 Electron）
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../..")
const repo = join(root, "../..")
const diffDir = join(root, "src/renderer/src/components/ai-chat/diff")

function read(rel) {
  return readFileSync(join(diffDir, rel), "utf8")
}

function readRepo(rel) {
  return readFileSync(join(repo, rel), "utf8")
}

test("Must1: pierre + preferredHighlighter shiki-js + css-variables；禁 Prism/wasm/highlights 交付", () => {
  const setup = read("pierre-diff-setup.ts")
  const fileDiff = read("file-diff.tsx")
  assert.match(setup, /preferredHighlighter:\s*"shiki-js"/)
  assert.match(setup, /PIERRE_DIFF_THEME\s*=\s*"css-variables"/)
  assert.match(setup, /variablePrefix:\s*"--shiki-"/)
  assert.match(fileDiff, /@pierre\/diffs\/react/)
  assert.match(fileDiff, /PatchDiff/)
  assert.doesNotMatch(setup, /preferredHighlighter:\s*"shiki-wasm"/)
  assert.doesNotMatch(setup, /preferredHighlighter:\s*"highlights"/)
  assert.doesNotMatch(fileDiff, /\bPrism\b/)
  const pkg = readRepo("apps/desktop/package.json")
  assert.match(pkg, /"@pierre\/diffs":\s*"catalog:"/)
  const ws = readRepo("pnpm-workspace.yaml")
  assert.match(ws, /"@pierre\/diffs":\s*1\.6\.4/)
  assert.match(ws, /shiki:\s*"4\.4\.3"/)
})

test("Must2: 落点仅 ai-chat/diff + Review 消费 FileDiff；协议未动", () => {
  const fileDiff = read("file-diff.tsx")
  assert.match(fileDiff, /toUnifiedDiff/)
  assert.match(fileDiff, /applyDiffViewOptions/)
  // 消费面仍 import FileDiff
  const changes = read("changes-file-diff.tsx")
  assert.match(changes, /from "\.\/file-diff"/)
  const card = readFileSync(
    join(root, "src/renderer/src/components/ai-chat/right-pane/views/review/diff-stream/review-file-card.tsx"),
    "utf8"
  )
  assert.match(card, /from "\.\.\/\.\.\/\.\.\/\.\.\/diff\/file-diff"/)
})

test("Must3: foldLargeFiles / LARGE_FILE_LINES=400 诚实 + 人话文案", () => {
  const opts = read("file-diff-options.ts")
  assert.match(opts, /LARGE_FILE_LINES\s*=\s*400/)
  assert.match(opts, /hunks\.slice\(0,\s*1\)/)
  const fileDiff = read("file-diff.tsx")
  assert.match(fileDiff, /diffFoldLargeHint/)
  assert.match(fileDiff, /diffFoldLargeExpand/)
  assert.match(fileDiff, /wouldFoldLargeFile/)
  const zh = readFileSync(
    join(root, "src/renderer/src/i18n/catalogs/zh/chat.ts"),
    "utf8"
  )
  assert.match(zh, /diffFoldLargeHint:\s*"改动较多，先显示开头一段。"/)
  assert.match(zh, /diffFoldLargeExpand:\s*"展开其余改动"/)
  assert.doesNotMatch(fileDiff, /完整 diff|已全部显示/)
})

test("Must4: leave/discard 契约文件未改", () => {
  // 本刀不碰 decision / actions
  // 用 git 会在 gate 再核；此处只确认 FileDiffActions 仍被 ReviewFileCard 引用
  const card = readFileSync(
    join(root, "src/renderer/src/components/ai-chat/right-pane/views/review/diff-stream/review-file-card.tsx"),
    "utf8"
  )
  assert.match(card, /FileDiffActions/)
  assert.match(card, /onKeepFile/)
  assert.match(card, /onDiscardFile/)
})

test("Must5: 零扩张 — 无 SessionList virtua / 事件批 / I3·ink·⑤ 面", () => {
  const fileDiff = read("file-diff.tsx")
  assert.doesNotMatch(fileDiff, /SessionList|event.?batch|applyStreamEvent/i)
  assert.doesNotMatch(fileDiff, /\bI3\b|ink\/|tunnel/)
  // 未引入第二高亮家族
  assert.doesNotMatch(fileDiff, /highlight\.js|Prism|one-dark-pro|one-light/)
})

test("Must6: 用户面无「审查全面升级」空成功", () => {
  const zh = readFileSync(
    join(root, "src/renderer/src/i18n/catalogs/zh/chat.ts"),
    "utf8"
  )
  assert.doesNotMatch(zh, /审查全面升级|AI 审码|已全面重构审查/)
  assert.match(zh, /diffFoldLargeHint/)
})
