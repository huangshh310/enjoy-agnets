/**
 * 把当前会话报给 main。窗口失焦由 main 清掉；重新 focus 再报一次。
 */
import { getIde, hasIde } from "../lib/ide"

export function reportSessionFocus(sessionId: string | null): void {
  if (!hasIde()) return
  void getIde().session.setFocused({ sessionId }).catch(() => undefined)
}
