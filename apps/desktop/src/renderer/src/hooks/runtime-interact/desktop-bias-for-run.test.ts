/**
 * 发送路径：名单失败只留 @桌面；名单外 token 不造假应用。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import type { DesktopMentionApp } from "@enjoy-agents/ipc-contract"
import { mentionAppsFromListResult } from "../../components/ai-chat/composer/mentions/desktop/mention-apps-from-list.ts"
import { readDesktopMentionBias } from "../../components/ai-chat/composer/mentions/desktop/read-desktop-mention-bias.ts"

function desktopBiasFromMentions(text: string, apps: readonly DesktopMentionApp[]) {
  return readDesktopMentionBias(text, apps) ?? undefined
}

const APPS: DesktopMentionApp[] = [
  {
    displayName: "计算器",
    appKey: "com.apple.calculator",
    appKeySource: "bundleId",
    stable: true
  }
]

test("B1 @桌面 → host；名单失败仍能偏宿主", () => {
  assert.deepEqual(desktopBiasFromMentions("@桌面 打开", APPS), { kind: "host" })
  assert.deepEqual(desktopBiasFromMentions("@桌面 打开", mentionAppsFromListResult({ ok: false, apps: [] })), {
    kind: "host"
  })
})

test("B2 名单内稳应用 → 该 appKey", () => {
  assert.deepEqual(desktopBiasFromMentions("@计算器 算一下", APPS), {
    kind: "app",
    displayName: "计算器",
    appKey: "com.apple.calculator",
    stable: true
  })
})

test("B4 helper 失败 / 名单外不造假应用", () => {
  assert.deepEqual(mentionAppsFromListResult({ ok: false, code: "executor_missing", apps: [] }), [])
  assert.deepEqual(mentionAppsFromListResult(null), [])
  assert.equal(desktopBiasFromMentions("@计算器 算一下", []), undefined)
  assert.equal(desktopBiasFromMentions("@NotInstalled 安装", APPS), undefined)
})
