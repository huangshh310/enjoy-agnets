/**
 * 空态不变量：必须保留 checklist 两段 + pills；禁止挂 Registry / AgentCliInstall。
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

test("空态词表保留已检测 / 未安装 / 示例任务，禁止改成已连接", () => {
  assert.equal(zhChat.emptyDetected, "已检测")
  assert.equal(zhChat.emptyMissing, "未安装")
  assert.equal(zhChat.emptySamples, "示例任务")
})

test("空态源码必须挂 checklist 与 pills，且不挂 Registry / AgentCliInstall", () => {
  const files = walkProd(ROOT)
  const sources = files.map((path) => readFileSync(path, "utf8")).join("\n")
  assert.match(sources, /EmptyStateChecklist/)
  assert.match(sources, /EmptyStatePills/)
  assert.match(sources, /chat\.emptyDetected/)
  assert.match(sources, /chat\.emptyMissing/)
  assert.doesNotMatch(sources, /\bAcpRegistryPage\b|\bAcpRegistryList\b|\bAcpRegistryDetail\b|\bCustomAcpAgentForm\b/)
  assert.doesNotMatch(sources, /from ["'].*agent-cli-install["']/)
})
