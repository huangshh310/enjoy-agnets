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

test("余额不足 / 没权限：徽标仍灰，另出提示条；没存密钥 / ok / invalid 不出", async () => {
  const { renderProviderKeyHint } = await import("./provider-key-status-text.ts")
  const actions = { onEdit() {}, onOpenUrl() {} }
  const withCheck = (check?: { state: "ok" | "invalid" | "unverified"; code?: "forbidden" | "billing" | "auth_rejected" }) => ({
    kind: "deepseek",
    name: "mine",
    requiresKey: true,
    hasKey: true,
    ...(check ? { credentialCheck: check } : {})
  })
  const billing = withCheck({ state: "unverified", code: "billing" })
  const badge = renderToStaticMarkup(renderProviderKeyStatus(billing, t, () => undefined)!)
  assert.match(badge, /data-tone="neutral"/)
  const hint = renderToStaticMarkup(renderProviderKeyHint(billing, t, actions)!)
  assert.match(hint, /data-hint-kind="billing"/)
  assert.match(hint, /keyBillingHint:DeepSeek/)
  assert.match(hint, /provider-key-hint-action/)
  const forbidden = renderToStaticMarkup(renderProviderKeyHint(withCheck({ state: "unverified", code: "forbidden" }), t, actions)!)
  assert.match(forbidden, /data-hint-kind="forbidden"/)
  assert.equal(renderProviderKeyHint({ ...billing, hasKey: false }, t, actions), null)
  assert.equal(renderProviderKeyHint(withCheck({ state: "ok" }), t, actions), null)
  assert.equal(renderProviderKeyHint(withCheck({ state: "invalid", code: "auth_rejected" }), t, actions), null)
})
