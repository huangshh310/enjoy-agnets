import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { app } from "electron"
import {
  isolatedUserDataOverride,
  isE2eStub,
  setE2eStubPackagedForTest
} from "./e2e-stub-gate.ts"
import { writeStubApprovedFile } from "./e2e-stub-write.ts"

test.afterEach(() => {
  setE2eStubPackagedForTest(undefined)
})

test("打包态即使 stub 环境变量 + 隔离 userData 也不算 stub", async () => {
  const previousStub = process.env.ENJOY_E2E_STUB
  const previousUd = process.env.ENJOY_E2E_USERDATA
  process.env.ENJOY_E2E_STUB = "1"
  process.env.ENJOY_E2E_USERDATA = "/tmp/e2e-ud"
  try {
    setE2eStubPackagedForTest(true)
    assert.equal(isE2eStub(), false)
    assert.equal(await writeStubApprovedFile("/tmp/not-used"), null)
    setE2eStubPackagedForTest(false)
    assert.equal(isE2eStub(), true)
  } finally {
    if (previousStub == null) delete process.env.ENJOY_E2E_STUB
    else process.env.ENJOY_E2E_STUB = previousStub
    if (previousUd == null) delete process.env.ENJOY_E2E_USERDATA
    else process.env.ENJOY_E2E_USERDATA = previousUd
  }
})

test("isE2eStub 自己读 packaged，调用方不再传参；vault 明文只跟闸走", () => {
  const callers = [
    "e2e-stub.ts",
    "e2e-stub-slow.ts",
    "e2e-stub-write.ts",
    "secrets-vault.ts",
    "restore-running-runs.ts",
    "abandon-orphan-runs.ts",
    "builtin-tools/computer-use/desktop-tools.ts",
    "open-coding-stream.ts",
    "e2e-bootstrap.ts",
    "agent-run-start.ts",
    "ai-generation.ts",
    "terminal.ts",
    "mcp-app.ts",
    "knowledge-embed.ts",
    "inspect-prompt-service.ts",
    "e2e-chat-ready-seed.ts",
    "e2e-stub-automations.ts",
    "chat-readiness.ts",
    "asset-service.ts"
  ]
  for (const file of callers) {
    const src = readFileSync(new URL(`./${file}`, import.meta.url), "utf8")
    assert.doesNotMatch(src, /isE2eStub\([^)]+\)/, file)
  }
  const gate = readFileSync(new URL("./e2e-stub-gate.ts", import.meta.url), "utf8")
  assert.match(gate, /e2eStubPackaged\(\) !== true/)
  assert.match(gate, /app\.isPackaged/)
  const index = readFileSync(new URL("../index.ts", import.meta.url), "utf8")
  assert.match(index, /isolatedUserDataOverride\(\)/)
})

test("读不到 app 当打包不算 stub，隔离目录仍认", () => {
  const previousStub = process.env.ENJOY_E2E_STUB
  const previousUd = process.env.ENJOY_E2E_USERDATA
  process.env.ENJOY_E2E_STUB = "1"
  process.env.ENJOY_E2E_USERDATA = "/tmp/e2e-ud"
  setE2eStubPackagedForTest(undefined)
  const desc = Object.getOwnPropertyDescriptor(app, "isPackaged")
  Object.defineProperty(app, "isPackaged", {
    configurable: true,
    get() {
      throw new Error("app unavailable")
    }
  })
  try {
    assert.equal(isE2eStub(), false)
    assert.equal(isolatedUserDataOverride(), "/tmp/e2e-ud")
  } finally {
    if (desc) Object.defineProperty(app, "isPackaged", desc)
    else delete (app as { isPackaged?: boolean }).isPackaged
    if (previousStub == null) delete process.env.ENJOY_E2E_STUB
    else process.env.ENJOY_E2E_STUB = previousStub
    if (previousUd == null) delete process.env.ENJOY_E2E_USERDATA
    else process.env.ENJOY_E2E_USERDATA = previousUd
  }
})

test("打包态忽略 ENJOY_E2E_USERDATA / ENJOY_DEV_USERDATA", () => {
  const previousUd = process.env.ENJOY_E2E_USERDATA
  const previousDev = process.env.ENJOY_DEV_USERDATA
  process.env.ENJOY_E2E_USERDATA = "/tmp/e2e-ud"
  process.env.ENJOY_DEV_USERDATA = "/tmp/dev-ud"
  try {
    setE2eStubPackagedForTest(true)
    assert.equal(isolatedUserDataOverride(), undefined)
    setE2eStubPackagedForTest(false)
    assert.equal(isolatedUserDataOverride(), "/tmp/dev-ud")
  } finally {
    if (previousUd == null) delete process.env.ENJOY_E2E_USERDATA
    else process.env.ENJOY_E2E_USERDATA = previousUd
    if (previousDev == null) delete process.env.ENJOY_DEV_USERDATA
    else process.env.ENJOY_DEV_USERDATA = previousDev
  }
})
