/**
 * 无焦点会话时「本会话任意桌面」不得看起来能开。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { enSettings } from "../../../../i18n/catalogs/en/settings.ts"
import { zhSettings } from "../../../../i18n/catalogs/zh/settings.ts"

const dir = dirname(fileURLToPath(import.meta.url))

test("无会话时开关禁用，并提示先打开对话", () => {
  assert.equal(zhSettings.builtinTools.anyDesktopNeedSession, "请先打开对话")
  assert.equal(enSettings.builtinTools.anyDesktopNeedSession, "Open a chat first")
  const details = readFileSync(join(dir, "desktop-any-desktop-details.tsx"), "utf8")
  assert.match(details, /disabled=\{!hasFocusedSession\}/)
  assert.match(details, /anyDesktopNeedSession/)
  const operations = readFileSync(
    join(dir, "../../computer-use/computer-use-operations.tsx"),
    "utf8"
  )
  assert.match(operations, /sessionId=\{sessionId\}/)
  const page = readFileSync(join(dir, "../../computer-use/use-computer-use-page.ts"), "utf8")
  assert.match(page, /anyDesktopSession.*!sessionId\?\.trim\(\)/)
})
