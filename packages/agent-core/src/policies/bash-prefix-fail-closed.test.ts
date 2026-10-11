/**
 * leo M1 探针：曾经剥包装器 / VAR= 后被放行的句子，现在必须停在审批。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { resolveToolApproval } from "../tool-approval.ts"

const PLANTED = {
  requireWriteApproval: true,
  requireBashApproval: true,
  requireCommitApproval: true,
  sessionApprovedBashCommands: [
    "npm test",
    "pnpm lint",
    "git status",
    "git log",
    "git config",
    "make SHELL",
    "make -f",
    "find .",
    "ls -la",
    "ls"
  ]
}

function decision(command: string) {
  return resolveToolApproval("bash", "agent", PLANTED, { command })
}

const LEO_APPROVED_HOLES = [
  "nice -n sh -c rm${IFS}-rf${IFS}~ ls",
  "time -p sh -c reboot ls",
  "env -i sh -c whoami ls -la",
  "NODE_OPTIONS=--require=./evil.js npm test",
  "PATH=/tmp/evil npm test",
  "LD_PRELOAD=/tmp/evil.so npm test",
  "GIT_PAGER=./evil.sh git log",
  "s\\h -c",
  "b\\ash",
  "/bin/s?",
  "{sh,-c}",
  "npm -y exec evil",
  "pnpm -s dlx",
  "git --no-pager -c core.pager=x log",
  "git -ccore.pager=x",
  "sed -i s/.*/id/e f",
  "py -c 'print(1)'",
  "pythonw script.py",
  "doas npm test"
]

const STILL_ALLOWED = ["npm test", "pnpm lint", "git status", "ls -la"]

const LEO_MF2_HOLES = [
  "npm test --node-options=--require=/tmp/e.js",
  "npm test --script-shell=/tmp/evil",
  "npm test --prefix=/tmp/evil",
  "make SHELL=/tmp/evil",
  "make -f evil.mk",
  "git config core.fsmonitor ./evil.sh",
  "git config core.pager ./evil.sh",
  "git config core.hooksPath ./evil.sh",
  "git log --output=/tmp/x",
  "find . -delete",
  "find . -fprint /tmp/x"
]

test("leo M1-a–e 与 doas 探针不得吃已记命令", () => {
  for (const command of LEO_APPROVED_HOLES) {
    assert.equal(decision(command), "user-approval", command)
  }
})

test("leo MF-2 尾参注入 env/config 不得吃已记命令", () => {
  for (const command of LEO_MF2_HOLES) {
    assert.equal(decision(command), "user-approval", command)
  }
})

test("首词按原样比，其它空白整句拒", () => {
  assert.equal(decision("NPM test"), "user-approval")
  assert.equal(decision("git -C /tmp status"), "user-approval")
  assert.equal(decision("npm\u00A0test"), "user-approval")
  assert.equal(decision("npm\rtest"), "user-approval")
  assert.equal(decision("npm\vtest"), "user-approval")
})

test("普通 npm/pnpm/git/ls 完全相同时仍放行", () => {
  for (const command of STILL_ALLOWED) {
    assert.equal(decision(command), "approved", command)
  }
})
