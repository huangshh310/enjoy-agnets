/**
 * 终端链接只走注入的 IPC，不 window.open。
 */
import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join, relative, sep } from "node:path"
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

test("带 userinfo 凭据的链接丢掉，不调 openExternal", () => {
  const opened: string[] = []
  openTerminalLink("https://user:pass@example.com/docs", (url) => {
    opened.push(url)
  })
  openTerminalLink("http://alice@example.com", (url) => {
    opened.push(url)
  })
  assert.deepEqual(opened, [])
})

test("Unicode11 必须开 allowProposedApi，否则终端白屏", () => {
  const mount = readFileSync(join(dir, "mount-workspace-terminal.ts"), "utf8")
  assert.ok(mount.includes("allowProposedApi: true"))
})

test("源码不写 window.open，接线走 window.openExternal", () => {
  const src = readFileSync(join(dir, "open-terminal-link.ts"), "utf8")
  const attach = readFileSync(join(dir, "attach-xterm-addons.ts"), "utf8")
  assert.doesNotMatch(src, /window\.open\s*\(/)
  assert.doesNotMatch(attach, /window\.open\s*\(/)
  assert.doesNotMatch(attach, /window\.openExternal/)
  assert.ok(attach.includes("requestOpenExternalQuiet"))
  assert.ok(attach.includes("open-safe-external"))
  assert.ok(attach.includes("openTerminalLink("))
  assert.ok(attach.includes("onTerminalLinkActivate"))
  assert.ok(attach.includes("new WebLinksAddon(onTerminalLinkActivate)"))
  const openSafe = readFileSync(join(dir, "../../../../../lib/open-safe-external.ts"), "utf8")
  assert.ok(openSafe.includes("window.openExternal"))
  assert.ok(openSafe.includes(".then("))
  assert.ok(!attach.includes("showAppToast"))
})

test("renderer 只有 open-safe-external 调用 window.openExternal", () => {
  const rendererRoot = join(dir, "../../../../..")
  const hits: string[] = []
  function walk(folder: string): void {
    for (const name of readdirSync(folder)) {
      const full = join(folder, name)
      if (statSync(full).isDirectory()) {
        if (name === "node_modules") continue
        walk(full)
        continue
      }
      if (!name.endsWith(".ts") && !name.endsWith(".tsx")) continue
      if (name.endsWith(".test.ts") || name.endsWith(".test.tsx")) continue
      const src = readFileSync(full, "utf8")
      if (src.includes(".window.openExternal(")) {
        hits.push(relative(rendererRoot, full).split(sep).join("/"))
      }
    }
  }
  walk(rendererRoot)
  assert.deepEqual(hits, ["lib/open-safe-external.ts"])
})
