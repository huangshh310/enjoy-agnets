/**
 * mike P3（#163 巡检）：换助手面板 / 输入框里不写工程词（切换引擎 / 引擎 / 导轨 / 未公布窗口 / no advertised window /
 * 检查点），英文不露中文。终稿待 luna 锁。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { zhChat } from "./catalogs/zh/chat.ts"
import { enChat } from "./catalogs/en/chat.ts"
import { zhSettings } from "./catalogs/zh/settings.ts"
import { enSettings } from "./catalogs/en/settings.ts"

const zhJargon = /切换引擎|引擎|导轨|未公布窗口|检查点/
const enJargon = /\bengines?\b|\brail\b|advertised window|checkpoint/i

test("换助手面板（handoff）中英都不写工程词，英文不含中文", () => {
  for (const [key, value] of Object.entries(zhChat.handoff)) {
    assert.doesNotMatch(value, zhJargon, `zh handoff.${key}: ${value}`)
  }
  for (const [key, value] of Object.entries(enChat.handoff)) {
    assert.doesNotMatch(value, enJargon, `en handoff.${key}: ${value}`)
    assert.doesNotMatch(value, /[\u4e00-\u9fff]/, `en handoff.${key} 含中文`)
  }
  assert.equal(zhChat.handoff.title, "换助手")
  assert.equal(enChat.handoff.title, "Switch assistant")
})

test("输入框「不支持中途换模型」及助手菜单脚注、换模型失败句：不说引擎 / 导轨", () => {
  for (const key of ["unsupported", "unsupportedHint", "menuFootnote"] as const) {
    assert.doesNotMatch(zhChat.modelSwitch[key], zhJargon, key)
    assert.doesNotMatch(enChat.modelSwitch[key], enJargon, key)
  }
  assert.equal(zhChat.modelSwitch.unsupported, "这个助手不支持中途换模型。")
  assert.doesNotMatch(zhChat.handoffConfirmFailed, zhJargon)
  assert.doesNotMatch(enChat.handoffConfirmFailed, enJargon)
  assert.equal(zhChat.usage.switchEngine, "换助手")
})

test("上下文窗口不知道时不写「未公布窗口 / no advertised window」（键已删）", () => {
  assert.equal("inspectorCapUnknown" in zhChat, false)
  assert.equal("inspectorCapUnknownModel" in enChat, false)
})

test("「马上发给它」快捷键说明不说「下一步检查点」", () => {
  assert.doesNotMatch(findSteerDesc(zhSettings), /检查点/)
  assert.doesNotMatch(findSteerDesc(enSettings), /checkpoint/i)
})

function findSteerDesc(catalog: unknown): string {
  const stack = [catalog]
  while (stack.length) {
    const node = stack.pop() as Record<string, unknown>
    for (const [key, value] of Object.entries(node)) {
      if (key === "steerDesc" && typeof value === "string") return value
      if (value && typeof value === "object") stack.push(value)
    }
  }
  throw new Error("steerDesc not found")
}
