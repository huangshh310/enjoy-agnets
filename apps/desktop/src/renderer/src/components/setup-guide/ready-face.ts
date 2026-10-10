/**
 * 向导末屏只认 chat.readiness.ready。引擎数不能冒充可以开始。
 * unverified 不改标题，只在摘要挂副标题。
 */
export function readyGuideTitleKey(ready: boolean): "settings.setupGuide.readyTitle" | "settings.setupGuide.readyNeedTitle" {
  return ready ? "settings.setupGuide.readyTitle" : "settings.setupGuide.readyNeedTitle"
}

export function readyGuidePrimaryKey(ready: boolean): "settings.setupGuide.start" | "settings.setupGuide.goConnect" {
  return ready ? "settings.setupGuide.start" : "settings.setupGuide.goConnect"
}

export function readyGuideFinishes(ready: boolean): boolean {
  return ready
}
