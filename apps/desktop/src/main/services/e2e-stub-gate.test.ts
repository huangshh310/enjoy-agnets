import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { isE2eStub, setE2eStubPackagedForTest } from "./e2e-stub-gate.ts"
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
  const vault = readFileSync(new URL("./secrets-vault.ts", import.meta.url), "utf8")
  assert.match(vault, /if \(isE2eStub\(\) && !safeStorage\.isEncryptionAvailable\(\)\)/)
  assert.match(vault, /if \(isE2eStub\(\) && stored\.startsWith\(E2E_PLAIN_PREFIX\)\)/)
  const gate = readFileSync(new URL("./e2e-stub-gate.ts", import.meta.url), "utf8")
  assert.match(gate, /e2eStubPackaged\(\) !== true/)
  assert.match(gate, /app\.isPackaged/)
})
