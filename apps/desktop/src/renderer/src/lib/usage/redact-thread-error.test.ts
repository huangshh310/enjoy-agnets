import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { classifyThreadError } from "./classify-thread-error.ts"
import { THREAD_ERROR_MAX_CHARS, displayThreadErrorText, redactThreadError } from "./redact-thread-error.ts"

const t = (path: string) => `t:${path}`

test("生产路径 displayThreadErrorText：路径与 token 不上红卡", () => {
  const raw =
    "ENOENT open /Users/alice/proj/secret.txt and C:\\Users\\bob\\a.txt with sk-abcdefghijklmnop1234 Bearer eyJhbGciOi.xx token=abc123"
  const out = displayThreadErrorText(raw, t)
  assert.doesNotMatch(out, /alice|bob|sk-abcdef|eyJhbGci|abc123/)
  assert.match(out, /\[路径\]/)
  assert.match(out, /\[已隐藏\]/)
})

test("限长：超过上限截断加省略号", () => {
  const long = redactThreadError("错".repeat(THREAD_ERROR_MAX_CHARS + 50))
  assert.equal(Array.from(long).length, THREAD_ERROR_MAX_CHARS + 1)
  assert.ok(long.endsWith("…"))
})

test("分类认原文：关键词在截断位之后 / 带路径时分类不变", () => {
  const raw = `${"x".repeat(THREAD_ERROR_MAX_CHARS + 20)} 429 rate limit at /Users/alice/p`
  assert.equal(classifyThreadError(raw), "rate_limit")
  // 脱敏后的展示文本若被拿去分类会丢关键词——所以不能先脱敏再存 store。
  assert.notEqual(classifyThreadError(redactThreadError(raw)), "rate_limit")
})

test("红卡：分类 / 重试读 store 原文，只有正文展示走 displayThreadErrorText", () => {
  const banner = readFileSync(
    new URL("../../components/ai-chat/thread/thread-error-banner.tsx", import.meta.url),
    "utf8"
  )
  assert.match(banner, /const kind = classifyThreadError\(error\)/)
  assert.match(banner, /retryTargetForError\(error, errorRetry\)/)
  assert.match(banner, /displayThreadErrorText\(error, t\)/)
  const hydrate = readFileSync(new URL("../../hooks/hydrate-session-error.ts", import.meta.url), "utf8")
  assert.doesNotMatch(hydrate, /redact/i)
})

test("横幅两条人话化路径（send_restore / 兜底）都走 displayThreadErrorText：机器码出文案、原文出脱敏", async () => {
  const { SEND_FAILED_RESTORE } = await import("./classify-thread-error.ts")
  // send_restore：机器码 → i18n 文案，不露码。
  const restore = displayThreadErrorText(SEND_FAILED_RESTORE, t)
  assert.match(restore, /^t:chat\./)
  assert.doesNotMatch(restore, /SEND_FAILED_RESTORE/)
  // 兜底：未分类原文 → 原文脱敏。
  const raw = displayThreadErrorText("weird failure at /Users/alice/x.ts", t)
  assert.equal(raw, "weird failure at [路径]")
  // 横幅里两处都调用它（send_restore 分支与最后兜底）。
  const banner = readFileSync(new URL("../../components/ai-chat/thread/thread-error-banner.tsx", import.meta.url), "utf8")
  assert.equal(banner.match(/displayThreadErrorText\(error, t\)/g)?.length, 2)
  assert.doesNotMatch(banner, /humanizeThreadError/)
})
