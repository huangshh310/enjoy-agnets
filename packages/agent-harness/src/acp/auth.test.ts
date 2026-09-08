import assert from "node:assert/strict"
import { test } from "node:test"
import {
  AcpAuthRequiredError,
  AcpRpcError,
  completeAcpHandshake,
  isAuthRequiredError,
  parseAuthMethods,
  pickAgentAuthMethod,
  toAcpRpcError
} from "./auth.ts"

test("parseAuthMethods 丢掉空 id", () => {
  const methods = parseAuthMethods({
    authMethods: [
      { id: "oauth", name: "Browser", type: "agent" },
      { id: "", name: "skip" },
      { name: "no-id" }
    ]
  })
  assert.equal(methods.length, 1)
  assert.equal(methods[0]?.id, "oauth")
})

test("pickAgentAuthMethod 跳过 terminal", () => {
  assert.equal(
    pickAgentAuthMethod([
      { id: "term", type: "terminal" },
      { id: "oauth", type: "agent" }
    ])?.id,
    "oauth"
  )
  assert.equal(pickAgentAuthMethod([{ id: "term", type: "terminal" }]), undefined)
  assert.equal(pickAgentAuthMethod([{ id: "default" }])?.id, "default")
})

test("isAuthRequiredError 认 message / data / 包装错误", () => {
  assert.equal(isAuthRequiredError(new Error("auth_required")), true)
  assert.equal(isAuthRequiredError(new AcpRpcError("nope", -32000, { code: "auth_required" })), true)
  assert.equal(isAuthRequiredError(new Error("ACP process exited with 1")), false)
})

test("toAcpRpcError 保留 code 与 data", () => {
  const error = toAcpRpcError({ code: -32000, message: "auth_required", data: { type: "agent" } })
  assert.equal(error.code, -32000)
  assert.equal(error.message, "auth_required")
})

test("handshake：已登录则直接 session/new", async () => {
  const session = await completeAcpHandshake({
    initialize: async () => ({ authMethods: [] }),
    authenticate: async () => {
      throw new Error("should not authenticate")
    },
    newSession: async () => "sess_ok"
  })
  assert.equal(session, "sess_ok")
})

test("handshake：agent 型 auth_required 会 authenticate 再重试", async () => {
  let authed = false
  let attempts = 0
  const session = await completeAcpHandshake({
    initialize: async () => ({ authMethods: [{ id: "oauth", type: "agent" }] }),
    authenticate: async (id) => {
      assert.equal(id, "oauth")
      authed = true
    },
    newSession: async () => {
      attempts += 1
      if (!authed) throw new AcpRpcError("auth_required")
      return "sess_authed"
    }
  })
  assert.equal(session, "sess_authed")
  assert.equal(attempts, 2)
})

test("handshake：只有 terminal 方法则抛 ACP_AUTH_REQUIRED", async () => {
  await assert.rejects(
    () =>
      completeAcpHandshake({
        initialize: async () => ({ authMethods: [{ id: "setup", type: "terminal" }] }),
        authenticate: async () => {
          throw new Error("should not authenticate terminal")
        },
        newSession: async () => {
          throw new AcpRpcError("auth_required")
        }
      }),
    (error: unknown) => error instanceof AcpAuthRequiredError && error.name === "ACP_AUTH_REQUIRED"
  )
})
