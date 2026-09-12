import assert from "node:assert/strict"
import { test } from "node:test"
import { sendGateCopy } from "./send-gate-copy.ts"

const t = (key: string, vars?: Record<string, string | number>) => {
  const copy: Record<string, string> = {
    "chat.agentInspecting": "检测账号中…",
    "chat.needCliInspectingHint": "检测结束前不算就绪。",
    "chat.needCliAuthorizeTitle": "先完成官方登录",
    "chat.needCliAuthorizeHint": "已打开授权也不算成功。",
    "chat.needCliLoginFailTitle": "登录没成功",
    "chat.needCliLoginHint": "打开授权完成后才算已登录。",
    "settings.agentTools.loginFailPrefix": "未登录上：{reason}",
    "settings.agentTools.loginFailTimeout": "授权超时，可重试或换浏览器完成",
    "settings.agentTools.loginFailMissing": "本机没有这个 CLI",
    "settings.agentTools.loginFailGeneric": "没能完成官方登录，可重试"
  }
  let text = copy[key] ?? key
  for (const [name, value] of Object.entries(vars ?? {})) {
    text = text.replaceAll(`{${name}}`, String(value))
  }
  return text
}

test("发送闸三块文案与预览对齐", () => {
  assert.deepEqual(sendGateCopy("inspecting", t), {
    title: "检测账号中…",
    hint: "检测结束前不算就绪。"
  })
  assert.deepEqual(sendGateCopy("authorizing", t), {
    title: "先完成官方登录",
    hint: "已打开授权也不算成功。"
  })
  assert.deepEqual(sendGateCopy("login_failed", t, "callback_timeout"), {
    title: "登录没成功",
    hint: "未登录上：授权超时，可重试或换浏览器完成"
  })
})
