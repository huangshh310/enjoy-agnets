/**
 * P0-G 视觉锁：底脚芯片打开「本轮来源」sheet。
 * 真源 design/previews/p0-g-sources-detail.html（76b5ecd）。
 */
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { enChat } from "../../../../i18n/catalogs/en/chat.ts"
import { zhChat } from "../../../../i18n/catalogs/zh/chat.ts"

const dir = dirname(fileURLToPath(import.meta.url))

function readPreviewHtml(): string {
  let cursor = dir
  for (let i = 0; i < 12; i += 1) {
    const candidate = join(cursor, "design/previews/p0-g-sources-detail.html")
    if (existsSync(candidate)) return readFileSync(candidate, "utf8")
    cursor = join(cursor, "..")
  }
  throw new Error("p0-g-sources-detail.html 必须在仓内（76b5ecd）")
}

const preview = readPreviewHtml()
const files = {
  chips: readFileSync(join(dir, "source-chips.tsx"), "utf8"),
  sheet: readFileSync(join(dir, "source-detail-sheet.tsx"), "utf8"),
  row: readFileSync(join(dir, "source-detail-row.tsx"), "utf8"),
  open: readFileSync(join(dir, "open-source-row.ts"), "utf8"),
  collect: readFileSync(join(dir, "collect-turn-sources.ts"), "utf8"),
  list: readFileSync(join(dir, "../source-list.tsx"), "utf8")
}

test("预览真源仍在仓内，五锁都在", () => {
  assert.ok(preview.includes("【视觉真源】P0-G"))
  assert.ok(preview.includes("本轮来源"))
  assert.ok(preview.includes("点任一底脚芯片（含 +N）打开 sheet"))
  assert.ok(preview.includes("不直接跳走"))
  assert.ok(preview.includes("芯片只作入口"))
  assert.ok(preview.includes("点文件行：有 path 才聚焦审查"))
  assert.ok(preview.includes("文件 / 技能 / MCP"))
  assert.ok(preview.includes("无来源 → 不画底脚芯片"))
  assert.ok(preview.includes("网页来源本轮不做"))
  assert.ok(preview.includes("不改探索/执行"))
  assert.ok(preview.includes("不上 InlineCitations 摘录皮"))
})

test("中英词表与预览同文，不用 Citations / Sources 抽屉", () => {
  assert.equal(zhChat.sourcesSheetTitle, "本轮来源")
  assert.equal(zhChat.sourcesSheetKindFile, "文件")
  assert.equal(zhChat.sourcesSheetKindSkill, "技能")
  assert.equal(zhChat.sourcesSheetKindMcp, "MCP")
  assert.equal(zhChat.sourceKnowledgeLabel, "知识库")
  assert.equal(zhChat.sourcesSheetMeta, "{n} 项 · 暂不支持网页来源")
  assert.equal(zhChat.sourcesSheetFooter, "点文件可以在右侧打开；找不到的文件会就地展开片段。")
  assert.equal(enChat.sourcesSheetFooter, "Click a file to open it on the right. Missing files expand their snippet here.")
  assert.doesNotMatch(zhChat.sourcesSheetFooter, /可聚焦|path|跳转/)
  assert.equal(enChat.sourcesSheetTitle, "This turn")
  assert.doesNotMatch(zhChat.sourcesSheetTitle, /引用|Citations/i)
  assert.doesNotMatch(enChat.sourcesSheetTitle, /Citations|Sources drawer|InlineCitations/i)
  assert.doesNotMatch(enChat.sourcesSheetKindFile, /Document|Web|URL/i)
})

test("芯片与 +N 只开 sheet，不立刻跳审查 / 知识 / 技能", () => {
  assert.ok(files.chips.includes("openSourcesSheet"))
  assert.ok(files.chips.includes("turn-source-chip-more"))
  assert.ok(files.chips.includes("openSheet(chip.id)"))
  assert.ok(files.chips.includes("openSheet(null)"))
  assert.ok(!files.chips.includes("openSourceRow"))
  assert.ok(!files.chips.includes("openChangedFile"))
  assert.ok(!files.chips.includes("handleOpenChip"))
  assert.doesNotMatch(files.chips, /openSourceChip(?!OnPointer)/)
  assert.ok(!files.chips.includes("useNavigate"))
  assert.ok(!files.chips.includes("/knowledge"))
  assert.ok(!files.chips.includes("/skills"))
  assert.ok(files.list.includes("SourceChips"))
})

