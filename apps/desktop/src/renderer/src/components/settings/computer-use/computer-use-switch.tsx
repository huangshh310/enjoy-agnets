/**
 * 电脑操控总开关和就绪徽章。就绪只认 helper 签名加它自己的辅助功能。
 */
import { Switch } from "@/components/ui/switch"
import { useT } from "@renderer/i18n"
import { SettingsCard } from "../settings-row"
import type { DesktopBlock } from "../tools/desktop/desktop-readiness"

const BLOCK_BADGE = {
  unsigned: "settings.computerUse.badgeUnsigned",
  missing: "settings.computerUse.badgeMissing",
  permissions: "settings.computerUse.badgePermissions",
  unavailable: "settings.computerUse.badgeUnavailable",
  "no-display": "settings.computerUse.badgeNoDisplay"
} as const

export function ComputerUseSwitch({
  enabled,
  ready,
  block,
  onToggle
}: {
  enabled: boolean
  ready: boolean
  block: DesktopBlock | null
  onToggle: (enabled: boolean) => void
}) {
  const t = useT()
  return (
    <SettingsCard>
      <div className="flex items-start justify-between gap-4 px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-body-medium text-text-primary">{t("settings.computerUse.switchTitle")}</p>
            {enabled ? <ReadinessBadge ready={ready} block={block} /> : null}
          </div>
          <p className="mt-1 text-caption-1-medium leading-relaxed text-text-secondary">
            {t("settings.computerUse.switchDesc")}
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          aria-label={t("settings.computerUse.switchTitle")}
        />
      </div>
    </SettingsCard>
  )
}

/** 开关开着才画。绿只写就绪；否则写阻断，医生还在路上才写未就绪。 */
function badgeLabel(ready: boolean, block: DesktopBlock | null) {
  if (ready) return "settings.builtinTools.ready" as const
  if (block) return BLOCK_BADGE[block]
  return "settings.builtinTools.notReady" as const
}

function ReadinessBadge({ ready, block }: { ready: boolean; block: DesktopBlock | null }) {
  const t = useT()
  return (
    <span
      className={
        ready
          ? "rounded-full bg-state-success-base px-2 py-0.5 text-caption-2-semibold text-state-success-text ring-1 ring-state-success-text/20"
          : "rounded-full bg-status-yellow-text/10 px-2 py-0.5 text-caption-2-semibold text-status-yellow-text ring-1 ring-status-yellow-text/20"
      }
    >
      {t(badgeLabel(ready, block))}
    </span>
  )
}
