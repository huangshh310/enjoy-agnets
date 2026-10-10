/**
 * 从设置打开的技能 / MCP 中心：返回原设置分段，不要落到「通用」。
 */
import { useNavigate } from "@tanstack/react-router"
import { RiArrowLeftLine } from "@remixicon/react"
import { settingsReturnSection } from "@renderer/components/settings/last-settings-section"
import type { SettingsSectionId } from "@renderer/components/settings/settings-catalog"
import { useT } from "@renderer/i18n"

export function ModuleReturnBar({
  from,
  origin,
  fallback
}: {
  from?: string
  origin?: string
  fallback: Extract<SettingsSectionId, "skills" | "mcp">
}) {
  const t = useT()
  const navigate = useNavigate()
  const section = settingsReturnSection(from, origin, fallback)
  if (!section) return null
  return (
    <div className="flex shrink-0 items-center px-8 pt-3">
      <button
        type="button"
        data-testid="return-to-settings"
        className="inline-flex cursor-pointer items-center gap-1 text-caption-1-medium text-text-secondary hover:text-text-primary"
        onClick={() => void navigate({ to: "/settings/$section", params: { section } })}
      >
        <RiArrowLeftLine className="size-3.5" aria-hidden />
        {t("common.returnToSettings")}
      </button>
    </div>
  )
}
