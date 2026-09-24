/**
 * 多家供应商时的二级下拉。只有一家时不画。
 */
import { useState } from "react"
import { RiArrowDownSLine, RiCheckLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import type { MenuGroup } from "./composer-model-menu-filter"

export function ComposerModelProviderDrop({
  groups,
  selectedKey,
  onSelect
}: {
  groups: readonly MenuGroup[]
  selectedKey: string
  onSelect: (key: string) => void
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const current = groups.find((group) => group.key === selectedKey) ?? groups[0]
  if (!current || groups.length < 2) return null
  return (
    <div className="relative border-b border-separator-border px-2 py-1.5">
      <button
        type="button"
        aria-expanded={open}
        aria-label={t("chat.activeProvider")}
        onClick={() => setOpen((value) => !value)}
        className={providerSwitchClass(open)}
      >
        <span className="shrink-0 rounded-md bg-accent-500/15 px-1.5 py-0.5 text-caption-2-medium text-accent-600">
          {t("chat.providersCount", { count: groups.length })}
        </span>
        <span className="min-w-0 flex-1 truncate text-caption-1-medium text-text-primary">{current.providerName}</span>
        <RiArrowDownSLine className={cx("size-4 shrink-0 text-text-secondary", open && "rotate-180")} aria-hidden />
      </button>
      {open ? (
        <ul className="no-scrollbar absolute inset-x-2 top-11 z-20 max-h-48 overflow-x-hidden overflow-y-auto rounded-lg border border-border-button-default bg-background-primary-default p-1 shadow-card">
          {groups.map((group) => (
            <li key={group.key}>
              <ProviderOption
                name={group.providerName}
                count={group.models.length}
                selected={group.key === current.key}
                onPick={() => {
                  onSelect(group.key)
                  setOpen(false)
                }}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function providerSwitchClass(open: boolean): string {
  return cx(
    "flex h-9 w-full items-center gap-2 rounded-lg border px-2 text-left shadow-2xs",
    open
      ? "border-accent-500 bg-accent-500/10"
      : "border-border-button-default bg-background-secondary-default hover:border-accent-500/50 hover:bg-accent-500/5"
  )
}

function ProviderOption({
  name,
  count,
  selected,
  onPick
}: {
  name: string
  count: number
  selected: boolean
  onPick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left hover:bg-background-secondary-hover"
    >
      <span className="min-w-0 flex-1 truncate text-caption-1-regular text-text-primary">{name}</span>
      <span className="text-caption-2-medium text-text-tertiary">{count}</span>
      {selected ? <RiCheckLine className="size-3.5 shrink-0 text-text-tertiary" aria-hidden /> : null}
    </button>
  )
}
