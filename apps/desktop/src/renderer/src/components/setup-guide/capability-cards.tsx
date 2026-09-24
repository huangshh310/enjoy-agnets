/**
 * 能力页：左边名单，右边说明。版式对齐欢迎窗的导览，不链到外部文档。
 */
import { useState } from "react"
import { RiContrast2Line, RiGitCommitLine, RiRobot2Line, RiTimerLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"

const CARDS = [
  {
    id: "engines",
    icon: RiRobot2Line,
    label: "settings.setupGuide.capEngines",
    title: "settings.setupGuide.capEnginesTitle",
    body: "settings.setupGuide.capEnginesBody",
    points: ["settings.setupGuide.capEnginesA", "settings.setupGuide.capEnginesB", "settings.setupGuide.capEnginesC", "settings.setupGuide.capEnginesD"]
  },
  {
    id: "surface",
    icon: RiContrast2Line,
    label: "settings.setupGuide.capSurface",
    title: "settings.setupGuide.capSurfaceTitle",
    body: "settings.setupGuide.capSurfaceBody",
    points: ["settings.setupGuide.capSurfaceA", "settings.setupGuide.capSurfaceB", "settings.setupGuide.capSurfaceC", "settings.setupGuide.capSurfaceD"]
  },
  {
    id: "review",
    icon: RiGitCommitLine,
    label: "settings.setupGuide.capReview",
    title: "settings.setupGuide.capReviewTitle",
    body: "settings.setupGuide.capReviewBody",
    points: ["settings.setupGuide.capReviewA", "settings.setupGuide.capReviewB", "settings.setupGuide.capReviewC", "settings.setupGuide.capReviewD"]
  },
  {
    id: "auto",
    icon: RiTimerLine,
    label: "settings.setupGuide.capAuto",
    title: "settings.setupGuide.capAutoTitle",
    body: "settings.setupGuide.capAutoBody",
    points: ["settings.setupGuide.capAutoA", "settings.setupGuide.capAutoB", "settings.setupGuide.capAutoC", "settings.setupGuide.capAutoD"]
  }
] as const

export function CapabilityCards() {
  const t = useT()
  const [selectedId, setSelectedId] = useState<(typeof CARDS)[number]["id"]>("engines")
  const selected = CARDS.find((card) => card.id === selectedId) ?? CARDS[0]
  return (
    <div className="grid h-full min-h-0 flex-1 grid-cols-[220px_minmax(0,1fr)] gap-8">
      <div className="flex flex-col gap-0.5" role="tablist">
        {CARDS.map((card) => (
          <TourTab
            key={card.id}
            label={t(card.label)}
            selected={card.id === selected.id}
            onSelect={() => setSelectedId(card.id)}
            icon={card.icon}
          />
        ))}
      </div>
      <TourPanel title={t(selected.title)} body={t(selected.body)} points={selected.points.map((key) => t(key))} />
    </div>
  )
}

function TourTab({
  label,
  selected,
  onSelect,
  icon: Icon
}: {
  label: string
  selected: boolean
  onSelect: () => void
  icon: typeof RiRobot2Line
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onSelect}
      className={cx(
        "flex h-[34px] cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left text-[15px]",
        selected ? "bg-text-primary/5 text-text-primary" : "text-text-primary/70 hover:bg-text-primary/[0.03]"
      )}
    >
      <Icon className={cx("size-[15px] shrink-0", selected ? "text-text-primary" : "text-text-tertiary")} aria-hidden />
      <span className="truncate">{label}</span>
    </button>
  )
}

function TourPanel({ title, body, points }: { title: string; body: string; points: string[] }) {
  return (
    <div className="flex min-w-0 flex-col gap-3.5 pt-1.5" role="tabpanel">
      <h3 className="text-base font-medium tracking-[-0.005em] text-text-primary">{title}</h3>
      <p className="text-[15px] leading-relaxed text-text-secondary">{body}</p>
      <ul className="mt-1 flex flex-col gap-2">
        {points.map((point) => (
          <li key={point} className="flex items-center gap-2.5 text-[15px] text-text-primary/85">
            <span aria-hidden className="size-1 shrink-0 rounded-full bg-text-primary/40" />
            {point}
          </li>
        ))}
      </ul>
    </div>
  )
}
