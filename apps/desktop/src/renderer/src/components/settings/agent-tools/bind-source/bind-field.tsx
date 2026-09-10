/**
 * 「这个助手用」字段皮：标签在上，双行触发器（品牌井 + 主名 + 人话副行）。
 * 账号行和模型行共用，避免两只无标签下拉长得一样。
 */
import type { ReactNode } from "react"
import { RiArrowDownSLine } from "@remixicon/react"

export const BIND_TRIGGER_CLASS =
  "flex w-full items-center gap-2.5 rounded-2xl border border-border-button-default bg-background-primary-default px-3 py-2.5 text-left shadow-2xs outline-none transition-all duration-200 hover:border-border-button-hover hover:bg-background-secondary-hover focus:ring-1 focus:ring-accent-500 active:scale-[0.99]"

export function BindField({
  label,
  children
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-caption-2-medium text-text-secondary">{label}</p>
      {children}
    </div>
  )
}

export function BindMarkWell({ children }: { children: ReactNode }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-background-secondary-default">
      {children}
    </span>
  )
}

export function BindLines({
  title,
  subtitle
}: {
  title: string
  subtitle?: string
}) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block truncate text-caption-1-medium text-text-primary">{title}</span>
      {subtitle ? (
        <span className="mt-0.5 block truncate text-caption-2-regular text-text-tertiary">{subtitle}</span>
      ) : null}
    </span>
  )
}

export function BindTriggerFace({
  leading,
  title,
  subtitle
}: {
  leading: ReactNode
  title: string
  subtitle?: string
}) {
  return (
    <>
      <BindMarkWell>{leading}</BindMarkWell>
      <BindLines title={title} subtitle={subtitle} />
      <RiArrowDownSLine className="size-4 shrink-0 text-text-tertiary" />
    </>
  )
}

export function BindMenuFace({
  leading,
  title,
  subtitle
}: {
  leading?: ReactNode
  title: string
  subtitle?: string
}) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2.5">
      {leading ? <span className="flex size-5 shrink-0 items-center justify-center">{leading}</span> : null}
      <BindLines title={title} subtitle={subtitle} />
    </span>
  )
}
