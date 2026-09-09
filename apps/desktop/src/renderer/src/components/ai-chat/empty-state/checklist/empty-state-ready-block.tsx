/**
 * 已检测：元数据条上的叠标 +「已就绪 N 个」；展开用下拉名单。
 */
import { useState } from "react"
import { RiArrowDownSLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { AgentBrandIcon } from "../../agent-picker/agent-brand-icon"

const READY_CHIP_CAP = 5

export type ReadyAgentChip = {
  id: string
  label: string
}

export function EmptyStateReadyBlock({ ready }: { ready: ReadyAgentChip[] }) {
  const t = useT()
  const [open, setOpen] = useState(false)

  if (ready.length === 0) {
    return (
      <section className="h-auto px-2 py-1 text-center">
        <h2 className="text-caption-2-medium text-text-tertiary">{t("chat.emptyDetected")}</h2>
        <p className="mt-1 text-caption-1-regular text-text-tertiary">{t("chat.emptyDetectedNone")}</p>
      </section>
    )
  }

  return (
    <section className="relative h-auto">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1 outline-none hover:bg-background-primary-default focus-visible:ring-2 focus-visible:ring-border-focus-ring"
      >
        <ReadyBrandChips ready={ready} />
        <span className="text-caption-2-medium text-text-secondary">
          {t("chat.emptyReadyCount", { count: ready.length })}
        </span>
        <RiArrowDownSLine
          className={`size-3.5 shrink-0 text-text-tertiary transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open ? <ReadyAgentList ready={ready} /> : null}
    </section>
  )
}

function ReadyBrandChips({ ready }: { ready: ReadyAgentChip[] }) {
  const visible = ready.slice(0, READY_CHIP_CAP)
  const extra = ready.length - visible.length
  return (
    <span className="flex shrink-0 items-center">
      {visible.map((item, index) => (
        <span
          key={item.id}
          title={item.label}
          className={cx(
            "relative inline-grid size-5 place-items-center rounded-full bg-background-primary-default",
            index > 0 && "-ml-1.5"
          )}
        >
          <AgentBrandIcon id={item.id} size={12} />
        </span>
      ))}
      {extra > 0 ? <span className="ml-1 text-caption-2-medium text-text-tertiary">+{extra}</span> : null}
    </span>
  )
}

function ReadyAgentList({ ready }: { ready: ReadyAgentChip[] }) {
  return (
    <ul className="absolute top-[calc(100%+8px)] left-1/2 z-20 w-52 -translate-x-1/2 rounded-2xl border border-border-button-default bg-background-primary-default p-1.5 shadow-card">
      {ready.map((item) => (
        <li
          key={item.id}
          className="flex h-8 items-center gap-2 rounded-lg px-2 text-caption-1-medium text-text-primary"
        >
          <AgentBrandIcon id={item.id} size={14} />
          <span className="truncate">{item.label}</span>
        </li>
      ))}
    </ul>
  )
}
