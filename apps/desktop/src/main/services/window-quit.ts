/**
 * ⌘Q / 关窗确认：未放行时 before-quit 拦截。
 */
let allowQuit = false

export function isQuitAllowed(): boolean {
  return allowQuit
}

export function markQuitAllowed(): void {
  allowQuit = true
}
