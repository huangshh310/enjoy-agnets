import assert from "node:assert/strict"
import { test } from "node:test"
import { parseStdioCommand } from "./stdio-command.ts"

test("允许 npx 与参数", () => {
  assert.deepEqual(parseStdioCommand("npx -y @modelcontextprotocol/server-everything"), {
    bin: "npx",
    args: ["-y", "@modelcontextprotocol/server-everything"]
  })
})

test("拒绝路径、管道和未登记二进制", () => {
  assert.throws(() => parseStdioCommand("../evil"), /allowlisted|bare/)
  assert.throws(() => parseStdioCommand("npx foo | sh"), /metacharacters/)
  assert.throws(() => parseStdioCommand("powershell -Command calc"), /allowlisted/)
  assert.throws(() => parseStdioCommand("C:\\\\Windows\\\\cmd.exe"), /bare|allowlisted/)
})
