/**
 * 当前有没有桌面、后台点击在这一端是否可能。不启动执行器。
 */
export type DisplaySession = "macos" | "windows" | "x11" | "wayland" | "none"

export function displaySession(
  platform = process.platform,
  env: NodeJS.ProcessEnv = process.env
): DisplaySession {
  if (platform === "darwin") return "macos"
  if (platform === "win32") return "windows"
  if (env.WAYLAND_DISPLAY?.trim()) return "wayland"
  if (env.DISPLAY?.trim()) return "x11"
  return "none"
}

export function backgroundClickPossible(session: DisplaySession): boolean {
  return session === "macos" || session === "windows" || session === "x11"
}
