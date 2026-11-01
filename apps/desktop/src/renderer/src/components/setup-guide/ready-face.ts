/**
 * 向导末屏只认 chat.readiness.ready。引擎数不能冒充可以开始。
 * ready + unverified：可以开始，文案走占位键（luna 定稿）。
 * ready + unverified + billing：不说「可以开始了」，改说余额不足（patrol 54a5 A③）。
 * 没 ready 且密钥被拒：直接说是密钥被拒、主钮改密钥。不再让「去连接」回第 4 步绕圈。
 */
import type { KeyStatus } from "../../lib/credential/key-status.ts"

export type ReadyGuideTitleKey =
  | "settings.setupGuide.readyTitle"
  | "settings.setupGuide.readyUnverifiedTitle"
  | "settings.setupGuide.readyBillingTitle"
  | "settings.setupGuide.readyNeedTitle"
  | "settings.setupGuide.readyKeyInvalidTitle"

export function readyGuideTitleKey(
  ready: boolean,
  credentialState?: "ok" | "invalid" | "unverified",
  keyStatus?: KeyStatus,
  credentialCode?: string
): ReadyGuideTitleKey {
  if (!ready) {
    return keyStatus === "invalid" ? "settings.setupGuide.readyKeyInvalidTitle" : "settings.setupGuide.readyNeedTitle"
  }
  if (credentialState === "unverified" && credentialCode === "billing") {
    return "settings.setupGuide.readyBillingTitle"
  }
  if (credentialState === "unverified") return "settings.setupGuide.readyUnverifiedTitle"
  return "settings.setupGuide.readyTitle"
}

export type ReadyGuidePrimaryKey =
  | "settings.setupGuide.start"
  | "settings.setupGuide.goConnect"
  | "settings.setupGuide.fixKey"

export function readyGuidePrimaryKey(ready: boolean, keyStatus?: KeyStatus): ReadyGuidePrimaryKey {
  if (ready) return "settings.setupGuide.start"
  return keyStatus === "invalid" ? "settings.setupGuide.fixKey" : "settings.setupGuide.goConnect"
}

/** 末屏主钮去向：完成 / 回第 4 步 / 直接改被拒的那份密钥。 */
export function readyGuidePrimaryAction(ready: boolean, keyStatus?: KeyStatus): "finish" | "connect" | "fix-key" {
  if (ready) return "finish"
  return keyStatus === "invalid" ? "fix-key" : "connect"
}

/** 末屏顶部图标：ok 绿✓；ready 但密钥没法确认 → 中性图标（不配绿✓）；没 ready → 钥匙。 */
export type ReadyMarkKind = "ok" | "unverified" | "pending"

export function readyMarkKind(ready: boolean, credentialState?: "ok" | "invalid" | "unverified"): ReadyMarkKind {
  if (!ready) return "pending"
  return credentialState === "unverified" ? "unverified" : "ok"
}

export function readyGuideFinishes(ready: boolean): boolean {
  return ready
}

/** 余额不足时末屏仍可进应用：主钮开始使用，次钮先逛逛（与没 ready 同键）。 */
export function readyGuideSecondaryKey(ready: boolean, credentialCode?: string): "settings.setupGuide.browseFirst" | undefined {
  if (!ready) return "settings.setupGuide.browseFirst"
  if (credentialCode === "billing") return "settings.setupGuide.browseFirst"
  return undefined
}
