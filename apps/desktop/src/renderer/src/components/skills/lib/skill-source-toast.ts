/**
 * 技能源更新 toast：只报 C 端两句，走全局 sonner。
 */
import { showAppToast, APP_TOAST_MS } from "@renderer/lib/app-toast"
import type { TranslateFn } from "@renderer/i18n"

export function skillSourceToastMessage(
  kind: "updated" | "missed",
  count: number,
  t: TranslateFn
): string {
  return kind === "updated"
    ? t("settings.skillSources.toastUpdated", { count })
    : t("settings.skillSources.toastMissed")
}

export function showSkillSourceToast(
  kind: "updated" | "missed",
  count: number,
  t: TranslateFn
): void {
  showAppToast(skillSourceToastMessage(kind, count, t), {
    id: "skill-source",
    duration: APP_TOAST_MS
  })
}
