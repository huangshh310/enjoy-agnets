/**
 * 已配置档案的一行：名称、每条已填协议的主机、密钥状态。
 * 关闭的档案不画「使用中」。名称变淡，开启按钮保持对比度。
 */
import { RiFlashlightLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import type { AgentBindRef, ProviderPublic } from "@enjoy-agents/ipc-contract"
import { ProviderIcon } from "./provider-icons"
import { ProviderRowActions } from "./provider-row-actions"
import { WIRE_LABEL, wireLinesOf } from "./provider-wire-lines"
import type { PingStateMap } from "./use-provider-settings"
import { useT } from "@renderer/i18n"

export function ProviderConfiguredRow({
  profile,
  pingState,
  refs,
  onPing,
  onEdit,
  onActivate,
  onRemove,
  onDuplicate,
  onSetEnabled,
  onOpenAgent
}: {
  profile: ProviderPublic
  pingState?: PingStateMap[string]
  refs: AgentBindRef[]
  onPing?: () => void
  onEdit: () => void
  onActivate: () => void
  onRemove: () => void
  onDuplicate: () => void
  onSetEnabled: (enabled: boolean) => void
  onOpenAgent?: (runtimeId: string) => void
}) {
  const hasKeyIssue = profile.requiresKey && !profile.hasKey
  const muted = !profile.enabled
  return (
    <article
      className={cx(
        "flex items-center gap-3 px-4 py-2 transition-colors",
        profile.active && profile.enabled ? "bg-background-secondary-default/40" : "hover:bg-background-secondary-hover/30"
      )}
    >
      <div className={cx("flex min-w-0 flex-1 items-center gap-3", muted && "opacity-60")}>
        <ProviderMark profile={profile} />
        <div className="min-w-0 flex-1">
          <RowTitle profile={profile} pingState={pingState} />
          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <WireHosts profile={profile} />
            <RowMeta profile={profile} hasKeyIssue={hasKeyIssue} />
          </div>
          <RowRefs refs={refs} onOpenAgent={onOpenAgent} />
        </div>
      </div>
      <ProviderRowActions
        profile={profile}
        pingState={pingState}
        onPing={onPing}
        onEdit={onEdit}
        onActivate={onActivate}
        onRemove={onRemove}
        onDuplicate={onDuplicate}
        onSetEnabled={onSetEnabled}
      />
    </article>
  )
}

function ProviderMark({ profile }: { profile: ProviderPublic }) {
  const marked = profile.active && profile.enabled
  return (
    <div
      className={cx(
        "relative flex size-8 shrink-0 items-center justify-center rounded-lg border p-1 shadow-xs",
        marked
          ? "border-accent-500/40 bg-background-primary-default ring-2 ring-accent-500/10"
          : "border-border-button-default bg-background-primary-default"
      )}
    >
      <ProviderIcon kind={profile.kind} name={profile.name} apiStyle={profile.apiStyle} size={18} />
    </div>
  )
}

function RowTitle({ profile, pingState }: { profile: ProviderPublic; pingState?: PingStateMap[string] }) {
  const t = useT()
  const modelCount = enabledModelCount(profile)
  const latencyLabel = latencyWord(pingState?.latencyMs, t)
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="truncate text-body-2-semibold text-text-primary">{profile.name}</span>
      {profile.active && profile.enabled ? <StatusPill tone="success">{t("settings.providers.active")}</StatusPill> : null}
      {!profile.enabled ? <StatusPill>{t("settings.providers.disabled")}</StatusPill> : null}
      {profile.enabled ? <StatusPill>{t("settings.providers.inUseModels", { count: modelCount })}</StatusPill> : null}
      <LatencyBadge pingState={pingState} label={latencyLabel} />
    </div>
  )
}