test("sheet 是右/底面板，不上 InlineCitations；无芯片且无账本行不渲染", () => {
  assert.ok(files.sheet.includes("turn-sources-sheet"))
  assert.ok(files.sheet.includes("md:right-3"))
  assert.ok(files.sheet.includes("md:top-12"))
  assert.ok(files.sheet.includes("bottom-3"))
  assert.doesNotMatch(files.sheet, /md:inset-y-3/)
  assert.doesNotMatch(files.sheet, /md:top-3(?!\d)/)
  assert.ok(files.sheet.includes("chips.length === 0 && !ledgerEntry"))
  assert.ok(files.sheet.includes("turn-sources-empty"))
  assert.ok(files.sheet.includes("sourcesEmptyTitle"))
  assert.ok(!files.sheet.includes("<InlineCitations"))
  assert.ok(!files.sheet.includes("inline-citations"))
  assert.ok(!files.sheet.includes("DialogContent"))
  assert.ok(files.row.includes("sourceBadgeLabelKey"))
  assert.ok(files.row.includes("sourceBadgeIcon"))
  assert.ok(files.row.includes("data-selected"))
  assert.ok(files.row.includes("bg-accent-500/10"))
  assert.ok(files.row.includes("text-text-primary"))
  assert.ok(files.row.includes("text-foreground-icon-tertiary"))
  assert.ok(files.row.includes("text-text-secondary"))
  assert.ok(files.row.includes("turn-source-snippet"))
  assert.doesNotMatch(files.row, /text-text-tertiary/)
  assert.doesNotMatch(files.row, /bg-accent-50(?!\d)/)
  assert.doesNotMatch(files.row, /#[0-9a-fA-F]{3,8}\b/)
  assert.match(
    files.sheet,
    /text-caption-2-regular text-text-primary"\s*>\s*\{t\("chat.sourcesSheetFooter"\)\}/
  )
  assert.ok(files.chips.includes("openSourceChipOnPointer"))
  assert.ok(files.chips.includes("bg-accent-500/10"))
  assert.doesNotMatch(files.chips, /bg-accent-50(?!\d)/)
})

test("文件行打开审查；知识库行打开或展开；网页 URL 不进名单", () => {
  assert.ok(files.open.includes("planSourceRowClick"))
  assert.ok(files.open.includes("planSourceOpenView") || files.open.includes("pathsFromLastTurn"))
  assert.ok(files.open.includes("openChangedFile"))
  assert.ok(files.sheet.includes("openSourceRow"))
  assert.ok(files.row.includes("canActivateSourceRow"))
  assert.ok(files.row.includes("turn-source-row"))
  assert.ok(!files.open.includes("useNavigate"))
  assert.ok(!files.open.includes("/knowledge"))
  assert.ok(!files.open.includes("/skills"))
  assert.ok(files.collect.includes("isHttpSource"))
  assert.ok(files.collect.includes("sourceChipStableId"))
  assert.ok(files.collect.includes("parseMcpServerId"))
})

test("探索/执行表面文件未被这轮改写", () => {
  const toggle = readFileSync(join(dir, "../../composer/explore-execute/explore-execute-toggle.tsx"), "utf8")
  assert.ok(toggle.includes("ExploreExecuteToggle"))
  assert.ok(!files.chips.includes("surfaceForMode"))
  assert.ok(!files.sheet.includes("surfaceForMode"))
})

test("阶段总结芯片不硬编码 Recap", () => {
  const goal = readFileSync(join(dir, "../../composer/session-recap-button.tsx"), "utf8")
  assert.ok(goal.includes('t("chat.generateRecap")'))
  assert.ok(!goal.includes('currentRecap ? "Recap"'))
  assert.equal(zhChat.generateRecap, "阶段总结")
})
