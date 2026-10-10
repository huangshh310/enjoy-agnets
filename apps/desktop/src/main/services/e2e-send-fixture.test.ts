/**
 * 首发夹具：闸与真实分类，不走捷径写码。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  CREDENTIAL_INVALID,
  PROVIDER_UNREACHABLE
} from "@enjoy-agents/ipc-contract/credential-check"
import { classifyEnjoyLocalSendFailure } from "./credential-send-outcome.ts"
import { createE2eStubStream } from "./e2e-stub.ts"
import { e2eSendFixture, e2eSendFixtureError } from "./e2e-send-fixture.ts"

const isolated = {
  ENJOY_E2E_STUB: "1",
  ENJOY_E2E_USERDATA: "/tmp/e2e-ud",
  ENJOY_E2E_SEND: "rejected"
}

test("ENJOY_E2E_SEND 要 stub + 未打包 + 隔离 userData", () => {
  assert.equal(e2eSendFixture({ ...isolated }, false), "rejected")
  assert.equal(e2eSendFixture({ ...isolated, ENJOY_E2E_SEND: "unreachable" }, false), "unreachable")
  assert.equal(e2eSendFixture({ ...isolated }, true), undefined)
  assert.equal(e2eSendFixture({ ENJOY_E2E_STUB: "1", ENJOY_E2E_SEND: "rejected" }, false), undefined)
  assert.equal(e2eSendFixture({ ...isolated, ENJOY_E2E_STUB: "0" }, false), undefined)
  assert.equal(e2eSendFixture({ ...isolated, ENJOY_E2E_SEND: "nope" }, false), undefined)
  assert.equal(e2eSendFixture({ ...isolated, ENJOY_E2E_SEND: undefined }, false), undefined)
})

test("夹具错误走真实分类：rejected → invalid；unreachable 不改态", () => {
  assert.deepEqual(classifyEnjoyLocalSendFailure(e2eSendFixtureError("rejected")), {
    code: CREDENTIAL_INVALID,
    persistInvalid: true
  })
  assert.deepEqual(classifyEnjoyLocalSendFailure(e2eSendFixtureError("unreachable")), {
    code: PROVIDER_UNREACHABLE,
    persistInvalid: false
  })
})

test("stub 流在 SEND=rejected / unreachable 时抛，打包或不隔离不抛", async () => {
  const previous = {
    stub: process.env.ENJOY_E2E_STUB,
    user: process.env.ENJOY_E2E_USERDATA,
    send: process.env.ENJOY_E2E_SEND
  }
  const hello = [{ role: "user" as const, content: "hello" }]
  process.env.ENJOY_E2E_STUB = "1"
  process.env.ENJOY_E2E_USERDATA = "/tmp/e2e-ud"
  try {
    process.env.ENJOY_E2E_SEND = "rejected"
    const rejected = await rejectStub(hello)
    assert.deepEqual(classifyEnjoyLocalSendFailure(rejected), {
      code: CREDENTIAL_INVALID,
      persistInvalid: true
    })
    process.env.ENJOY_E2E_SEND = "unreachable"
    const unreachable = await rejectStub(hello)
    assert.deepEqual(classifyEnjoyLocalSendFailure(unreachable), {
      code: PROVIDER_UNREACHABLE,
      persistInvalid: false
    })
    const packed: string[] = []
    for await (const part of createE2eStubStream(hello, new AbortController().signal, { packaged: true })) {
      packed.push(String(part.type))
    }
    assert.ok(packed.includes("finish"))
    delete process.env.ENJOY_E2E_USERDATA
    process.env.ENJOY_E2E_SEND = "rejected"
    const open: string[] = []
    for await (const part of createE2eStubStream(hello, new AbortController().signal)) {
      open.push(String(part.type))
    }
    assert.ok(open.includes("text-delta"))
  } finally {
    restoreEnv("ENJOY_E2E_STUB", previous.stub)
    restoreEnv("ENJOY_E2E_USERDATA", previous.user)
    restoreEnv("ENJOY_E2E_SEND", previous.send)
  }
})

async function rejectStub(messages: Array<{ role: "user"; content: string }>): Promise<unknown> {
  try {
    for await (const part of createE2eStubStream(messages, new AbortController().signal)) {
      void part
    }
    assert.fail("expected stub send fixture to throw")
  } catch (error) {
    return error
  }
}

function restoreEnv(key: string, value: string | undefined): void {
  if (value == null) delete process.env[key]
  else process.env[key] = value
}
