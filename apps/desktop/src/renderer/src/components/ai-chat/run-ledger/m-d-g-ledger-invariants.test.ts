/**
 * M-D + P0-G 账本/来源可读性锁。
 * 真源 design/previews/m-d-g-ledger-sources.html（锁 tip b1721a7）。
 */
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { zhSessionOps } from "../../../i18n/catalogs/zh/session-ops.ts"

const dir = dirname(fileURLToPath(import.meta.url))

function readPreviewHtml(): string {
  let cursor = dir
  for (let i = 0; i < 12; i += 1) {
    const candidate = join(cursor, "design/previews/m-d-g-ledger-sources.html")
    if (existsSync(candidate)) return readFileSync(candidate, "utf8")
    cursor = join(cursor, "..")
  }
  throw new Error("m-d-g-ledger-sources.html 必须在仓内（b1721a7）")
}

const preview = readPreviewHtml()
const files = {
  rail: readFileSync(join(dir, "run-ledger-rail.tsx"), "utf8"),
  row: readFileSync(join(dir, "run-ledger-row.tsx"), "utf8"),
  group: readFileSync(join(dir, "run-ledger-group.tsx"), "utf8"),
  format: readFileSync(join(dir, "format-ledger-entry.ts"), "utf8"),
  sheet: readFileSync(join(dir, "../thread/sources/source-detail-sheet.tsx"), "utf8"),
  chips: readFileSync(join(dir, "../thread/sources/source-chips.tsx"), "utf8")
}

test("预览真源仍在仓内，分组与空态锁都在", () => {
  assert.ok(preview.includes("【视觉真源】M-D + P0-G"))
  assert.ok(preview.includes("读文件"))
  assert.ok(preview.includes("改文件"))
  assert.ok(preview.includes("bash · npm test ·"))
  assert.ok(preview.includes("本轮还没落到文件"))
  assert.ok(preview.includes("这一轮还没有工具记录"))
  assert.ok(preview.includes("只读 · 点文件行开本轮来源"))
  assert.ok(preview.includes("每行大蓝「命令」条") === false || preview.includes("不要每行再盖大「改」蓝条"))
})

test("中文词表与预览同文", () => {
  assert.equal(zhSessionOps.ledgerTitle, "本轮账本")
  assert.equal(zhSessionOps.ledgerHint, "只读 · 点文件行开本轮来源")
  assert.equal(zhSessionOps.ledgerEmpty, "这一轮还没有工具记录")
  assert.equal(zhSessionOps.ledgerGroupRead, "读文件")
  assert.equal(zhSessionOps.ledgerGroupEdit, "改文件")
  assert.equal(zhSessionOps.ledgerVerbRead, "读")
  assert.equal(zhSessionOps.ledgerVerbEdit, "改")
  assert.equal(zhSessionOps.sourcesEmptyTitle, "本轮还没落到文件")
})

test("账本只读：无批准 / 提交 / 推送 / 重跑，无第二观测页", () => {
  const surface = `${files.rail}\n${files.row}\n${files.group}`
  assert.ok(!surface.includes("sessionOps.approve"))
  assert.ok(!surface.includes("git_commit"))
  assert.ok(!surface.includes("git_push"))
  assert.ok(!surface.includes("retry"))
  assert.ok(!surface.includes("Observability"))
  assert.ok(!surface.includes("#/observability"))
  assert.ok(!surface.includes("workflowStatus"))
})

test("账本错误走人话，默认面不渲染未翻译英文", () => {
  assert.ok(files.row.includes("formatLedgerErrorUserText"))
  assert.ok(files.row.includes("isDevCopyEnabled"))
  assert.equal(zhSessionOps.ledgerErrorNoResult, "没有收到结果")
  assert.equal(zhSessionOps.ledgerErrorGeneric, "这一步没有成功")
})

test("命令默认折叠；文件行开 sheet；芯片仍只开 sheet", () => {
  assert.ok(files.group.includes("ledgerGroupDefaultOpen"))
  assert.ok(files.format.includes('kind === "command"'))
  assert.ok(files.rail.includes("ledgerOpensSources"))
  assert.ok(files.rail.includes("openSourcesSheet"))
  assert.ok(files.chips.includes("openSourcesSheet"))
  assert.ok(!files.chips.includes("openSourceRow"))
  assert.ok(!files.chips.includes("openChangedFile"))
  assert.ok(files.sheet.includes("turn-sources-empty"))
  assert.ok(files.sheet.includes("sourcesEmptyTitle"))
  assert.ok(!files.sheet.includes("ledgerEntry.title"))
})
