/**
 * 未安装：元数据条上的折叠；展开用下拉，有就绪时默认收起。
 */
import { useState } from "react"
import { RiArrowDownSLine } from "@remixicon/react"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { EmptyStateMissingRow } from "./empty-state-missing-row"

export function EmptyStateMissingBlock({
  missing,
  defaultOpen
}: {
  missing: AgentToolPublic[]
  defaultOpen: boolean
}) {
  const t = useT()
  const [userOpen, setUserOpen] = useState<boolean | null>(null)
  const open = userOpen ?? defaultOpen

  if (missing.length === 0) {
    return (
      <p className="sr-only">
        {t("chat.emptyMissing")} {t("chat.emptyMissingNone")}
      </p>
    )
  }

  return (
    <section className="relative">
      <button
        type="button"
        onClick={() => setUserOpen(!open)}
        aria-expanded={open}
        className="flex items-center gap-1 rounded-full px-2.5 py-1 outline-none hover:bg-background-primary-default focus-visible:ring-2 focus-visible:ring-border-focus-ring"
      >
        <span className="text-caption-2-medium text-text-tertiary">
          {t("chat.emptyMissingCount", { count: missing.length })}
        </span>
        <RiArrowDownSLine
          className={`size-3.5 shrink-0 text-text-tertiary transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open ? (
        <ul className="absolute top-[calc(100%+8px)] left-1/2 z-20 w-64 -translate-x-1/2 rounded-2xl border border-border-button-default bg-background-primary-default p-1.5 shadow-card">
          {missing.map((item) => (
            <EmptyStateMissingRow key={item.id} agent={item} />
          ))}
        </ul>
      ) : null}
    </section>
  )
}
