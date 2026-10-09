import type { ReactNode } from "react"
import { cx } from "@/utils/cx"

const CARD_TITLE = "text-text-primary"
const CARD_TITLE_DENSE = "px-4 pt-2.5 pb-1 text-caption-1-semibold"
const CARD_TITLE_REGULAR = "px-5 pt-4 pb-1 text-body-medium"

export function SettingsCard({
  title,
  children,
  id,
  dense
}: {
  title?: string
  children: ReactNode
  id?: string
  /** 供应商列表用更矮的标题，避免选项行被卡片头撑开。 */
  dense?: boolean
}) {
  return (
    <section
      id={id}
      className="settings-card overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default"
    >
      {title ? (
        <h3 className={cx(CARD_TITLE, dense ? CARD_TITLE_DENSE : CARD_TITLE_REGULAR)}>
          {title}
        </h3>
      ) : null}
      <div className="divide-y divide-separator-border">{children}</div>
    </section>
  )
}

export function SettingsRow({
  title,
  description,
  children,
  align = "center"
}: {
  title: string
  description?: ReactNode
  children: ReactNode
  align?: "center" | "start"
}) {
  return (
    <div className={cx("flex gap-6 px-5 py-4", align === "center" ? "items-center" : "items-start")}>
      <div className="min-w-0 flex-1">
        <p className="text-body-medium text-text-primary">{title}</p>
        {description ? (
          <div className="mt-1 max-w-xl text-caption-1-medium text-text-secondary">{description}</div>
        ) : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export function SettingsComingSoon({ body }: { body: string }) {
  return (
    <p className="max-w-lg text-body-medium text-text-secondary">{body}</p>
  )
}
