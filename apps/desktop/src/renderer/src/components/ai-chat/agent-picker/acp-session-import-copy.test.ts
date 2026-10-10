/**
 * 列会话失败禁止把 JS 异常原文插进界面。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { acpSessionListFailedCopy } from "./acp-session-import-copy.ts"
import { zhChat } from "../../../i18n/catalogs/zh/chat.ts"
import { enChat } from "../../../i18n/catalogs/en/chat.ts"

test("列会话失败只走人话，tsx 不插异常原文", () => {
  assert.equal(acpSessionListFailedCopy(() => zhChat.importAcpListFailed), "暂时读不到这个引擎的本机会话")
  assert.equal(
    acpSessionListFailedCopy(() => enChat.importAcpListFailed),
    "Can't read this engine's local sessions right now."
  )
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "acp-session-import.tsx"), "utf8")
  assert.match(src, /acpSessionListFailedCopy/)
  assert.match(src, /setListFailed\(true\)/)
  assert.doesNotMatch(src, /importAcpListFailed", \{ message/)
  assert.doesNotMatch(src, /caught\.message/)
})
