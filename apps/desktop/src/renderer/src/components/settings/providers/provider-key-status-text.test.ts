/**
 * 设置页供应商行密钥三态渲染。回退到「有密钥就 ok」或「写死绿」会红。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { renderToStaticMarkup } from "react-dom/server"
import { renderProviderKeyStatus } from "./provider-key-status-text.ts"

const t = (key: string, vars?: Record<string, string>) => (vars?.name ? `${key}:${vars.name}` : key)
const profile = (state?: "ok" | "invalid" | "unverified") => ({
  kind: "openai",
  name: "my openai",
  requiresKey: true,
  hasKey: true,
  ...(state ? { credentialCheck: { state } } : {})
})
const html = (state?: "ok" | "invalid" | "unverified") =>
  renderToStaticMarkup(renderProviderKeyStatus(profile(state), t, () => undefined)!)

test("被拒：红、显示名、改密钥按钮", () => {
  const out = html("invalid")
  assert.match(out, /data-key-status="invalid"/)
  assert.match(out, /data-tone="error"/)
  assert.match(out, /text-text-error-primary/)
  assert.match(out, /settings\.providers\.keyInvalid:OpenAI/)
  assert.match(out, /data-testid="provider-fix-key"/)
  assert.doesNotMatch(out, /state-success/)
})

test("有密钥但没校验 / 没法确认：中性灰，不当已验证", () => {
  for (const out of [html(), html("unverified")]) {
    assert.match(out, /data-key-status="unverified"/)
    assert.match(out, /data-tone="neutral"/)
    assert.match(out, /settings\.providers\.keyUnverified/)
    assert.doesNotMatch(out, /state-success|text-error|provider-fix-key/)
  }
})

test("已验证：绿", () => {
  const out = html("ok")
  assert.match(out, /data-key-status="ok"/)
  assert.match(out, /data-tone="success"/)
  assert.match(out, /text-state-success-text/)
  assert.match(out, /settings\.providers\.keyVerified/)
})

test("无需密钥 / 没填密钥：不画三态", () => {
  assert.equal(renderProviderKeyStatus({ ...profile(), hasKey: false }, t, () => undefined), null)
  assert.equal(renderProviderKeyStatus({ ...profile(), requiresKey: false }, t, () => undefined), null)
})
