import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { sendGateCopy } from "./send-gate-copy.ts"

test("发送带 clientRequestId，同一手势复用", () => {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "send-composer-run.ts"), "utf8")
  assert.match(src, /takeClientRequestId/)
  assert.match(src, /clientRequestId/)
  assert.match(src, /releaseClientRequestId/)
})

const t = (key: string, vars?: Record<string, string | number>) => {
  const copy: Record<string, string> = {
    "chat.agentInspecting": "检测账号中…",
    "chat.needCliInspectingHint": "检测结束前不算就绪。",
    "chat.needCliAuthorizeTitle": "先完成官方登录",
    "chat.needCliAuthorizeHint": "已打开授权也不算成功。",
    "chat.needCliLoginFailTitle": "登录没成功",
    "chat.needCliLoginHint": "打开授权完成后才算已登录。",
    "chat.needCliOutdatedTitle": "请先更新本机助手",
    "chat.needCliOutdatedHint": "当前 {current}，需要 ≥{required}。更新后再发送。",
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
  assert.deepEqual(sendGateCopy("outdated", t, undefined, { current: "v1.2", required: "1.5" }), {
    title: "请先更新本机助手",
    hint: "当前 v1.2，需要 ≥1.5。更新后再发送。"
  })
})
