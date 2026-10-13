/**
 * luna P3：保守只读 bash 白名单，失败关闭。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { isReadOnlyBashCommand, isReadOnlyBashTool } from "./bash-read-only.ts"
import { decideTurnOutcome } from "./turn-outcome.ts"

test("认的只读命令", () => {
  for (const command of [
    "ls",
    "ls -la",
    "ls src",
    "pwd",
    "cat README.md",
    "cat a.txt b.txt",
    "git status",
    "git status --short",
    "git diff",
    "git diff --stat",
    "git diff --cached src/a.ts",
    "git log",
    "git log --oneline -n5",
    "git log -20"
  ]) {
    assert.equal(isReadOnlyBashCommand(command), true, command)
  }
})

test("认不出 / 可能写：一律不算只读", () => {
  for (const command of [
    "",
    "ls | head",
    "ls > out.txt",
    "cat a.txt > b.txt",
    "cat a; rm -rf ~",
    "ls && touch x",
    "ls $(rm x)",
    "ls `rm x`",
    "pwd -P",
    "cat",
    "cat -n a.txt",
    "cat ~/.ssh/id_rsa",
    "/bin/ls",
    "FOO=1 ls",
    "sudo ls",
    "env ls",
    "git",
    "git commit -m x",
    "git push",
    "git checkout .",
    "git diff --output=x.patch",
    "git diff --ext-diff",
    "git log --output=x",
    "git -c core.pager=sh status",
    "touch x",
    "rm -rf build",
    "npm test",
    "make",
    `ls ${"a".repeat(5000)}`
  ]) {
    assert.equal(isReadOnlyBashCommand(command), false, command)
  }
  assert.equal(isReadOnlyBashCommand(undefined), false)
  assert.equal(isReadOnlyBashCommand({ command: "ls" }), false)
})

test("只认 bash 工具；code_mode 即使 command 是 ls 也不算", () => {
  assert.equal(isReadOnlyBashTool({ name: "bash", args: { command: "ls" } }), true)
  assert.equal(isReadOnlyBashTool({ name: "code_mode", args: { command: "ls", path: "x", source: "rm" } }), false)
  assert.equal(isReadOnlyBashTool({ name: "bash" }), false)
  assert.equal(isReadOnlyBashTool({ name: "bash", args: "ls" }), false)
})

test("收工判定：只读 bash 轮不进待验收；写类 bash / 未知仍进", () => {
  const done = (command: string, name = "bash") =>
    decideTurnOutcome({
      ended: "end",
      tools: [{ name, state: "output-available", args: { command }, result: { stdout: "" } }]
    }).workflow
  assert.equal(done("ls"), "todo")
  assert.equal(done("git status"), "todo")
  assert.equal(done("rm -rf build"), "needs_review")
  assert.equal(done("ls | head"), "needs_review")
  assert.equal(done("ls", "code_mode"), "needs_review")
  // 没带 args（拿不准）：照旧算写。
  assert.equal(
    decideTurnOutcome({ ended: "end", tools: [{ name: "bash", state: "output-available" }] }).workflow,
    "needs_review"
  )
  // 出错 / 被掐也一样：只读不算写。
  assert.equal(
    decideTurnOutcome({
      ended: "error",
      tools: [{ name: "bash", state: "output-available", args: { command: "ls" } }]
    }).workflow,
    "todo"
  )
  // 强杀 archive：只读 ls / list_dir 不进待验收。
  assert.equal(
    decideTurnOutcome({
      ended: "archive",
      tools: [{ name: "bash", state: "input-available", args: { command: "ls" } }]
    }).workflow,
    "in_progress"
  )
  assert.equal(
    decideTurnOutcome({
      ended: "archive",
      tools: [{ name: "list_dir", state: "input-available", args: { path: "." } }]
    }).workflow,
    "in_progress"
  )
})
