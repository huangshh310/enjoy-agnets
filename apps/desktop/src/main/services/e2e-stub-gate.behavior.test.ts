/**
 * 打包态 vault 不得走 e2e-plain；未打包 stub 才写明文。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { setE2eStubPackagedForTest } from "./e2e-stub-gate.ts"

const { getDatabase, getSecretValue, writeVault } = await import("./e2e-stub-gate.behavior.load.ts")

test.afterEach(() => {
  setE2eStubPackagedForTest(undefined)
})

test("打包态 vault 不写 e2e-plain 明文；未打包 stub 才写", async () => {
  const previousStub = process.env.ENJOY_E2E_STUB
  const previousUd = process.env.ENJOY_E2E_USERDATA
  process.env.ENJOY_E2E_STUB = "1"
  process.env.ENJOY_E2E_USERDATA = "/tmp/e2e-ud"
  try {
    setE2eStubPackagedForTest(true)
    await assert.rejects(
      () => writeVault({ activeId: null, profiles: [] }),
      /encryption|keychain/i
    )
    const packagedBlob = getSecretValue(getDatabase(), "provider.vault")
    assert.ok(!packagedBlob || !packagedBlob.startsWith("e2e-plain:"))
    setE2eStubPackagedForTest(false)
    await writeVault({ activeId: null, profiles: [] })
    const stubBlob = getSecretValue(getDatabase(), "provider.vault")
    assert.ok(stubBlob?.startsWith("e2e-plain:"))
  } finally {
    if (previousStub == null) delete process.env.ENJOY_E2E_STUB
    else process.env.ENJOY_E2E_STUB = previousStub
    if (previousUd == null) delete process.env.ENJOY_E2E_USERDATA
    else process.env.ENJOY_E2E_USERDATA = previousUd
  }
})
