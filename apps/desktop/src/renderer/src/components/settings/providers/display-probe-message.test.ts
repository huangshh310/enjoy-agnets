import assert from "node:assert/strict"
import { test } from "node:test"
import { displayProbeMessage } from "./display-probe-message.ts"

test("有 code 时走翻译，不要把英文网页报错摊上屏幕", () => {
  const t = (path: string, vars?: Record<string, string | number>) => {
    if (path !== "settings.providers.catalogConsoleProtocol") return path
    return `控制台 ${vars?.host}`
  }
  assert.equal(
    displayProbeMessage(
      {
        message: "This URL returned a web page, not the models API. Check the base URL and protocol.",
        code: "catalogConsoleProtocol",
        vars: { host: "platform.deepseek.com" }
      },
      t
    ),
    "控制台 platform.deepseek.com"
  )
})

test("缺键回落 main 原文", () => {
  const t = (path: string) => path
  assert.equal(
    displayProbeMessage({ message: "HTTP 500", code: "unknownCode" }, t),
    "HTTP 500"
  )
})
