/**
 * 活跃矩阵热力图：7 行微单元格，Weekly / Monthly / Yearly，0 阶可见灰底。
 */
import { useState } from "react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { HEATMAP_LEVEL_CLASSES } from "../constants"
import type { HeatmapCellData, HeatmapPeriod } from "../types/profile.types"

interface ProfileActivityHeatmapProps {
  data: HeatmapCellData[]
  period: HeatmapPeriod
  onPeriodChange: (period: HeatmapPeriod) => void
  hideHeader?: boolean
}

export function ProfileActivityHeatmap({
  data,
  period,
  onPeriodChange,
  hideHeader
}: ProfileActivityHeatmapProps) {
  const t = useT()
  const [hoveredCell, setHoveredCell] = useState<HeatmapCellData | null>(null)
  const numRows = 7
  const numCols = Math.ceil(data.length / numRows)
  const columns: HeatmapCellData[][] = []

  for (let col = 0; col < numCols; col += 1) {
    const week: HeatmapCellData[] = []
    for (let row = 0; row < numRows; row += 1) {
      const cell = data[col * numRows + row]
      if (cell) week.push(cell)
    }
    columns.push(week)
  }

  const startDate = data[0]?.date ?? ""

  return (
    <div className="flex w-full select-none flex-col gap-2 pt-1">
      {!hideHeader ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-caption-1-medium text-text-primary">{t("pages.account.heatmap.activity")}</span>
            {hoveredCell ? (
              <span className="font-mono text-caption-2-medium text-text-tertiary">
                {t("pages.account.heatmap.count", { n: hoveredCell.count })} ·{" "}
                <strong className="text-accent-500">{hoveredCell.date}</strong>
              </span>
            ) : (
              <span className="hidden font-mono text-caption-2-medium text-text-tertiary sm:inline">
                {t(`pages.account.heatmap.${period}`)} {t("pages.account.heatmap.periodHintSuffix")}
              </span>
            )}
          </div>

          <div className="flex items-center rounded-lg border border-separator-border/70 bg-background-secondary-default/60 p-0.5 text-caption-2-medium">
            {(["weekly", "monthly", "yearly"] as HeatmapPeriod[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onPeriodChange(item)}
                className={cx(
                  "cursor-pointer rounded-md px-2 py-0.5 capitalize transition-all",
                  period === item
                    ? "bg-background-primary-default text-text-primary shadow-2xs"
                    : "text-text-tertiary hover:text-text-primary"
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="w-full overflow-x-auto pb-1">
        <div className="flex w-full min-w-[640px] items-stretch justify-between gap-[3px]">
          {columns.map((week, colIdx) => (
            <div key={week[0]?.date ?? colIdx} className="flex flex-1 flex-col gap-[3px]">
              {week.map((cell) => (
                <div
                  key={cell.date}
                  onMouseEnter={() => setHoveredCell(cell)}
                  onMouseLeave={() => setHoveredCell(null)}
                  className={cx(
                    "aspect-square w-full cursor-pointer rounded-[2.5px] transition-all",
                    HEATMAP_LEVEL_CLASSES[cell.level]
                  )}
                  title={t("pages.account.heatmap.tooltip", { date: cell.date, n: cell.count })}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-0.5 font-mono text-caption-2-medium text-text-tertiary">
        <span>
          {hoveredCell ? (
            <span className="text-text-primary">
              <strong className="text-accent-500 font-semibold">{hoveredCell.date}</strong> · {t("pages.account.heatmap.count", { n: hoveredCell.count })}
            </span>
          ) : (
            startDate ? `${startDate} ~ ${t("pages.account.heatmap.today")}` : t("pages.account.heatmap.today")
          )}
        </span>
        <div className="flex items-center gap-1.5">
          <span>{t("pages.account.heatmap.less")}</span>
          <div className="flex items-center gap-[2.5px]">
            {([0, 1, 2, 3, 4] as const).map((level) => (
              <span
                key={level}
                className={cx("size-2.5 rounded-[2px]", HEATMAP_LEVEL_CLASSES[level])}
              />
            ))}
          </div>
          <span>{t("pages.account.heatmap.more")}</span>
        </div>
      </div>
    </div>
  )
}
