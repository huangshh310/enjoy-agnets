/**
 * 技能源 toast 文案：只分 updated / missed，不带错误原文。
 */
export function skillSourceToastMessage(
  kind: "updated" | "missed",
  count: number,
  t: (path: string, vars?: Record<string, string | number>) => string
): string {
  return kind === "updated"
    ? t("settings.skillSources.toastUpdated", { count })
    : t("settings.skillSources.toastMissed")
}
