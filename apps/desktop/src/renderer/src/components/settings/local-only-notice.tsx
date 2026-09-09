/**
 * 设置里诚实空态：本地单机，没有云组织 / 已连接企业集成。
 */
import type { ReactNode } from "react"
import { RiInformationLine } from "@remixicon/react"

export function LocalOnlyNotice({
  title,
  body,
  action
}: {
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="flex items-start gap-3 rounded-2xl border border-separator-border/80 bg-background-secondary-default/60 p-5 shadow-2xs">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-accent-500/20 bg-accent-500/10 text-accent-500">
          <RiInformationLine className="size-5" />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-title-3-semibold text-text-primary">{title}</h2>
          <p className="text-caption-1-regular leading-relaxed text-text-tertiary">{body}</p>
          {action ? <div className="mt-2">{action}</div> : null}
        </div>
      </div>
    </div>
  )
}
