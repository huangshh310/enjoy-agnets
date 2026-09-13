/**
 * 列表动力源胶囊：统一规格高质感轻胶囊、呼吸微点、清晰层级。
 * 未安装提供弱态「需先安装」引导；自定义 ACP 保持「—」。
 */
import type { PowerSourceParts } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { ModelBrandIcon } from "@renderer/components/settings/providers/provider-icons"
import { formatPowerSourceText, isBlankPowerSource } from "./format-power-source"

/** 表行动力源格：全状态对齐统一胶囊，避免割裂。 */
export function PowerSourceCell({
  parts,
  accent,
  empty,
  outdated
}: {
  parts: PowerSourceParts
  accent: boolean
  empty?: boolean
  /** 已登录仍可写，旁标「需更新」，不改列结构。 */
  outdated?: boolean
}) {
  const t = useT()

  // 自定义 ACP：不支持动力源绑定，保持破折号
  if (parts.kind === "none") {
    return <span className="text-caption-1-regular text-text-tertiary">—</span>
  }

  // 未就绪/未安装：展示弱态轻胶囊，明确呼应右侧「一键安装」动作
  if (empty) {
    return (
      <span
        className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-dashed border-border-button-default/50 bg-background-secondary-default/20 px-2 py-0.5 text-caption-2-medium text-text-tertiary"
        title={t("settings.agentTools.powerNeedInstall")}
      >
        <span className="size-1.5 shrink-0 rounded-full bg-text-tertiary/40" />
        <span className="truncate">{t("settings.agentTools.powerNeedInstall")}</span>
      </span>
    )
  }

  if (isBlankPowerSource(parts)) {
    return <span className="text-caption-1-regular text-text-tertiary">—</span>
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      <PowerSourceCapsule parts={parts} accent={accent} />
      {outdated ? (
        <span className="shrink-0 rounded-full bg-state-warning-text/10 px-1.5 py-px text-caption-2-medium text-state-warning-text ring-1 ring-state-warning-text/25">
          {t("settings.agentTools.listOutdatedBadge")}
        </span>
      ) : null}
    </div>
  )
}

export function PowerSourceCapsule({
  parts,
  accent = false
}: {
  parts: PowerSourceParts
  /** 主引擎且已绑档案时描强调边。 */
  accent?: boolean
}) {
  const t = useT()
  const text = formatPowerSourceText(parts, t)

  if (parts.mode === "official") {
    const status = parts.official
    if (status === "in") {
      return (
        <span
          className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-border-button-default bg-background-secondary-default/60 px-2 py-0.5 text-caption-1-medium text-text-primary"
          title={text}
        >
          <span className="size-1.5 shrink-0 rounded-full bg-notification-success-foreground" />
          <span className="truncate">{t("settings.agentTools.powerOfficialDirect")}</span>
        </span>
      )
    }

    if (status === "check" || status === "auth") {
      const label =
        status === "check"
          ? t("settings.agentTools.powerOfficialCheck")
          : t("settings.agentTools.powerOfficialAuth")
      return (
        <span
          className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-accent-500/25 bg-accent-500/5 px-2 py-0.5 text-caption-1-medium text-text-secondary"
          title={text}
        >
          <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-accent-500" />
          <span className="truncate">{label}</span>
        </span>
      )
    }

    if (status === "fail") {
      return (
        <span
          className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-text-error-primary/25 bg-text-error-primary/5 px-2 py-0.5 text-caption-1-medium text-text-error-primary"
          title={text}
        >
          <span className="size-1.5 shrink-0 rounded-full bg-text-error-primary" />
          <span className="truncate">{t("settings.agentTools.powerOfficialFail")}</span>
        </span>
      )
    }

    // status === "out" (未登录)
    return (
      <span
        className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-border-button-default/50 bg-background-secondary-default/25 px-2 py-0.5 text-caption-1-medium text-text-tertiary"
        title={text}
      >
        <span className="size-1.5 shrink-0 rounded-full bg-text-tertiary/60" />
        <span className="truncate">{t("settings.agentTools.powerOfficialOut")}</span>
      </span>
    )
  }

  // parts.mode === "vault" || parts.mode === "omp"
  const dot =
    accent
      ? "bg-accent-500"
      : parts.mode === "omp"
        ? "bg-accent-600"
        : "bg-accent-500/80"

  const hasBoth = Boolean(parts.archive && parts.model)

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 truncate rounded-full px-2 py-0.5 text-caption-1-medium text-text-primary ${
        accent
          ? "border border-accent-500/35 bg-background-primary-default shadow-xs"
          : "border border-border-button-default bg-background-secondary-default/50"
      }`}
      title={text}
    >
      <span className={`size-1.5 shrink-0 rounded-full ${dot}`} />
      {hasBoth ? (
        <span className="flex min-w-0 items-center gap-1.5 truncate">
          <span className="truncate font-medium text-text-primary">{parts.archive}</span>
          <span className="shrink-0 text-text-tertiary/40">/</span>
          <span className="flex min-w-0 items-center gap-1 truncate text-text-secondary">
            <ModelBrandIcon modelId={parts.model} size={13} className="shrink-0" />
            <span className="truncate">{parts.model}</span>
          </span>
        </span>
      ) : (
        <span className="flex min-w-0 items-center gap-1 truncate">
          {parts.model ? <ModelBrandIcon modelId={parts.model} size={13} className="shrink-0" /> : null}
          <span className="truncate">{parts.archive || parts.model || text}</span>
        </span>
      )}
    </span>
  )
}
