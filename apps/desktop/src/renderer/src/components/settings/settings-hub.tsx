/**
 * 设置页顶部状态看板。
 * 与 Workspace / MCP / Git 等同构：图标井、标题、徽标、说明、可选操作、脉冲指标。
 */
import type { ComponentType, ReactNode } from "react"
import { cx } from "@/utils/cx"

type IconComponent = ComponentType<{
  className?: string
  "aria-hidden"?: boolean | "true" | "false"
}>

export type SettingsPulse = {
  label: string
  value: ReactNode
  tone?: "default" | "success" | "warning" | "danger"
}

export function SettingsHub({
  icon: Icon,
  title,
  badge,
  description,
  action,
  pulses,
  children
}: {
  icon: IconComponent
  title: string
  badge?: string
  description: string
  action?: ReactNode
  pulses?: SettingsPulse[]
  children?: ReactNode
}) {
  const pulseCols =
    (pulses?.length ?? 0) >= 4
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : (pulses?.length ?? 0) === 2
        ? "sm:grid-cols-2"
        : "sm:grid-cols-3"

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-accent-500/20 bg-accent-500/10 text-accent-500">
            <Icon className="size-6" aria-hidden />
          </div>
          <div className="flex min-w-0 flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-title-3-medium text-text-primary">{title}</span>
              {badge ? (
                <span className="shrink-0 rounded-md bg-background-secondary-default px-2 py-0.5 text-caption-2-medium text-text-tertiary">
                  {badge}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-caption-2-regular text-text-tertiary">{description}</p>
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {pulses && pulses.length > 0 ? (
        <div className={cx("grid grid-cols-1 gap-3 border-t border-separator-border pt-3", pulseCols)}>
          {pulses.map((pulse) => (
            <SettingsPulseStat key={pulse.label} {...pulse} />
          ))}
        </div>
      ) : null}
      {children}
    </section>
  )
}

function SettingsPulseStat({ label, value, tone = "default" }: SettingsPulse) {
  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-border-button-default bg-background-secondary-default/50 p-3">
      <span className="text-caption-2-medium text-text-tertiary">{label}</span>
      <span className={cx("mt-0.5 truncate text-headline-medium", pulseToneClass(tone))}>{value}</span>
    </div>
  )
}

function pulseToneClass(tone: SettingsPulse["tone"]) {
  if (tone === "success") return "text-state-success-text dark:text-state-success-text"
  if (tone === "warning") return "text-status-yellow-text dark:text-status-yellow-text"
  if (tone === "danger") return "text-text-error-primary dark:text-text-error-primary"
  return "text-text-primary"
}
