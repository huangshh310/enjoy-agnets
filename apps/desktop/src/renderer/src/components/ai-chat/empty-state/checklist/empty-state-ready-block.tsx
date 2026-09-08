/**
 * 已检测默认折叠：「已就绪 N 个」+ 品牌芯片；展开才列全名。
 */
import { useState } from "react"
import { RiArrowDownSLine } from "@remixicon/react"
import { useT } from "@renderer/i18n"
import { AgentBrandIcon } from "../../agent-picker/agent-brand-icon"

const READY_CHIP_CAP = 6

export type ReadyAgentChip = {
  id: string
  label: string
}

export function EmptyStateReadyBlock({ ready }: { ready: ReadyAgentChip[] }) {
  const t = useT()
  const [open, setOpen] = useState(false)

  if (ready.length === 0) {
    return (
      <section className="h-auto rounded-2xl border border-border-button-default bg-background-secondary-default px-3 py-2">
        <h2 className="text-caption-2-medium text-text-tertiary">{t("chat.emptyDetected")}</h2>
        <p className="mt-1.5 text-caption-1-regular text-text-tertiary">{t("chat.emptyDetectedNone")}</p>
      </section>
    )
  }

  return (
    <section className="h-auto rounded-2xl border border-border-button-default bg-background-secondary-default px-3 py-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full min-w-0 items-center justify-between gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
      >
        <span className="flex min-w-0 items-center gap-2">
          <ReadyBrandChips ready={ready} />
          <span className="truncate text-caption-1-medium text-text-primary">
            {t("chat.emptyReadyCount", { count: ready.length })}
          </span>
        </span>
        <RiArrowDownSLine
          className={`size-4 shrink-0 text-text-tertiary transition-transform ${open ? "rotate-180" : ""}`}
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
    <span className="flex shrink-0 items-center gap-0.5">
      {visible.map((item) => (
        <span key={item.id} title={item.label} className="inline-flex">
          <AgentBrandIcon id={item.id} size={14} />
        </span>
      ))}
      {extra > 0 ? <span className="text-caption-2-medium text-text-tertiary">+{extra}</span> : null}
    </span>
  )
}

function ReadyAgentList({ ready }: { ready: ReadyAgentChip[] }) {
  return (
    <ul className="mt-1.5 flex flex-col gap-1">
      {ready.map((item) => (
        <li key={item.id} className="flex min-h-7 items-center gap-2 text-caption-1-medium text-text-primary">
          <AgentBrandIcon id={item.id} size={14} />
          <span className="truncate">{item.label}</span>
        </li>
      ))}
    </ul>
  )
}