function WireHosts({ profile }: { profile: ProviderPublic }) {
  const t = useT()
  const lines = wireLinesOf(profile)
  if (lines.length === 0) return null
  return (
    <>
      {lines.map((line) => (
        <span
          key={line.style}
          title={line.url}
          className="inline-flex max-w-full items-center gap-1 rounded-md border border-border-button-default/80 bg-background-tertiary-default/80 px-1.5 py-0 text-caption-2-medium text-text-secondary"
        >
          <span className="shrink-0">{t(`settings.providers.${WIRE_LABEL[line.style]}`)}</span>
          <span className="truncate font-mono text-text-tertiary">{line.host}</span>
        </span>
      ))}
    </>
  )
}

function RowMeta({ profile, hasKeyIssue }: { profile: ProviderPublic; hasKeyIssue: boolean }) {
  const t = useT()
  const key = profile.hasKey
    ? t("settings.providers.keyHint")
    : profile.requiresKey
      ? t("settings.providers.missingKey")
      : t("settings.providers.noKeyRequired")
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-caption-2-medium text-text-tertiary">
      <span className="font-mono font-medium text-text-secondary">{profile.modelId || t("settings.providers.noModel")}</span>
      <span>·</span>
      <span className={hasKeyIssue ? "font-medium text-text-error-primary" : "text-text-tertiary"}>{key}</span>
    </span>
  )
}

function RowRefs({ refs, onOpenAgent }: { refs: AgentBindRef[]; onOpenAgent?: (runtimeId: string) => void }) {
  const t = useT()
  if (refs.length === 0) return null
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      <span className="text-caption-2-medium text-text-tertiary">{t("settings.providers.usedBy")}</span>
      {refs.map((ref) => (
        <button
          key={ref.id}
          type="button"
          onClick={() => onOpenAgent?.(ref.id)}
          className="rounded-md border border-border-button-default bg-background-primary-default px-1.5 py-0.5 text-caption-2-medium text-text-secondary hover:text-text-primary"
        >
          {ref.label}
        </button>
      ))}
    </div>
  )
}

function StatusPill({ children, tone }: { children: string; tone?: "success" }) {
  if (tone === "success") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-state-success-text/10 px-2.5 py-0.5 text-caption-1-semibold text-state-success-text">
        <span className="size-1.5 rounded-full bg-state-success-text" />
        {children}
      </span>
    )
  }
  return (
    <span className="rounded-md bg-background-secondary-default px-2 py-0.5 text-caption-2-medium text-text-tertiary">
      {children}
    </span>
  )
}

function LatencyBadge({ pingState, label }: { pingState?: PingStateMap[string]; label: string }) {
  const t = useT()
  if (pingState?.status === "ok" && typeof pingState.latencyMs === "number") {
    return (
      <span className={cx("inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-caption-2-medium", latencyClass(pingState.latencyMs))}>
        <RiFlashlightLine className="size-3 shrink-0" />
        <span>{pingState.latencyMs}ms</span>
        {label ? <span className="text-caption-2-regular">· {label}</span> : null}
      </span>
    )
  }
  if (pingState?.status === "error") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-text-error-primary/10 px-2 py-0.5 text-caption-2-medium text-text-error-primary">
        {pingState.message || t("settings.providers.failed")}
      </span>
    )
  }
  return null
}

/** 档案里启用的模型数。关闭档案也计数，页头总数不因关掉变成 0。 */
export function enabledModelCount(profile: ProviderPublic): number {
  const listed = profile.models?.filter((model) => model.enabled !== false).length
  return listed || (profile.modelId ? 1 : 0)
}

function latencyClass(ms: number): string {
  if (ms < 500) return "bg-state-success-text/10 text-state-success-text"
  if (ms < 1500) return "bg-status-yellow-text/10 text-status-yellow-text"
  return "bg-text-error-primary/10 text-text-error-primary"
}

function latencyWord(ms: number | undefined, t: ReturnType<typeof useT>): string {
  if (typeof ms !== "number") return ""
  if (ms < 500) return t("settings.providers.latencyFast")
  if (ms < 1500) return t("settings.providers.latencyOk")
  return t("settings.providers.latencySlow")
}
