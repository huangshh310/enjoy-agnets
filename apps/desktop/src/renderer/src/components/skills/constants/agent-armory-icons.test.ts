import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import {
  normalizeAgentId,
  resolveIconSize
} from "../../ai-chat/agent-picker/agent-brand-utils.ts"

test("normalizeAgentId 正确映射各类 Agent 目标与前缀别名", () => {
  assert.equal(normalizeAgentId("enjoy-agents"), "enjoy-local")
  assert.equal(normalizeAgentId("enjoy"), "enjoy-local")
  assert.equal(normalizeAgentId("workspace-claude"), "claude")
  assert.equal(normalizeAgentId("workspace-cursor"), "cursor")
  assert.equal(normalizeAgentId("omp"), "omp")
  assert.equal(normalizeAgentId("pi"), "pi")
  assert.equal(normalizeAgentId("codex"), "codex")
  assert.equal(normalizeAgentId("hermes"), "hermes")
  assert.equal(normalizeAgentId("hermes-agent"), "hermes")
})

test("resolveIconSize 正确解析数值与 Tailwind className 尺寸", () => {
  assert.equal(resolveIconSize(24), 24)
  assert.equal(resolveIconSize(undefined, "size-7"), 28)
  assert.equal(resolveIconSize(undefined, "size-3.5"), 14)
  assert.equal(resolveIconSize(undefined, "size-4"), 16)
  assert.equal(resolveIconSize(undefined, "size-[20px]"), 20)
  assert.equal(resolveIconSize(undefined, "w-full"), 16)
  assert.equal(resolveIconSize(), 16)
})

test("所有全局 Agent 目标均已配置专属品牌图标组件且移除通用手电筒/终端/代码占位标", () => {
  const dir = dirname(fileURLToPath(import.meta.url))
  const code = readFileSync(join(dir, "agent-armory.constants.ts"), "utf8")

  // 不得出现旧的泛用占位图标
  assert.ok(!code.includes("RiFlashlightLine"))
  assert.ok(!code.includes("RiRobot2Line"))
  assert.ok(!code.includes("RiCodeSSlashLine"))
  assert.ok(!code.includes("RiTerminalBoxLine"))

  // 必须绑定官方品牌标组件
  assert.ok(code.includes("PiTargetIcon"))
  assert.ok(code.includes("ClaudeTargetIcon"))
  assert.ok(code.includes("CursorTargetIcon"))
  assert.ok(code.includes("CodexTargetIcon"))
  assert.ok(code.includes("EnjoyTargetIcon"))
  assert.ok(code.includes("OmpTargetIcon"))
})
