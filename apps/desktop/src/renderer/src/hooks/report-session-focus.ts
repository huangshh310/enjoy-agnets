/**
 * 兼容入口：走同一份防抖 / lastSent，避免和 useSessionFocus 双报。
 */
import { reportSessionFocused } from "./session-focus"

export function reportSessionFocus(sessionId: string | null): void {
  reportSessionFocused(sessionId)
}
