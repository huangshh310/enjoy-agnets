/**
 * E2E stub 第三闸：自己读 app.isPackaged，测试可注入。
 * 打包态即使有 ENJOY_E2E_STUB + 隔离 userData 也不算 stub。
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
    return false
  }
}

export function isE2eStub(): boolean {
  const isolated = Boolean(process.env.ENJOY_E2E_USERDATA || process.env.ENJOY_DEV_USERDATA)
  return process.env.ENJOY_E2E_STUB === "1" && e2eStubPackaged() !== true && isolated
}
