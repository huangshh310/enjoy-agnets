/**
 * 本机 CLI 必须先管理台后说明书，避免再把矩阵顶到卡片前面。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

test("本机 CLI 页顺序是顶栏 → 卡片 → 能力说明", () => {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "settings-agent.tsx"), "utf8")
  const hub = src.indexOf("<AgentToolsCommandHub")
  const page = src.indexOf("<AgentToolsPage")
  const docs = src.indexOf("<AgentCapabilityDocs")
  assert.ok(hub >= 0 && page >= 0 && docs >= 0)
  assert.ok(hub < page && page < docs)
})
