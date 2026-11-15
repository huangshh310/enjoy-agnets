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

/**
 * 仅 stub 未打包夹具可把 toolTimeoutMs 调小（如 ENJOY_E2E_TOOL_TIMEOUT_MS=5000），
 * 方便产品门截到上限强制落定。生产默认值与取值范围不动。
 */
export function e2eToolTimeoutMs(): number | undefined {
  if (!isE2eStub()) return undefined
  const raw = process.env.ENJOY_E2E_TOOL_TIMEOUT_MS
  if (!raw) return undefined
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  return Math.trunc(parsed)
}

export function effectiveToolTimeoutMs(fallback: number): number {
  return e2eToolTimeoutMs() ?? fallback
}
