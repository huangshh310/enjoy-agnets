/**
 * leo MF-C：bash 本会话允许只认完全相同的整条命令。
 * 反例全部走真实 resolveToolApproval：已记命令再加附着选项 / 缩写长选项 / 尾参，都必须弹卡。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { resolveToolApproval } from "../tool-approval.ts"

const REQUIRE_ALL = {
  requireWriteApproval: true,
  requireBashApproval: true,
  requireCommitApproval: true
}

function decide(allowed: string[], command: string) {
  return resolveToolApproval(
    "bash",
    "agent",
    { ...REQUIRE_ALL, sessionApprovedBashCommands: allowed },
    { command }
  )
}

const COUNTEREXAMPLES: Array<[allowed: string, command: string]> = [
  ["make", "make -fevil.mk"],
  ["make", "make -kfevil.mk"],
  ["make", "make --makefile evil.mk"],
  ["make", "make --fi evil.mk"],
  ["make", "make -C/tmp/other"],
  ["make", "make --direc /tmp/other"],
  ["make test", "make test -fevil.mk"],
  ["npm test", "npm test --script-sh /tmp/evil.sh"],
  ["find .", "find . -fprintf x y"],
  ["find .", "find . -fprint0 x"],
  ["find .", "find . -fls x"]
]

test("MF-C 反例：已记相关命令后，变体仍要用户审批", () => {
  for (const [allowed, command] of COUNTEREXAMPLES) {
    assert.equal(decide([allowed], command), "user-approval", `${allowed} ⇏ ${command}`)
  }
  // 把所有已记命令一起种下也一样。
  const all = [...new Set(COUNTEREXAMPLES.map(([allowed]) => allowed))]
  for (const [, command] of COUNTEREXAMPLES) {
    assert.equal(decide(all, command), "user-approval", command)
  }
})

test("MF-C 反例：同一命令多一个尾参也要再问", () => {
  for (const allowed of ["npm test", "make", "make test", "find .", "git status", "ls -la"]) {
    assert.equal(decide([allowed], `${allowed} extra`), "user-approval", `${allowed} extra`)
  }
})

test("MF-C 少一个参数 / 换顺序也要再问", () => {
  assert.equal(decide(["git log --oneline"], "git log"), "user-approval")
  assert.equal(decide(["ls -l -a"], "ls -a -l"), "user-approval")
})

test("MF-C 正例：完全相同的命令放行，空格 / Tab 多少不影响", () => {
  assert.equal(decide(["npm test"], "npm test"), "approved")
  assert.equal(decide(["npm test"], "  npm \t test "), "approved")
  assert.equal(decide(["make"], "make"), "approved")
  assert.equal(decide(["find ."], "find ."), "approved")
})
