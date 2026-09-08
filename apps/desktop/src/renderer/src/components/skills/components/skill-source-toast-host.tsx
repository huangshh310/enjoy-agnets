/**
 * 技能源更新轻提示：固定在窗口底，不进空态引导。
 */
import { useEffect, useState } from "react"
import { useT } from "@renderer/i18n"
import { cx } from "@/utils/cx"
import {
  subscribeSkillSourceToast,
  type SkillSourceToast
} from "../lib/skill-source-toast"

export function SkillSourceToastHost() {
  const t = useT()
  const [toast, setToast] = useState<SkillSourceToast | null>(null)

  useEffect(() => subscribeSkillSourceToast(setToast), [])
  if (!toast) return null

  const label =
    toast.kind === "updated"
      ? t("settings.skillSources.toastUpdated", { count: toast.count })
      : t("settings.skillSources.toastMissed")

  return (
    <div
      role="status"
      className={cx(
        "pointer-events-none fixed inset-x-0 bottom-8 z-50 flex justify-center px-4"
      )}
    >
      <p className="rounded-full border border-border-button-default bg-background-primary-default px-4 py-2 text-caption-1-medium text-text-primary shadow-card">
        {label}
      </p>
    </div>
  )
}
