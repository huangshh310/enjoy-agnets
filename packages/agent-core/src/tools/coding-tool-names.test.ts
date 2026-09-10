import assert from "node:assert/strict"
import { test } from "node:test"
import { codingToolNamesFor, isReadOnlyAgentMode } from "./coding-tool-names.ts"

test("plan/ask 是只读模式", () => {
  assert.equal(isReadOnlyAgentMode("plan"), true)
  assert.equal(isReadOnlyAgentMode("ask"), true)
  assert.equal(isReadOnlyAgentMode("agent"), false)
  assert.equal(isReadOnlyAgentMode("debug"), false)
})

test("plan/ask 工具表没有写盘与 shell", () => {
  for (const mode of ["plan", "ask"] as const) {
    const names = codingToolNamesFor(mode)
    assert.ok(names.includes("read_file"))
    assert.ok(names.includes("repo_outline"))
    assert.ok(names.includes("skill"))
    assert.ok(names.includes("git_status"))
    assert.ok(names.includes("git_log"))
    assert.ok(names.includes("ask_user_questions"))
    assert.ok(names.includes("delegate"))
    assert.ok(!names.includes("write_file"))
    assert.ok(!names.includes("edit_file"))
    assert.ok(!names.includes("bash"))
    assert.ok(!names.includes("git_commit"))
    assert.ok(!names.includes("git_push"))
    assert.ok(!names.includes("git_branch"))
    assert.ok(!names.includes("code_mode"))
  }
  assert.ok(codingToolNamesFor("plan").includes("submit_plan"))
  assert.ok(!codingToolNamesFor("ask").includes("submit_plan"))
})

test("agent/debug 仍含写工具与 delegate", () => {
  const names = codingToolNamesFor("agent")
  assert.ok(names.includes("write_file"))
  assert.ok(names.includes("bash"))
  assert.ok(names.includes("git_push"))
  assert.ok(names.includes("git_branch"))
  assert.ok(names.includes("skill"))
  assert.ok(names.includes("repo_outline"))
  assert.ok(names.includes("git_log"))
  assert.ok(names.includes("delegate"))
})

test("子 Agent 可关掉 ask_user_questions", () => {
  const names = codingToolNamesFor("plan", { includeAskUser: false })
  assert.ok(!names.includes("ask_user_questions"))
  assert.ok(names.includes("read_file"))
})
