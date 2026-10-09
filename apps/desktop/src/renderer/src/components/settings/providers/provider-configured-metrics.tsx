/**
 * 已配置页头：数量、当前档案、收录模型。
 * 「当前」只认仍开启的默认档案。关掉的不占这个名字。
 */
import type { ProviderPublic } from "@enjoy-agents/ipc-contract"
import { enabledModelCount } from "./provider-configured-row"
import { useT } from "@renderer/i18n"

export function ProviderConfiguredMetrics({ providers }: { providers: ProviderPublic[] }) {
  const t = useT()
  const active = providers.find((profile) => profile.active && profile.enabled)
  const total = providers.reduce((sum, profile) => sum + enabledModelCount(profile), 0)
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-caption-1-medium text-text-secondary">
      <CountMark value={providers.length} label={t("settings.providers.configured")} />
      <Hairline />
      <ActiveMark name={active?.name} />
      <Hairline />
      <span>
        <span className="font-medium text-text-primary">{total}</span>{" "}
        <span>{t("settings.providers.totalModels")}</span>
      </span>
    </div>
  )
}

function CountMark({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="size-2 rounded-full bg-accent-500" />
      <span className="text-body-2-semibold font-semibold text-text-primary">{value}</span>
      <span>{label}</span>
    </div>
  )
}

function ActiveMark({ name }: { name?: string }) {
  const t = useT()
  if (!name) {
    return (
      <div className="flex items-center gap-1.5 text-text-tertiary">
        <span className="size-2 rounded-full bg-text-tertiary" />
        <span>{t("settings.providers.notInUse")}</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className="size-2 rounded-full bg-state-success-text" />
      <span>{t("settings.providers.activePrefix")}</span>
      <span className="font-medium text-text-primary">{name}</span>
    </div>
  )
}

function Hairline() {
  return <div className="h-3 w-px bg-separator-border" />
}
