/**
 * 本机助手官方思考档：和 Enjoy 本地同一张能量面板，名字中文，值仍是 CLI 的档。
 */
import type { SessionConfigOption } from "@enjoy-agents/ipc-contract"
import { RiBrainLine, RiCheckLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { IndexedEnergyBar } from "../../reasoning-energy-bar"
import { thoughtChoiceCopy, thoughtToneAt } from "./thought-choice-copy"

export function AdvertisedThoughtMenu({
  option,
  current,
  onChange,
  onClose
}: {
  option: SessionConfigOption
  current: string | undefined
  onChange: (value: string) => void
  onClose: () => void
}) {
  const t = useT()
  const index = Math.max(0, option.choices.findIndex((item) => item.value === current))
  const tone = thoughtToneAt(index, option.choices.length)
  const currentCopy = thoughtChoiceCopy(option.choices[index]?.value ?? "", option.choices[index]?.name ?? "", t)
  return (
    <div className="w-72 rounded-2xl border border-border-button-default bg-background-primary-default p-2.5 shadow-card">
      <ThoughtHead toneClass={tone.iconColorClass} badgeClass={tone.badgeClass} index={index + 1} label={currentCopy.short} />
      <div className="mb-1.5 flex flex-col gap-1.5 rounded-xl border border-border-button-default/80 bg-background-secondary-default/40 p-2.5">
        <IndexedEnergyBar
          count={option.choices.length}
          index={index}
          fillClass={cx(tone.barGradient, tone.glowClass)}
          onIndex={(next) => {
            const choice = option.choices[next]
            if (choice) onChange(choice.value)
          }}
        />
        <ThoughtEnds />
      </div>
      <div className="mt-1.5 flex flex-col gap-0.5 border-t border-separator-border pt-1.5">
        {option.choices.map((choice, row) => (
          <ThoughtRow
            key={choice.value}
            name={choice.name}
            value={choice.value}
            index={row}
            count={option.choices.length}
            selected={choice.value === current}
            onPick={() => {
              onChange(choice.value)
              onClose()
            }}
          />
        ))}
      </div>
    </div>
  )
}

function ThoughtHead({
  toneClass,
  badgeClass,
  index,
  label
}: {
  toneClass: string
  badgeClass: string
  index: number
  label: string
}) {
  const t = useT()
  return (
    <div className="flex items-center justify-between px-1 pt-0.5 pb-2">
      <div className="flex items-center gap-1.5">
        <RiBrainLine className={cx("size-4", toneClass)} />
        <span className="text-caption-1-medium text-text-primary">{t("chat.effortEnergy")}</span>
      </div>
      <span className={cx("rounded-full border px-2 py-0.5 text-caption-2-medium", badgeClass)}>
        {t("chat.effortLevel", { index, label })}
      </span>
    </div>
  )
}

function ThoughtEnds() {
  const t = useT()
  return (
    <div className="flex items-center justify-between px-0.5 text-caption-2-medium text-text-tertiary">
      <span>{t("chat.effortFast")}</span>
      <span>{t("chat.effortBalanced")}</span>
      <span>{t("chat.effortDeep")}</span>
    </div>
  )
}

function ThoughtRow({
  name,
  value,
  index,
  count,
  selected,
  onPick
}: {
  name: string
  value: string
  index: number
  count: number
  selected: boolean
  onPick: () => void
}) {
  const t = useT()
  const copy = thoughtChoiceCopy(value, name, t)
  const tone = thoughtToneAt(index, count)
  return (
    <button
      type="button"
      onClick={onPick}
      className={cx(
        "flex w-full cursor-pointer items-center justify-between rounded-xl px-2.5 py-1.5 text-left",
        selected ? tone.activeBgClass : "text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary"
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className={cx("size-2 shrink-0 rounded-full", selected ? tone.barGradient : "bg-border-button-default")} />
        <span className="flex min-w-0 flex-col">
          <span className="text-caption-1-medium text-text-primary">{copy.label} ({copy.short})</span>
          {copy.desc ? <span className="truncate text-caption-2-medium text-text-tertiary">{copy.desc}</span> : null}
        </span>
      </span>
      {selected ? <RiCheckLine className={cx("size-4 shrink-0", tone.iconColorClass)} /> : null}
    </button>
  )
}
