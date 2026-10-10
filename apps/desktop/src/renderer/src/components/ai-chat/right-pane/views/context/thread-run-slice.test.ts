import assert from "node:assert/strict"
import { test } from "node:test"
import {
  citedSourcesFromMessages,
  toolRunKind,
  toolsFromMessages
} from "./thread-run-slice.ts"

test("citedSourcesFromMessages only takes assistant sources", () => {
  const sources = citedSourcesFromMessages([
    { role: "user", sources: [{ sourceId: "x", title: "no", path: "x" }] },
    {
      role: "assistant",
      sources: [{ sourceId: "a", title: "A", path: "a.md" }]
    }
  ])
  assert.equal(sources.length, 1)
  assert.equal(sources[0]?.path, "a.md")
})

test("toolsFromMessages keeps recent assistant tools", () => {
  const tools = toolsFromMessages([
    { role: "assistant", tools: [{ id: "1", name: "read_file", state: "output-available" }] }
  ])
  assert.equal(tools[0]?.name, "read_file")
})

test("本轮工具只取最近一条助手，不把上轮失败写盘带过来", () => {
  const tools = toolsFromMessages([
    {
      role: "assistant",
      tools: [{ id: "old", name: "write_file", state: "output-error", result: { code: "run_failed" } }]
    },
    { role: "user" },
    {
      role: "assistant",
      tools: [{ id: "new", name: "write_file", state: "output-available", result: { ok: true } }]
    }
  ])
  assert.equal(tools.length, 1)
  assert.equal(tools[0]?.id, "new")
  assert.equal(toolRunKind(tools[0]?.state, tools[0]), "ok")
})

test("成功 output-available 不因残留 run_failed 码标失败", () => {
  assert.equal(
    toolRunKind("output-available", {
      state: "output-available",
      result: { code: "run_failed", ok: true }
    }),
    "ok"
  )
})

test("toolRunKind maps SDK states", () => {
  assert.equal(toolRunKind("output-available"), "ok")
  assert.equal(toolRunKind("output-error"), "error")
  assert.equal(toolRunKind("output-denied"), "denied")
  assert.equal(toolRunKind("approval-requested"), "running")
  assert.equal(
    toolRunKind("output-error", {
      state: "output-error",
      result: { code: "APPROVAL_REPLAY_DENIED" }
    }),
    "denied"
  )
  assert.equal(
    toolRunKind("output-error", {
      state: "output-error",
      errorText: "user_aborted"
    }),
    "stopped"
  )
  assert.equal(
    toolRunKind("output-error", {
      state: "output-error",
      result: { code: "run_failed", decision: "cancelled" }
    }),
    "error"
  )
  assert.notEqual(
    toolRunKind("output-error", {
      state: "output-error",
      result: { code: "run_failed", decision: "cancelled" }
    }),
    "denied"
  )
  assert.equal(
    toolRunKind("output-error", {
      state: "output-error",
      result: { code: "catch_up_approval_timeout", decision: "cancelled" }
    }),
    "catch_up"
  )
})
