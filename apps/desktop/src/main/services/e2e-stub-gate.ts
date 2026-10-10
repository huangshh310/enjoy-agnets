/**
 * E2E stub 第三闸：自己读 app.isPackaged，测试可注入。
 * 读不到 app 只让 stub 当打包；明确已打包才忽略隔离 userData。
 */
import { app } from "electron"

let packagedForTest: boolean | undefined

export function setE2eStubPackagedForTest(packaged: boolean | undefined): void {
  packagedForTest = packaged
}

/** 读 app.isPackaged。unreadAsPackaged：读不到时的失败关闭方向。 */
function readPackaged(unreadAsPackaged: boolean): boolean {
  if (packagedForTest !== undefined) return packagedForTest
  try {
    return app.isPackaged === true
  } catch {
    return unreadAsPackaged
  }
}

/** stub 闸：读不到 app 当打包，避免误开明文 / stub。 */
export function e2eStubPackaged(): boolean {
  return readPackaged(true)
}

/**
 * 给 index.setPath 用：只有明确已打包才丢掉隔离目录。
 * 读不到 app 仍认 ENJOY_E2E_USERDATA / ENJOY_DEV_USERDATA，免得 e2e 对不上库。
 */
export function isolatedUserDataOverride(): string | undefined {
  if (readPackaged(false)) return undefined
  return process.env.ENJOY_DEV_USERDATA || process.env.ENJOY_E2E_USERDATA || undefined
}

export function isE2eStub(): boolean {
  const isolated = Boolean(process.env.ENJOY_DEV_USERDATA || process.env.ENJOY_E2E_USERDATA)
  return process.env.ENJOY_E2E_STUB === "1" && e2eStubPackaged() !== true && isolated
}
