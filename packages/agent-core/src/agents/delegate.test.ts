import assert from "node:assert/strict"
import { test } from "node:test"
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
