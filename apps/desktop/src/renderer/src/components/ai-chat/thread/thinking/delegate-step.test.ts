/**
 * 子智能体步骤：标题/人格、失败态、花名册分组。
 * 不是 Workflow DAG，也不是侧栏会话。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import type { TranslateFn } from "@renderer/i18n"
import { parseAgentStepNodes } from "./agent-step-tree-parser.ts"
import { inferSubagentKind, pickDelegateTitle, subagentFailedHint } from "./delegate-step.ts"

const mockT: TranslateFn = (key: string, params?: Record<string, string | number>) => {
  if (key === "chat.batchCommandsRun") return `运行 ${String(params?.count ?? 0)} 条命令`
  if (key === "chat.readName") return `已读取 ${String(params?.name ?? "")}`
  if (key === "chat.verbRead") return "读取"
  if (key === "chat.subagentTitle") {
    return `子智能体 ${String(params?.kind ?? "")} · ${String(params?.title ?? "")}`
  }
  if (key === "chat.subagentExplore") return "Explore"
  if (key === "chat.subagentGeneral") return "General"
  if (key === "chat.subagentLead") return "子智能体"
  if (key === "chat.subagentFailed") return "执行失败"
  if (key === "chat.failed") return "失败"
  return key
}

function createTool(
  id: string,
  name: string,
  args: Record<string, unknown>,
  result: Record<string, unknown> = {}
): ThreadToolCall {
  return { id, name, args, result, state: "output-available" }
}

test("单条 explore 标题是子智能体 Explore · 标题", () => {
  const nodes = parseAgentStepNodes(
    "",
    [createTool("d1", "delegate", { kind: "explore", title: "审查架构与 IPC 完整性", task: "inspect ipc" })],
    mockT
  )
  assert.equal(nodes.length, 1)
  assert.equal(nodes[0]?.kind, "delegate")
  assert.equal(nodes[0]?.subagentKind, "explore")
  assert.equal(nodes[0]?.isRoster, undefined)
  assert.equal(nodes[0]?.title, "子智能体 Explore · 审查架构与 IPC 完整性")
  assert.equal(nodes[0]?.heading, "审查架构与 IPC 完整性")
})

test("delegate 失败态走 error，不误批成命令", () => {
  const nodes = parseAgentStepNodes(
    "",
    [
      {
        ...createTool("d1", "delegate", { kind: "explore", task: "boom" }, { error: "network" }),
        state: "output-error",
        errorText: "network"
      }
    ],
    mockT
  )
  assert.equal(nodes[0]?.kind, "delegate")
  assert.equal(nodes[0]?.status, "error")
  assert.notEqual(nodes[0]?.title, "delegate")
  assert.equal(subagentFailedHint(nodes[0]!.status, mockT), "执行失败")
  assert.notEqual(mockT("chat.subagentFailed"), mockT("chat.failed"))
})

test("result.error 为对象时也强制失败", () => {
  const nodes = parseAgentStepNodes(
    "",
    [createTool("d1", "delegate", { kind: "explore", task: "boom" }, { error: { code: "NOPE" } })],
    mockT
  )
  assert.equal(nodes[0]?.status, "error")
  assert.ok(nodes[0]?.errorText?.includes("NOPE"))
})

test("连续 2 个顶层 delegate 收成花名册，不是运行 N 条命令", () => {
  const nodes = parseAgentStepNodes(
    "",
    [
      createTool("d1", "delegate", { kind: "explore", title: "审查 ipc" }),
      createTool("d2", "delegate", { kind: "explore", title: "审查 runtime" })
    ],
    mockT
  )
  assert.equal(nodes.length, 1)
  assert.equal(nodes[0]?.isRoster, true)
  assert.equal(nodes[0]?.kind, "delegate")
  assert.equal(nodes[0]?.rosterItems?.length, 2)
  assert.equal(nodes[0]?.rosterItems?.[0]?.title, "子智能体 Explore · 审查 ipc")
  assert.equal(nodes[0]?.rosterItems?.[1]?.title, "子智能体 Explore · 审查 runtime")
  assert.notEqual(nodes[0]?.title, "运行 2 条命令")
  assert.equal(nodes[0]?.isBatch, undefined)
})

test("中间夹 read_file 的两个 delegate 不跨过读取合并", () => {
  const nodes = parseAgentStepNodes(
    "",
    [
      createTool("d1", "delegate", { kind: "explore", title: "ipc" }),
      createTool("r1", "read_file", { path: "a.ts" }),
      createTool("d2", "delegate", { kind: "explore", title: "runtime" })
    ],
    mockT
  )
  assert.equal(nodes.map((node) => node.kind).join(","), "delegate,reading,delegate")
  assert.equal(nodes.every((node) => !node.isRoster), true)
})

test("已 nest 的子 read_file 不进花名册", () => {
  const nodes = parseAgentStepNodes(
    "",
    [
      createTool("d1", "delegate", { kind: "explore", title: "ipc" }),
      { ...createTool("r1", "read_file", { path: "a.ts" }), parentToolCallId: "d1" },
      createTool("d2", "delegate", { kind: "explore", title: "runtime" })
    ],
    mockT
  )
  assert.equal(nodes.length, 1)
  assert.equal(nodes[0]?.isRoster, true)
  assert.equal(nodes[0]?.rosterItems?.length, 2)
  assert.equal(nodes[0]?.rosterItems?.[0]?.children?.[0]?.id, "r1")
  assert.equal(nodes[0]?.rosterItems?.some((item) => item.kind === "reading"), false)
})

test("ACP 工具名 task 也识别为 delegate", () => {
  const nodes = parseAgentStepNodes("", [createTool("d1", "task", { title: "审查架构" })], mockT)
  assert.equal(nodes[0]?.kind, "delegate")
  assert.equal(nodes[0]?.title, "子智能体 General · 审查架构")
})

test("scout 人格归为 explore，标题按优先级截断", () => {
  assert.equal(inferSubagentKind({ subagent_type: "scout" }), "explore")
  assert.equal(inferSubagentKind({ kind: "general" }), "general")
  const long = "x".repeat(90)
  assert.equal(pickDelegateTitle({ title: long }).length, 80)
  assert.equal(pickDelegateTitle({ task: "from-task", title: "from-title" }), "from-title")
})

test("子智能体内部的连续 read_file 递归聚合成批处理", () => {
  const nodes = parseAgentStepNodes(
    "",
    [
      createTool("d1", "delegate", { kind: "explore", title: "ipc" }),
      { ...createTool("r1", "read_file", { path: "a.ts" }), parentToolCallId: "d1" },
      { ...createTool("r2", "read_file", { path: "b.ts" }), parentToolCallId: "d1" },
      { ...createTool("r3", "read_file", { path: "c.ts" }), parentToolCallId: "d1" }
    ],
    mockT
  )
  assert.equal(nodes.length, 1)
  const delegateNode = nodes[0]!
  assert.equal(delegateNode.children?.length, 1)
  assert.equal(delegateNode.children?.[0]?.isBatch, true)
  assert.equal(delegateNode.children?.[0]?.batchItems?.length, 3)
})
