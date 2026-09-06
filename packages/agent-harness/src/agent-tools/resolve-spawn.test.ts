import assert from "node:assert/strict"
import { test } from "node:test"
import { resolveSpawnCommand } from "./resolve-spawn.ts"

test("未知 id 拒 spawn", () => {
  assert.throws(() => resolveSpawnCommand("not-a-tool"), /Unknown agent tool/)
})

test("OMP 是技能位，不能 spawn", () => {
  assert.throws(() => resolveSpawnCommand("omp"), /skill target/)
})

test("P0 Cursor / Claude / Codex 走 ACP 白名单", () => {
  assert.deepEqual(resolveSpawnCommand("cursor"), { command: "agent", args: ["acp"] })
  assert.deepEqual(resolveSpawnCommand("claude"), { command: "claude", args: ["acp"] })
  assert.deepEqual(resolveSpawnCommand("codex"), { command: "codex", args: ["acp"] })
})

test("自定义路径必须是白名单文件名且为绝对路径", () => {
  assert.throws(() => resolveSpawnCommand("cursor", { binaryPath: "bash" }), /absolute/)
  assert.throws(() => resolveSpawnCommand("cursor", { binaryPath: "agent" }), /absolute/)
  assert.throws(() => resolveSpawnCommand("cursor", { binaryPath: "/bin/bash" }), /Refusing/)
  assert.deepEqual(resolveSpawnCommand("cursor", { binaryPath: "/opt/bin/agent", extraArgs: ["--foo"] }), {
    command: "/opt/bin/agent",
    args: ["acp", "--foo"]
  })
})

test("选定模型会追加 --model", () => {
  assert.deepEqual(resolveSpawnCommand("claude", { modelId: "claude-sonnet-4-6" }), {
    command: "claude",
    args: ["acp", "--model", "claude-sonnet-4-6"]
  })
})

test("Antigravity：agy-acp 无额外参数，agy 带 --acp", () => {
  assert.deepEqual(resolveSpawnCommand("antigravity"), { command: "agy-acp", args: [] })
  assert.deepEqual(resolveSpawnCommand("antigravity", { binaryPath: "/opt/bin/agy" }), {
    command: "/opt/bin/agy",
    args: ["--acp"]
  })
  assert.deepEqual(resolveSpawnCommand("antigravity", { binaryPath: "/opt/bin/agy-acp" }), {
    command: "/opt/bin/agy-acp",
    args: []
  })
})

test("P1 Gemini 尚未接线", () => {
  assert.throws(() => resolveSpawnCommand("gemini"), /not wired/)
})
