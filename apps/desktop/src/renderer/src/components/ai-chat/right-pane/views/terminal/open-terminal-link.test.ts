/**
 * 终端链接只走注入的 IPC，不 window.open。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { openTerminalLink } from "./open-terminal-link.ts"

const dir = dirname(fileURLToPath(import.meta.url))

test("http(s) 交给 openExternal，非法协议丢掉", () => {
  const opened: string[] = []
  openTerminalLink("https://example.com/docs", (url) => {
    opened.push(url)
  })
  openTerminalLink("javascript:alert(1)", (url) => {
    opened.push(url)
  })
  openTerminalLink("file:///tmp/x", (url) => {
    opened.push(url)
  })
  assert.deepEqual(opened, ["https://example.com/docs"])
})

test("源码不写 window.open，接线走 window.openExternal", () => {
  const src = readFileSync(join(dir, "open-terminal-link.ts"), "utf8")
  const attach = readFileSync(join(dir, "attach-xterm-addons.ts"), "utf8")
  assert.doesNotMatch(src, /window\.open\s*\(/)
  assert.doesNotMatch(attach, /window\.open\s*\(/)
  assert.ok(attach.includes("window.openExternal"))
  assert.ok(attach.includes("openTerminalLink("))
})
