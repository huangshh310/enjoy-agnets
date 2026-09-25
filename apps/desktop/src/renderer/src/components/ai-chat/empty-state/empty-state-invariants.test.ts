/**
 * 空态不变量：必须保留 checklist 两段 + pills。
 * 禁止挂 Registry / AgentCliInstall / 空会话技能源同步条。
 */
import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"
import { zhChat } from "../../../i18n/catalogs/zh/chat.ts"

const ROOT = dirname(fileURLToPath(import.meta.url))

function walkProd(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return walkProd(path)
    if (entry.name.endsWith(".test.ts") || entry.name.endsWith(".test.tsx")) return []
    return entry.name.endsWith(".ts") || entry.name.endsWith(".tsx") ? [path] : []
  })
}

test("空态词表保留问候 / 已检测 / 未安装 / 示例任务，禁止改成已连接", () => {
  assert.equal(zhChat.emptyAskTitle, "在 {name} 里做什么？")
  assert.equal(zhChat.emptyAskFallback, "要做什么？")
  assert.equal(zhChat.emptyDetected, "已检测")
  assert.equal(zhChat.emptyReadyCount, "已就绪 {count} 个")
  assert.equal(zhChat.emptyMissing, "未安装")
  assert.equal(zhChat.emptyMissingCount, "未安装 {count} 个")
  assert.equal(zhChat.emptySamples, "示例任务")
  assert.equal(zhChat.emptyChangesChip, "{count} 项")
})

test("空态源码必须挂 checklist 与 pills，且不挂 Registry / AgentCliInstall / 技能源条", () => {
  const files = walkProd(ROOT)
  const sources = files.map((path) => readFileSync(path, "utf8")).join("\n")
  assert.match(sources, /EmptyStateChecklist/)
  assert.match(sources, /EmptyStateReadyBlock/)
  assert.match(sources, /EmptyStatePills/)
  assert.match(sources, /chat\.emptyDetected/)
  assert.match(sources, /chat\.emptyReadyCount/)
  assert.match(sources, /chat\.emptyMissing/)
  assert.match(sources, /chat\.emptyMissingCount/)
  assert.match(sources, /EmptyStateMissingBlock/)
  assert.doesNotMatch(sources, /\bAcpRegistryPage\b|\bAcpRegistryList\b|\bAcpRegistryDetail\b|\bCustomAcpAgentForm\b/)
  assert.doesNotMatch(sources, /from ["'].*agent-cli-install["']/)
  assert.doesNotMatch(sources, /SkillSourcePullStrip|skill-source-pull|useSkillSourcePull/)
})

test("Chat Stage 空态不得挂技能源同步条，Composer 必须在 empty-state 外", () => {
  const stagePath = join(ROOT, "../../app-shell/chat/chat-stage.tsx")
  const startPath = join(ROOT, "../../app-shell/chat/empty-session-start.tsx")
  const stage = readFileSync(stagePath, "utf8")
  const start = readFileSync(startPath, "utf8")
  assert.doesNotMatch(stage, /SkillSourcePullStrip|skill-source-pull/)
  assert.doesNotMatch(start, /SkillSourcePullStrip|skill-source-pull/)
  assert.match(start, /<AiChatEmptyState[\s\S]*?\/>/)
  assert.match(start, /ChatComposerCluster/)
  assert.match(start, /EmptyStatePills/)
})

test("Composer 必须从空态拆出；开始面居中，pills 在 Composer 下", () => {
  const empty = readFileSync(join(ROOT, "ai-chat-empty-state.tsx"), "utf8")
  const header = readFileSync(join(ROOT, "empty-state-header.tsx"), "utf8")
  const checklist = readFileSync(join(ROOT, "checklist/empty-state-checklist.tsx"), "utf8")
  const ready = readFileSync(join(ROOT, "checklist/empty-state-ready-block.tsx"), "utf8")
  const review = readFileSync(
    join(ROOT, "../composer/session-review/session-review-visible.ts"),
    "utf8"
  )
  const start = readFileSync(join(ROOT, "../../app-shell/chat/empty-session-start.tsx"), "utf8")
  const stage = readFileSync(join(ROOT, "../../app-shell/chat/chat-stage.tsx"), "utf8")
  const emptyClasses = [...empty.matchAll(/className=\{?cx\(([^)]+)\)|className="([^"]+)"/g)]
    .map((match) => match[1] ?? match[2] ?? "")
    .join("\n")
  assert.doesNotMatch(empty, /ChatComposerCluster|ChatComposer/)
  assert.doesNotMatch(empty, /EmptyStatePills/)
  assert.doesNotMatch(empty, /children\??/)
  assert.doesNotMatch(emptyClasses, /\bflex-1\b|\bjustify-center\b|\bmy-auto\b|\bsize-full\b/)
  assert.match(empty, /w-full max-w-3xl shrink-0 flex-col items-center gap-4/)
  assert.match(header, /text-title-1/)
  assert.match(header, /emptyAskTitle/)
  assert.match(header, /emptyAskLead/)
  assert.match(checklist, /\bh-auto\b/)
  assert.match(ready, /emptyReadyCount/)
  assert.doesNotMatch(checklist, /\bflex-1\b|\bjustify-center\b|\bmin-h-\[/)
  assert.doesNotMatch(ready, /\bjustify-center\b|\bmin-h-\[/)
  assert.match(header, /emptyChangesChip/)
  assert.match(review, /messageCount === 0/)
  assert.match(start, /h-full min-h-0 flex-1/)
  assert.match(start, /min-h-full w-full flex-col items-center justify-center/)
  assert.match(stage, /relative flex min-h-0 flex-1 flex-col overflow-hidden/)
  assert.match(start, /ChatComposerCluster/)
  assert.match(start, /EmptyStatePills/)
  assert.doesNotMatch(start, /<\/AiChatEmptyState>/)
})
