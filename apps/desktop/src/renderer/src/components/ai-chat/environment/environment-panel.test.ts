import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const dir = dirname(fileURLToPath(import.meta.url))
const panel = readFileSync(join(dir, "environment-panel.tsx"), "utf8")
const stage = readFileSync(join(dir, "../../app-shell/chat/chat-stage.tsx"), "utf8")

test("Environment 点行打开已有审查栏，不造 GitHub PR", () => {
  assert.ok(panel.includes("expandInspector(\"review\")"))
  assert.ok(panel.includes("expandInspector(\"files\")"))
  assert.ok(panel.includes("environmentChanges"))
  assert.equal(panel.includes("github.com"), false)
  assert.equal(panel.includes("worktree"), false)
  // 弱回显已挂 PR；禁把「开拉取请求」做成 Environment 主 CTA（Must#6）
  assert.ok(panel.includes("prEnvEcho"))
  assert.equal(panel.includes("prOpenAction"), false)
  assert.equal(panel.includes("OpenPrActions"), false)
})

test("对话舞台挂 Environment，默认收起、审批时让位、与账本互斥", () => {
  assert.ok(stage.includes("<EnvironmentPanel"))
  assert.ok(stage.includes("useState(false)"))
  assert.ok(stage.includes("if (pendingApproval) setEnvironmentOpen(false)"))
  assert.ok(stage.includes("if (next) setEnvironmentOpen(false)"))
  assert.ok(stage.includes("useEnvironmentDismiss"))
})
