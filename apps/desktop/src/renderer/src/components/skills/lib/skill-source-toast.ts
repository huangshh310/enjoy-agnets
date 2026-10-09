/**
 * 技能源更新 toast：只报 C 端两句，走全局 sonner。
 */
import { showAppToast, APP_TOAST_MS } from "@renderer/lib/app-toast"
import { skillSourceToastMessage } from "./skill-source-toast-copy"

export { skillSourceToastMessage }

export function showSkillSourceToast(
  kind: "updated" | "missed",
  count: number,
  t: (path: string, vars?: Record<string, string | number>) => string
): void {
  showAppToast(skillSourceToastMessage(kind, count, t), {
    id: "skill-source",
    duration: APP_TOAST_MS
  })
}
