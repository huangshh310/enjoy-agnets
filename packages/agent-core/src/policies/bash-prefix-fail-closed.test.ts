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
  sessionApprovedBashPrefixes: ["npm test", "pnpm lint", "git status", "git log", "ls -la", "ls"]
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

test("leo M1-a–e 与 doas 探针不得吃已记前缀", () => {
  for (const command of LEO_APPROVED_HOLES) {
    assert.equal(decision(command), "user-approval", command)
  }
})

test("普通 npm/pnpm/git/ls 仍可记前缀并匹配", () => {
  for (const command of STILL_ALLOWED) {
    assert.equal(decision(command), "approved", command)
  }
})
