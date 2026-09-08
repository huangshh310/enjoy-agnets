import assert from "node:assert/strict"
import { test } from "node:test"
import { resolveSpawnCommand } from "./resolve-spawn.ts"
import { allowedCustomBasenames, assertCustomAllowedCommand, resolveCustomSpawn } from "./custom-spawn.ts"
import { nextCustomAgentId, slugFromLabel } from "./custom-id.ts"

test("自定义 spawn 只允许目录 ACP basename", () => {
  const allowed = allowedCustomBasenames()
  assert.equal(allowed.has("opencode"), true)
  assert.equal(allowed.has("gemini"), true)
  assert.equal(allowed.has("pi-acp"), true)
  assert.equal(allowed.has("bash"), false)
  assert.equal(allowed.has("node"), false)
  assert.equal(allowed.has("npx"), false)
  assert.equal(allowed.has("pi"), false)
  assert.doesNotThrow(() => assertCustomAllowedCommand("opencode"))
  assert.doesNotThrow(() => assertCustomAllowedCommand("/opt/bin/opencode"))
  assert.throws(() => assertCustomAllowedCommand("/bin/bash"), /Refusing/)
  assert.throws(() => assertCustomAllowedCommand("node"), /Refusing/)
  assert.throws(() => assertCustomAllowedCommand("opt/opencode"), /absolute/)
})

test("自定义 runtime 用入库 command/args，不套 catalog acpArgs", () => {
  assert.deepEqual(resolveCustomSpawn("/usr/local/bin/gemini", ["--acp"]), {
    command: "/usr/local/bin/gemini",
    args: ["--acp"]
  })
  assert.deepEqual(
    resolveSpawnCommand("custom:lab", { binaryPath: "/opt/bin/opencode", extraArgs: ["acp", "--foo"] }),
    { command: "/opt/bin/opencode", args: ["acp", "--foo"] }
  )
  assert.throws(() => resolveSpawnCommand("custom:lab"), /no command/)
})

test("label 生成 custom:<slug>，碰撞加后缀", () => {
  assert.equal(slugFromLabel("Open Code"), "open-code")
  assert.equal(slugFromLabel("测试"), "agent")
  const first = nextCustomAgentId("OpenCode", new Set())
  assert.equal(first, "custom:opencode")
  const second = nextCustomAgentId("OpenCode", new Set([first]))
  assert.equal(second, "custom:opencode-2")
})
