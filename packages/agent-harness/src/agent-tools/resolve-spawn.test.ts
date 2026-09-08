import assert from "node:assert/strict"
import { test } from "node:test"
import { resolveSpawnCommand } from "./resolve-spawn.ts"

test("未知 id 拒 spawn", () => {
  assert.throws(() => resolveSpawnCommand("not-a-tool"), /Unknown agent tool/)
})

test("OMP 走官方 ACP 子命令，不是技能位", () => {
  assert.deepEqual(resolveSpawnCommand("omp"), { command: "omp", args: ["acp"] })
})

test("P0 Cursor / Claude / Codex / Grok 走 ACP 白名单", () => {
  assert.deepEqual(resolveSpawnCommand("cursor"), { command: "agent", args: ["acp"] })
  assert.deepEqual(resolveSpawnCommand("claude"), { command: "claude", args: ["acp"] })
  assert.deepEqual(resolveSpawnCommand("codex"), { command: "codex", args: ["acp"] })
  assert.deepEqual(resolveSpawnCommand("grok"), { command: "grok", args: ["agent", "stdio"] })
  assert.deepEqual(resolveSpawnCommand("grok", { modelId: "grok-4.6" }), {
    command: "grok",
    args: ["agent", "--model", "grok-4.6", "stdio"]
  })
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

test("五家 ACP 按 capability 丢掉 --fast / --thinking，Grok 的 --model 仍在 stdio 前", () => {
  const junk = ["--fast", "--thinking=max", "--foo"] as const
  assert.deepEqual(resolveSpawnCommand("cursor", { modelId: "auto", extraArgs: [...junk] }), {
    command: "agent",
    args: ["acp", "--model", "auto", "--foo"]
  })
  assert.deepEqual(resolveSpawnCommand("claude", { extraArgs: [...junk] }), {
    command: "claude",
    args: ["acp", "--foo"]
  })
  assert.deepEqual(resolveSpawnCommand("codex", { extraArgs: [...junk] }), {
    command: "codex",
    args: ["acp", "--foo"]
  })
  assert.deepEqual(resolveSpawnCommand("antigravity", { extraArgs: [...junk] }), {
    command: "agy-acp",
    args: ["--foo"]
  })
  assert.deepEqual(resolveSpawnCommand("grok", { modelId: "grok-4.6", extraArgs: [...junk] }), {
    command: "grok",
    args: ["agent", "--model", "grok-4.6", "stdio", "--foo"]
  })
  const grokArgs = resolveSpawnCommand("grok", { modelId: "grok-4.6", extraArgs: [...junk] }).args
  assert.ok(grokArgs.indexOf("--model") < grokArgs.indexOf("stdio"))
  assert.equal(grokArgs.includes("--fast"), false)
  assert.equal(grokArgs.some((flag) => flag.startsWith("--thinking")), false)
})

test("选定模型会追加 --model", () => {
  assert.deepEqual(resolveSpawnCommand("claude", { modelId: "claude-sonnet-4-6" }), {
    command: "claude",
    args: ["acp", "--model", "claude-sonnet-4-6"]
  })
})

test("七家新 ACP 的官方 argv；Gemini 不用 experimental；Amp/Pi 不发明子命令", () => {
  assert.deepEqual(resolveSpawnCommand("gemini"), { command: "gemini", args: ["--acp"] })
  assert.deepEqual(resolveSpawnCommand("gemini", { modelId: "gemini-2.5-pro" }), {
    command: "gemini",
    args: ["--acp", "--model", "gemini-2.5-pro"]
  })
  assert.equal(resolveSpawnCommand("gemini").args.includes("--experimental-acp"), false)
  assert.deepEqual(resolveSpawnCommand("opencode"), { command: "opencode", args: ["acp"] })
  assert.deepEqual(resolveSpawnCommand("pi"), { command: "pi-acp", args: [] })
  assert.throws(
    () => resolveSpawnCommand("pi", { binaryPath: "/usr/local/bin/pi" }),
    /as ACP/
  )
  assert.deepEqual(resolveSpawnCommand("hermes"), { command: "hermes", args: ["acp"] })
  assert.deepEqual(resolveSpawnCommand("hermes", { binaryPath: "/opt/bin/hermes-acp" }), {
    command: "/opt/bin/hermes-acp",
    args: []
  })
  assert.deepEqual(resolveSpawnCommand("amp"), { command: "amp-acp", args: [] })
  assert.throws(
    () => resolveSpawnCommand("amp", { binaryPath: "/usr/local/bin/amp" }),
    /as ACP/
  )
  assert.deepEqual(resolveSpawnCommand("deepseek"), {
    command: "dsh",
    args: ["--profile", "acp"]
  })
  assert.deepEqual(resolveSpawnCommand("deepseek", { modelId: "deepseek-v4-pro" }), {
    command: "dsh",
    args: ["--profile", "acp"]
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

