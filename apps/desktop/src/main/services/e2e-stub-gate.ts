/**
 * E2E stub 第三闸：自己读 app.isPackaged，测试可注入。
 * 读不到 app 当打包。打包态忽略隔离 userData，也不算 stub。
 */
import { app } from "electron"

let packagedForTest: boolean | undefined

export function setE2eStubPackagedForTest(packaged: boolean | undefined): void {
  packagedForTest = packaged
}

export function e2eStubPackaged(): boolean {
  if (packagedForTest !== undefined) return packagedForTest
  try {
    return app.isPackaged === true
  } catch {
    return true
  }
}

/** 打包态（或读不到 app）不认 ENJOY_E2E_USERDATA / ENJOY_DEV_USERDATA。 */
export function isolatedUserDataOverride(): string | undefined {
  if (e2eStubPackaged()) return undefined
  return process.env.ENJOY_DEV_USERDATA || process.env.ENJOY_E2E_USERDATA || undefined
}

export function isE2eStub(): boolean {
  const isolated = Boolean(isolatedUserDataOverride())
  return process.env.ENJOY_E2E_STUB === "1" && e2eStubPackaged() !== true && isolated
}
