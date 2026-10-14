/**
 * 第 4 步徽标渲染：data-key-status / data-tone / 颜色类跟着三态走。写死绿会红。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { renderToStaticMarkup } from "react-dom/server"
import { buildChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"
import { renderApiKeyBadge } from "./api-key-badge.ts"
import { connectModelOptions } from "./connect-model-options.ts"

const t = (key: string) => key
const row = (state?: "ok" | "invalid" | "unverified") =>
  connectModelOptions(
    buildChatReadiness({
      engines: [],
      localModels: [],
      apiKeys: [{ kind: "api_key", providerId: "p1", presetId: "openai" }],
      engineCount: 1,
      hasEnjoySecret: true,
      activeKeyProfileId: "p1",
      ...(state ? { credentialCheck: { state } } : {})
    })
  ).find((item) => item.kind === "api_key")!

const html = (state?: "ok" | "invalid" | "unverified") => renderToStaticMarkup(renderApiKeyBadge(row(state), t)!)

test("被拒：红、带改密钥", () => {
  const out = html("invalid")
  assert.match(out, /data-key-status="invalid"/)
  assert.match(out, /data-tone="error"/)
  assert.match(out, /text-text-error-primary/)
  assert.match(out, /data-testid="connect-model-fix-key"/)
  assert.doesNotMatch(out, /state-success/)
})

test("没法确认 / 缺省：中性灰，不绿不红", () => {
  for (const out of [html("unverified"), html()]) {
    assert.match(out, /data-key-status="unverified"/)
    assert.match(out, /data-tone="neutral"/)
    assert.doesNotMatch(out, /state-success|text-error/)
    assert.doesNotMatch(out, /connect-model-fix-key/)
  }
})

test("已验证：绿", () => {
  const out = html("ok")
  assert.match(out, /data-key-status="ok"/)
  assert.match(out, /text-state-success-text/)
  assert.match(out, /settings\.setupGuide\.connectApiKeyConnected/)
})

test("没存密钥：不画徽标", () => {
  const fresh = connectModelOptions(buildChatReadiness({ engines: [], localModels: [], apiKeys: [], engineCount: 1 }))
  assert.equal(renderApiKeyBadge(fresh.find((item) => item.kind === "api_key")!, t), null)
})
