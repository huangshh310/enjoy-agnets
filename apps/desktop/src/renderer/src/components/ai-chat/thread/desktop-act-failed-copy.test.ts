/**
 * 硬拒卡只认合约码：tool.result 事件与折叠后 ThreadToolCall 同一张人话，不露工程码。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import {
  DESKTOP_ACT_ACTION_FAILED,
  DESKTOP_ACT_BARE_COORDS_DISABLED,
  desktopActBareCoordsDeniedResult
} from "@enjoy-agents/ipc-contract/desktop-act-codes"
import { desktopActFailedCopy, desktopActFailureKind } from "./desktop-act-failed-copy.ts"
import { desktopActFailedSurfaces } from "./tool-surfaces/select-turn-tool-surfaces.ts"
import { zhChat } from "../../../i18n/catalogs/zh/chat.ts"
import { enChat } from "../../../i18n/catalogs/en/chat.ts"

const ROOT = dirname(fileURLToPath(import.meta.url))
const PLAIN_ZH_BODY =
  "这一步用的是屏幕坐标，默认已关闭。请让我先看一眼窗口再点；确实需要的话，可在 设置 › 电脑操控 打开「高级坐标」。"

function tZh(key: string): string {
  const leaf = key.replace(/^chat\./, "") as keyof typeof zhChat
  return String(zhChat[leaf] ?? key)
}

test("tool.result 事件带合约码走人话卡，不吃英文 reason", () => {
  const event = {
    type: "tool.result" as const,
    runId: "r1",
    toolCallId: "t1",
    name: "desktop_act",
    result: { ...desktopActBareCoordsDeniedResult() }
  }
  assert.equal(event.result.success, false)
  assert.equal(event.result.code, DESKTOP_ACT_BARE_COORDS_DISABLED)
  assert.equal(desktopActFailureKind(event), DESKTOP_ACT_BARE_COORDS_DISABLED)
  const copy = desktopActFailedCopy(DESKTOP_ACT_BARE_COORDS_DISABLED, tZh)
  assert.equal(copy.title, zhChat.desktopCoordsDisabledTitle)
  assert.equal(copy.body, PLAIN_ZH_BODY)
  assert.doesNotMatch(copy.body, /裸坐标|逃逸舱|elementId|bare_coords|hunter2/)
  assert.doesNotMatch(copy.title, /裸坐标|逃逸舱/)
})

test("折叠后 ThreadToolCall.result.code 同一张人话卡", () => {
  const folded: ThreadToolCall = {
    id: "t1",
    name: "desktop_act",
    result: desktopActBareCoordsDeniedResult(),
    state: "output-available"
  }
  const result = folded.result as { success?: boolean; code?: string }
  assert.equal(result.success, false)
  assert.equal(result.code, DESKTOP_ACT_BARE_COORDS_DISABLED)
  assert.equal(desktopActFailureKind(folded), DESKTOP_ACT_BARE_COORDS_DISABLED)
  assert.equal(desktopActFailureKind(folded.result), DESKTOP_ACT_BARE_COORDS_DISABLED)
  assert.equal(desktopActFailedSurfaces([folded]).length, 1)
  const copy = desktopActFailedCopy(DESKTOP_ACT_BARE_COORDS_DISABLED, tZh)
  assert.equal(copy.body, PLAIN_ZH_BODY)
  assert.equal(copy.body, zhChat.desktopCoordsDisabledBody)
})

test("执行面失败包与无码 denial 分流", () => {
  assert.equal(
    desktopActFailureKind({ success: false, code: DESKTOP_ACT_BARE_COORDS_DISABLED }),
    DESKTOP_ACT_BARE_COORDS_DISABLED
  )
  assert.equal(
    desktopActFailureKind({ code: DESKTOP_ACT_ACTION_FAILED, observationId: "obs_new" }),
    DESKTOP_ACT_ACTION_FAILED
  )
  assert.equal(desktopActFailureKind({ type: "denied", reason: "Bare pixel coordinates are disabled." }), null)
  const failed = desktopActFailedCopy(DESKTOP_ACT_ACTION_FAILED, tZh)
  assert.equal(failed.title, "动作没有成功")
  assert.match(failed.body, /失败/)
  assert.match(failed.body, /快照/)
})

test("中英失败文案短、建议重拍，卡上不露工程码", () => {
  assert.equal(zhChat.desktopActFailedTitle, "动作没有成功")
  assert.match(zhChat.desktopActFailedBody, /不含新观察/)
  assert.match(enChat.desktopActFailedBody, /snapshot/i)
  assert.doesNotMatch(zhChat.desktopCoordsDisabledBody, /裸坐标|逃逸舱|elementId/)
  assert.doesNotMatch(enChat.desktopCoordsDisabledBody, /bare coord|escape hatch|elementId/i)
  assert.match(enChat.desktopCoordsDisabledBody, /Settings/)
  const copySrc = readFileSync(join(ROOT, "desktop-act-failed-copy.ts"), "utf8")
  assert.match(copySrc, /@enjoy-agents\/ipc-contract\/desktop-act-codes/)
  assert.doesNotMatch(copySrc, /"bare_coords_disabled"|"action_failed"/)
  const card = readFileSync(join(ROOT, "desktop-act-failed-card.tsx"), "utf8")
  assert.match(card, /desktop-act-failed/)
  assert.doesNotMatch(card, /code ·|font-mono|thumbnailPath|nextStep|continueHint|observationId/)
})
