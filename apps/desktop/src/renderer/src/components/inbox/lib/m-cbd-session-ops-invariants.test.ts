/**
 * M-CBD 视觉锁：安静 Inbox × 验收闸 × 运行账本。
 * 真源 design/previews/m-cbd-session-ops.html。
 */
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { zhInboxPages } from "../../../i18n/catalogs/zh/pages-inbox.ts"
import { zhSessionOps } from "../../../i18n/catalogs/zh/session-ops.ts"

const dir = dirname(fileURLToPath(import.meta.url))

function readPreviewHtml(): string {
  let cursor = dir
  for (let i = 0; i < 12; i += 1) {
    const candidate = join(cursor, "design/previews/m-cbd-session-ops.html")
    if (existsSync(candidate)) return readFileSync(candidate, "utf8")
    cursor = join(cursor, "..")
  }
  throw new Error("m-cbd-session-ops.html 必须在仓内")
}

const preview = readPreviewHtml()
const filterSrc = readFileSync(join(dir, "filter-inbox.ts"), "utf8")
const pageSrc = readFileSync(join(dir, "../inbox-page.tsx"), "utf8")

test("预览真源仍在仓内，三件套锁都在", () => {
  assert.ok(preview.includes("【视觉真源】M-CBD"))
  assert.ok(preview.includes("拍板 | 待验收 | 失败"))
  assert.ok(preview.includes("执行中 | 待验收 | 完成"))
  assert.ok(preview.includes("不自动 push / commit"))
  assert.ok(preview.includes("本轮账本"))
  assert.ok(preview.includes("本轮来源"))
})

test("中文词表与预览同文", () => {
  assert.equal(zhInboxPages.navApproval, "拍板")
  assert.equal(zhInboxPages.navNeedsReview, "待验收")
  assert.equal(zhInboxPages.navFailed, "失败")
  assert.equal(zhInboxPages.quietHint, "藏噪音")
  assert.equal(zhSessionOps.phaseRunning, "执行中")
  assert.equal(zhSessionOps.phaseReview, "待验收")
  assert.equal(zhSessionOps.phaseDone, "完成")
  assert.equal(zhSessionOps.reject, "打回")
  assert.equal(zhSessionOps.approve, "通过")
  assert.equal(zhSessionOps.ledgerTitle, "本轮账本")
})

test("失败阅读器无通过/打回；待验收列勿混失败", () => {
  const reader = readFileSync(join(dir, "../feed/inbox-reader.tsx"), "utf8")
  assert.ok(!reader.includes("sessionOps.approve"))
  assert.ok(!reader.includes("review-gate-approve"))
  assert.ok(!reader.includes("sessionOps.reject"))
  assert.ok(preview.includes("待验收列勿混失败"))
})

test("Inbox 行与详情标签走 toolDisplayPhrase，不摊裸工具 id", () => {
  const reader = readFileSync(join(dir, "../feed/inbox-reader.tsx"), "utf8")
  const row = readFileSync(join(dir, "../feed/inbox-row.tsx"), "utf8")
  const toolbar = readFileSync(join(dir, "../feed/inbox-toolbar.tsx"), "utf8")
  assert.ok(reader.includes("toolDisplayPhrase"))
  assert.ok(!reader.includes("toolDisplayName"))
  assert.ok(row.includes("toolDisplayPhrase"))
  assert.ok(toolbar.includes('data-testid="page-inbox"'))
})

test("Inbox 筛只有三档，默认拍板，不要全部/运行中", () => {
  assert.ok(pageSrc.includes('id: "approval"'))
  assert.ok(pageSrc.includes('id: "needs_review"'))
  assert.ok(pageSrc.includes('id: "failed"'))
  assert.ok(!pageSrc.includes('id: "running"'))
  assert.ok(!pageSrc.includes('id: "all"'))
  assert.ok(filterSrc.includes('filter === "approval"'))
  assert.ok(!filterSrc.includes('filter === "running"'))
})
