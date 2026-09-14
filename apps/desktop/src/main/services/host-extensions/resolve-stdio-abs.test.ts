import assert from "node:assert/strict"
import { test } from "node:test"
import { resolveStdioAbs } from "./resolve-stdio-abs.ts"

test("白名单 bin 解析成绝对路径", async () => {
  const resolved = await resolveStdioAbs("npx -y @modelcontextprotocol/server-everything", async () => "/usr/bin/npx")
  assert.deepEqual(resolved, {
    command: "/usr/bin/npx",
    args: ["-y", "@modelcontextprotocol/server-everything"]
  })
})

test("PATH 找不到或非法命令则丢掉", async () => {
  assert.equal(await resolveStdioAbs("npx -y x", async () => undefined), undefined)
  assert.equal(await resolveStdioAbs("bash -c evil", async () => "/bin/bash"), undefined)
})
