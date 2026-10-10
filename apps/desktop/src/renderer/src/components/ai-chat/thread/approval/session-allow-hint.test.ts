import assert from "node:assert/strict"
import { test } from "node:test"
import { sessionAllowCardState } from "./session-allow-hint.ts"

test("写盘卡展示工具名", () => {
  assert.deepEqual(sessionAllowCardState("write_file", ""), {
    showSession: true,
    target: "write_file",
    onceOnly: false
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
    onceOnly: true
  })
})
