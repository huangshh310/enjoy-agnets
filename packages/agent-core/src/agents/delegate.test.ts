import assert from "node:assert/strict"
import { test } from "node:test"
import { createDelegateGate } from "./delegate-concurrency.ts"
import { createDelegateTool, runDelegatedSubagent, runReadOnlySubagent } from "./delegate.ts"
import { READ_TOOL_NAMES } from "../tools/read-tools.ts"
import type { AgentWorkspaceHost } from "../runtime-context.ts"

function host(): AgentWorkspaceHost {
  return {
    readFile: async () => "ok",
    writeFile: async () => {
      throw new Error("write must not run")
    },
    editFile: async () => {
      throw new Error("edit must not run")
    },
    listDir: async () => [],
    glob: async () => [],
    grep: async () => [],
    bash: async () => {
      throw new Error("bash must not run")
    },
    gitStatus: async () => "",
    gitDiff: async () => "",
    gitLog: async () => "",
    gitCommit: async () => {
      throw new Error("commit must not run")
    },
    gitPush: async () => {
      throw new Error("push must not run")
    }
  }
}

test("只读子 Agent 只回传摘要", async () => {
  const summary = await runReadOnlySubagent({
    model: {} as never,
    task: "Find the entry file",
    host: host(),
    generate: async () => "src/main.ts is the entry\nNo writes"
  })
  assert.equal(summary.title, "Find the entry file")
  assert.ok(summary.findings[0]?.includes("src/main.ts"))
})

test("delegate 工具把任务交给 run 并覆盖 title", async () => {
  const tools = createDelegateTool(async (task) => ({
    title: task,
    findings: ["done"],
    filesTouched: []
  }))
  const execute = tools.delegate.execute as (input: { task: string; title?: string }) => Promise<{
    title: string
    findings: string[]
  }>
  const result = await execute({ task: "inspect", title: "Entry" })
  assert.equal(result.title, "Entry")
  assert.deepEqual(result.findings, ["done"])
})

test("explore 子 Agent 即使在 agent 模式也只读", async () => {
  const summary = await runDelegatedSubagent({
    model: {} as never,
    task: "Find tests",
    host: host(),
    mode: "agent",
    kind: "explore",
    policy: {
      requireWriteApproval: true,
      requireBashApproval: true,
      requireCommitApproval: true
    },
    generate: async () => "tests are in src"
  })
  assert.deepEqual(summary.findings, ["tests are in src"])
})

test("ask 模式 delegate 仍走只读摘要", async () => {
  const summary = await runDelegatedSubagent({
    model: {} as never,
    task: "Inspect",
    host: host(),
    mode: "ask",
    policy: {
      requireWriteApproval: true,
      requireBashApproval: true,
      requireCommitApproval: true
    },
    generate: async () => "read only"
  })
  assert.deepEqual(summary.findings, ["read only"])
})

test("只读工具名不含写盘或 bash", () => {
  assert.ok(READ_TOOL_NAMES.includes("read_file"))
  assert.ok(!READ_TOOL_NAMES.includes("write_file"))
  assert.ok(!READ_TOOL_NAMES.includes("bash"))
})

type DelegateExecute = (
  input: { task: string; title?: string; kind?: "general" | "explore" },
  options?: { toolCallId?: string; abortSignal?: AbortSignal }
) => Promise<{ title: string; findings: string[] }>

test("5 个 delegate 上限 4 同时进入，第 5 个等前一个结束", async () => {
  let inFlight = 0
  let maxInFlight = 0
  const releases: Array<() => void> = []
  const tools = createDelegateTool(async (task) => {
    inFlight += 1
    maxInFlight = Math.max(maxInFlight, inFlight)
    await new Promise<void>((resolve) => {
      releases.push(() => {
        inFlight -= 1
        resolve()
      })
    })
    return { title: task, findings: ["ok"], filesTouched: [] }
  })
  const execute = tools.delegate.execute as DelegateExecute
  const pending = [0, 1, 2, 3, 4].map((index) => execute({ task: `t${index}`, title: `T${index}` }))
  await waitUntil(() => releases.length === 4)
  assert.equal(maxInFlight, 4)
  assert.equal(inFlight, 4)
  releases[0]!()
  await waitUntil(() => releases.length === 5)
  assert.equal(maxInFlight, 4)
  for (const release of releases.slice(1)) release()
  const results = await Promise.all(pending)
  assert.equal(results[0]?.title, "T0")
  assert.equal(maxInFlight, 4)
})

test("闸门抛错仍释放槽", async () => {
  const gate = createDelegateGate(1)
  await assert.rejects(() => gate(async () => {
    throw new Error("boom")
  }))
  let ran = false
  await gate(async () => {
    ran = true
  })
  assert.equal(ran, true)
})

test("等待中的闸门在 abort 时拒绝且不漏槽", async () => {
  const gate = createDelegateGate(1)
  let releaseFirst!: () => void
  const first = gate(() => new Promise<void>((resolve) => {
    releaseFirst = resolve
  }))
  const controller = new AbortController()
  const second = gate(async () => "nope", controller.signal)
  controller.abort()
  await assert.rejects(second)
  releaseFirst()
  await first
  let ran = false
  await gate(async () => {
    ran = true
  })
  assert.equal(ran, true)
})

async function waitUntil(predicate: () => boolean, ms = 1000): Promise<void> {
  const started = Date.now()
  while (!predicate()) {
    if (Date.now() - started > ms) throw new Error("timeout")
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
}
