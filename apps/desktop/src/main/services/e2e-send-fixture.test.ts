/**
 * 首发夹具：闸与真实分类，不走捷径写码。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  CREDENTIAL_INVALID,
  PROVIDER_BILLING,
  PROVIDER_FORBIDDEN,
  PROVIDER_UNREACHABLE,
  classifyChatSendFailure
} from "@enjoy-agents/ipc-contract/credential-check"
import { createE2eStubStream } from "./e2e-stub.ts"
import { e2eSendFixture, e2eSendFixtureError, resetE2eSendFixtureForTest } from "./e2e-send-fixture.ts"

const isolated = {
  ENJOY_E2E_STUB: "1",
  ENJOY_E2E_USERDATA: "/tmp/e2e-ud",
  ENJOY_E2E_SEND: "rejected"
}

test("ENJOY_E2E_SEND_ONCE 只炸第一次", () => {
  resetE2eSendFixtureForTest()
  const once = { ...isolated, ENJOY_E2E_SEND_ONCE: "1" }
  assert.equal(e2eSendFixture(once, false, "/tmp/e2e-ud"), "rejected")
  assert.equal(e2eSendFixture(once, false, "/tmp/e2e-ud"), undefined)
  resetE2eSendFixtureForTest()
})

test("ENJOY_E2E_SEND 要 stub + 未打包 + 隔离 userData 路径对得上", () => {
  resetE2eSendFixtureForTest()
  assert.equal(e2eSendFixture({ ...isolated }, false, "/tmp/e2e-ud"), "rejected")
  assert.equal(e2eSendFixture({ ...isolated, ENJOY_E2E_SEND: "unreachable" }, false, "/tmp/e2e-ud"), "unreachable")
  assert.equal(e2eSendFixture({ ...isolated, ENJOY_E2E_SEND: "forbidden" }, false, "/tmp/e2e-ud"), "forbidden")
  assert.equal(e2eSendFixture({ ...isolated, ENJOY_E2E_SEND: "billing" }, false, "/tmp/e2e-ud"), "billing")
  assert.equal(e2eSendFixture({ ...isolated }, false, "/tmp/other"), undefined)
  assert.equal(e2eSendFixture({ ...isolated }, true, "/tmp/e2e-ud"), undefined)
  assert.equal(e2eSendFixture({ ENJOY_E2E_STUB: "1", ENJOY_E2E_SEND: "rejected" }, false), undefined)
  assert.equal(e2eSendFixture({ ...isolated, ENJOY_E2E_STUB: "0" }, false, "/tmp/e2e-ud"), undefined)
  assert.equal(e2eSendFixture({ ...isolated, ENJOY_E2E_SEND: "nope" }, false, "/tmp/e2e-ud"), undefined)
  assert.equal(e2eSendFixture({ ...isolated, ENJOY_E2E_SEND: undefined }, false, "/tmp/e2e-ud"), undefined)
})

test("夹具错误走真实分类：rejected → invalid；403/402 不写 invalid", () => {
  assert.deepEqual(classifyThrown(e2eSendFixtureError("rejected")), {
    code: CREDENTIAL_INVALID,
    persist: "invalid"
  })
  assert.deepEqual(classifyThrown(e2eSendFixtureError("forbidden")), {
    code: PROVIDER_FORBIDDEN,
    persist: "forbidden"
  })
  assert.deepEqual(classifyThrown(e2eSendFixtureError("billing")), {
    code: PROVIDER_BILLING,
    persist: "billing"
  })
  assert.deepEqual(classifyThrown(e2eSendFixtureError("unreachable")), {
    code: PROVIDER_UNREACHABLE,
    persist: null
  })
})

test("stub 流在 SEND=rejected / unreachable 时抛，打包或不隔离不抛", async () => {
  const hello = [{ role: "user" as const, content: "hello" }]
  const rejected = await rejectStub(hello, { ...isolated, ENJOY_E2E_SEND: "rejected" })
  assert.deepEqual(classifyThrown(rejected), { code: CREDENTIAL_INVALID, persist: "invalid" })
  const unreachable = await rejectStub(hello, { ...isolated, ENJOY_E2E_SEND: "unreachable" })
  assert.deepEqual(classifyThrown(unreachable), { code: PROVIDER_UNREACHABLE, persist: null })
  const packed: string[] = []
  for await (const part of createE2eStubStream(hello, new AbortController().signal, {
    packaged: true,
    env: isolated
  })) {
    packed.push(String(part.type))
  }
  assert.ok(packed.includes("finish"))
  const open: string[] = []
  for await (const part of createE2eStubStream(hello, new AbortController().signal, {
    env: { ENJOY_E2E_STUB: "1", ENJOY_E2E_SEND: "rejected" }
  })) {
    open.push(String(part.type))
  }
  assert.ok(open.includes("text-delta"))
})

function classifyThrown(error: unknown) {
  const record = error && typeof error === "object" ? (error as { status?: number; message?: string }) : {}
  return classifyChatSendFailure({
    status: typeof record.status === "number" ? record.status : undefined,
    message: error instanceof Error ? error.message : String(record.message ?? "")
  })
}

async function rejectStub(
  messages: Array<{ role: "user"; content: string }>,
  env: NodeJS.ProcessEnv
): Promise<unknown> {
  try {
    for await (const part of createE2eStubStream(messages, new AbortController().signal, { env })) {
      void part
    }
    assert.fail("expected stub send fixture to throw")
  } catch (error) {
    return error
  }
}
