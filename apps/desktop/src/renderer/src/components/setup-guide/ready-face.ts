/**
 * 向导末屏只认 chat.readiness.ready。引擎数不能冒充可以开始。
 * ready + unverified：可以开始，文案走占位键（luna 定稿）。
 */
export type ReadyGuideTitleKey =
  | "settings.setupGuide.readyTitle"
  | "settings.setupGuide.readyUnverifiedTitle"
  | "settings.setupGuide.readyNeedTitle"

export function readyGuideTitleKey(
  ready: boolean,
  credentialState?: "ok" | "invalid" | "unverified"
): ReadyGuideTitleKey {
  if (!ready) return "settings.setupGuide.readyNeedTitle"
  if (credentialState === "unverified") return "settings.setupGuide.readyUnverifiedTitle"
  return "settings.setupGuide.readyTitle"
}

export function readyGuidePrimaryKey(ready: boolean): "settings.setupGuide.start" | "settings.setupGuide.goConnect" {
  return ready ? "settings.setupGuide.start" : "settings.setupGuide.goConnect"
}

export function readyGuideFinishes(ready: boolean): boolean {
  return ready
}
