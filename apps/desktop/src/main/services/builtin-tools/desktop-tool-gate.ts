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

/** 电脑操控开 + 非探索态才注入 desktopControlTools()。 */
export function shouldRegisterDesktopControlTools(mode: string, enabled: boolean): boolean {
  return enabled && mode !== "plan" && mode !== "ask"
}
