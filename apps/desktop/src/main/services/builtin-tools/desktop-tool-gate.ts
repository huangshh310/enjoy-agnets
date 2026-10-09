/**
 * Explore（plan/ask）不注册 desktop_*，也不该走到 ensure overlay。
 * 不依赖 workspace 包，单测可裸跑。
 */

export const DESKTOP_CONTROL_TOOL_NAMES = [
  "desktop_doctor",
  "desktop_list_apps",
  "desktop_snapshot",
  "desktop_screenshot",
  "desktop_act"
] as const

/**
 * 总开关开，或这一发带了 `/computer-use`。探索态（plan/ask）仍然不注册。
 * 口令不把偏好写成开；探索那一发要先改成执行再进来。
 */
export function shouldRegisterDesktopControlTools(mode: string, enabled: boolean, once = false): boolean {
  return (enabled || once) && mode !== "plan" && mode !== "ask"
}
