import assert from "node:assert/strict"
import { test } from "node:test"
import { e2eSendWatchdogArgs, e2eSendWatchdogForced } from "./e2e-send-watchdog.ts"
import { readE2eSendWatchdogArg } from "./e2e-send-watchdog-arg.ts"
import { isE2eStub, setE2eStubPackagedForTest } from "./e2e-stub-gate.ts"

test("ENJOY_E2E_SEND_WATCHDOG：只在 stub 闸开时生效", () => {
  assert.equal(e2eSendWatchdogForced({ ENJOY_E2E_SEND_WATCHDOG: "1" }, () => true), true)
  assert.equal(e2eSendWatchdogForced({ ENJOY_E2E_SEND_WATCHDOG: "1" }, () => false), false)
  assert.equal(e2eSendWatchdogForced({}, () => true), false)
  assert.deepEqual(e2eSendWatchdogArgs({ ENJOY_E2E_SEND_WATCHDOG: "1" }, () => false), [])
  assert.equal(readE2eSendWatchdogArg(e2eSendWatchdogArgs({ ENJOY_E2E_SEND_WATCHDOG: "1" }, () => true)), true)
})

test("打包态：即便设了 stub 环境变量也关（真实 isE2eStub 闸）", () => {
  const saved = { ...process.env }
  process.env.ENJOY_E2E_STUB = "1"
  process.env.ENJOY_E2E_USERDATA = "/tmp/x"
  process.env.ENJOY_E2E_SEND_WATCHDOG = "1"
  try {
    setE2eStubPackagedForTest(true)
    assert.equal(isE2eStub(), false)
    assert.equal(e2eSendWatchdogForced(), false)
    setE2eStubPackagedForTest(false)
    assert.equal(e2eSendWatchdogForced(), true)
  } finally {
    setE2eStubPackagedForTest(undefined)
    process.env = saved
  }
})
