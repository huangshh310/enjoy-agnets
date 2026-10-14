import assert from "node:assert/strict"
import { test } from "node:test"
import {
  httpStatusOf,
  isToolSurfacedError,
  networkErrorCodeOf,
  structuredErrorTypeOf
} from "./credential-status.ts"

test("结构化状态拆 RetryError.lastError 与 cause", () => {
  const inner = Object.assign(new Error("401"), { status: 401, type: "authentication_error" })
  const retry = Object.assign(new Error("RetryError"), { lastError: inner })
  assert.equal(httpStatusOf(retry), 401)
  assert.equal(structuredErrorTypeOf(retry), "authentication_error")
  const wrapped = Object.assign(new Error("wrapped"), { cause: Object.assign(new Error("402"), { status: 402 }) })
  assert.equal(httpStatusOf(wrapped), 402)
})

test("工具 / MCP 抛上来的 401 不算 provider 失败", () => {
  const mcp = Object.assign(new Error("Unauthorized"), { name: "StreamableHTTPError", status: 401 })
  assert.equal(isToolSurfacedError(mcp), true)
  const tool = Object.assign(new Error("tool failed"), {
    name: "AI_ToolExecutionError",
    toolName: "fetch_url",
    cause: Object.assign(new Error("401"), { status: 401 })
  })
  assert.equal(isToolSurfacedError(tool), true)
  assert.equal(isToolSurfacedError(Object.assign(new Error("401"), { status: 401 })), false)
  const provider = Object.assign(new Error("RetryError"), {
    lastError: Object.assign(new Error("401"), { name: "AI_APICallError", status: 401 })
  })
  assert.equal(isToolSurfacedError(provider), false)
})

test("网络码只认结构化 code，拆 cause", () => {
  const undici = Object.assign(new TypeError("fetch failed"), {
    cause: Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" })
  })
  assert.equal(networkErrorCodeOf(undici), "ECONNREFUSED")
  assert.equal(networkErrorCodeOf(new Error("connect ECONNREFUSED")), undefined)
})
