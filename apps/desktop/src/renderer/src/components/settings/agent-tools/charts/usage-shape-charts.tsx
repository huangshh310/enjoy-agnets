/**
 * EvilCharts 形状图种：雷达、径向预算、健康度半环、骑行摘要、Sankey。
 */
import {
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Sankey,
  Tooltip
} from "recharts"
import { useT } from "@renderer/i18n"
import { formatTokens } from "../format-spend"
import { SpendChartTooltip } from "./spend-chart-tooltip"
import type { UsageChartModel } from "./usage-chart-data"
import { UsageChartCard } from "./usage-chart-card"

export type ShapeChartView = "radar" | "radial" | "reliability" | "ride" | "sankey"

export function UsageShapeGallery({ model, view }: { model: UsageChartModel; view: ShapeChartView }) {
  const t = useT()
  const healthLabel =
    model.health >= 820
      ? t("pages.observability.usageShape.healthGood")
      : model.health >= 650
        ? t("pages.observability.usageShape.healthFair")
        : model.health >= 450
          ? t("pages.observability.usageShape.healthTight")
          : t("pages.observability.usageShape.healthLow")

  if (view === "radar") {
    return (
      <UsageChartCard title={t("pages.observability.usageShape.radarTitle")} hint={t("pages.observability.usageShape.radarHint")}>
        <ResponsiveContainer width="100%" height={240}>
          <RadarChart data={model.radar}>
            <PolarGrid stroke="var(--color-separator-border)" />
            <PolarAngleAxis dataKey="axis" tick={{ fill: "var(--color-text-tertiary)", fontSize: 11 }} />
            {model.series.map((item) => (
              <Radar key={item.id} name={item.label} dataKey={item.id} stroke={item.color} fill={item.color} fillOpacity={0.18} />
            ))}
            <Tooltip content={<SpendChartTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </UsageChartCard>
    )
  }
  if (view === "radial") {
    return (
      <UsageChartCard title={t("pages.observability.usageShape.radialTitle")} hint={t("pages.observability.usageShape.radialHint")}>
        {model.windows.length === 0 ? (
          <p className="py-10 text-center text-caption-2-medium text-text-tertiary">{t("pages.observability.usageShape.noWindows")}</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <RadialBarChart
              innerRadius="18%"
              outerRadius="98%"
              data={model.windows.map((item) => ({ ...item, name: item.label, value: item.used }))}
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar dataKey="value" background={{ fill: "var(--color-separator-border)" }} cornerRadius={6}>
                {model.windows.map((item) => (
                  <Cell key={item.id} fill={item.color} />
                ))}
              </RadialBar>
              <Tooltip content={<SpendChartTooltip formatValue={(n) => `${Math.round(n)}%`} />} />
            </RadialBarChart>
          </ResponsiveContainer>
        )}
      </UsageChartCard>
    )
  }
  if (view === "reliability") {
    return (
      <UsageChartCard title={t("pages.observability.usageShape.reliabilityTitle")} hint={t("pages.observability.usageShape.reliabilityHint")}>
        <div className="relative mx-auto h-[200px] w-full max-w-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[
                  { name: "score", value: model.health },
                  { name: "rest", value: Math.max(0, 1000 - model.health) }
                ]}
                dataKey="value"
                startAngle={180}
                endAngle={0}
                innerRadius={62}
                outerRadius={84}
                stroke="none"
              >
                <Cell fill={healthFill(model.health)} />
                <Cell fill="var(--color-separator-border)" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-6 text-center">
            <span className="font-mono text-title-2-semibold tabular-nums text-text-primary">{model.health}</span>
            <span className="text-caption-2-medium text-text-tertiary">{healthLabel}</span>
          </div>
        </div>
        <div className="mt-2 flex h-1.5 overflow-hidden rounded-full">
          <span className="flex-[450] bg-text-error-primary" />
          <span className="flex-[200] bg-status-yellow-text" />
          <span className="flex-[170] bg-accent-400" />
          <span className="flex-[180] bg-accent-600" />
        </div>
        <div className="mt-1 flex justify-between text-caption-2-medium text-text-tertiary">
          <span>0</span>
          <span>450</span>
          <span>650</span>
          <span>820</span>
          <span>1000</span>
        </div>
      </UsageChartCard>
    )
  }
  if (view === "ride") {
    return (
      <UsageChartCard title={t("pages.observability.usageShape.rideTitle")} hint={t("pages.observability.usageShape.rideHint")}>
        <div className="grid grid-cols-2 gap-3">
          <MiniRing label={t("pages.observability.usageShape.ringWindows")} value={String(model.windows.length)} ratio={model.windows.length / Math.max(8, model.windows.length)} />
          <MiniRing label={t("pages.observability.usageShape.ringAgents")} value={String(model.series.length)} ratio={model.series.length / Math.max(6, model.series.length)} />
          <MiniRing
            label={t("pages.observability.usageShape.ringThisWeek")}
            value={formatTokens(model.thisWeek)}
            ratio={model.thisWeek / Math.max(model.thisWeek, model.lastWeek, 1)}
          />
          <MiniRing
            label={t("pages.observability.usageShape.ringLastWeek")}
            value={formatTokens(model.lastWeek)}
            ratio={model.lastWeek / Math.max(model.thisWeek, model.lastWeek, 1)}
          />
        </div>
      </UsageChartCard>
    )
  }
  return (
      <UsageChartCard title={t("pages.observability.usageShape.sankeyTitle")} hint={t("pages.observability.usageShape.sankeyHint")}>
        {model.sankey.links.length === 0 ? (
          <p className="py-10 text-center text-caption-2-medium text-text-tertiary">{t("pages.observability.usageShape.noFlow")}</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <Sankey
              data={model.sankey}
              nodePadding={18}
              nodeWidth={12}
              linkCurvature={0.5}
              margin={{ top: 8, right: 120, bottom: 8, left: 8 }}
            >
              <Tooltip
                content={<SpendChartTooltip formatValue={model.metric === "cost" ? (n) => `$${n.toFixed(0)}` : formatTokens} />}
              />
            </Sankey>
          </ResponsiveContainer>
        )}
      </UsageChartCard>
  )
}

function MiniRing({ label, value, ratio }: { label: string; value: string; ratio: number }) {
  const pct = Math.min(100, Math.max(0, ratio * 100))
  return (
    <div className="flex items-center gap-3 rounded-xl bg-background-secondary-default/40 px-3 py-2">
      <div
        className="size-10 shrink-0 rounded-full"
        style={{
          background: `conic-gradient(var(--color-accent-500) ${pct}%, var(--color-separator-border) 0)`
        }}
      />
      <div className="min-w-0">
        <p className="text-caption-2-medium text-text-tertiary">{label}</p>
        <p className="font-mono text-body-medium tabular-nums text-text-primary">{value}</p>
      </div>
    </div>
  )
}

function healthFill(score: number) {
  if (score >= 820) return "var(--color-accent-600)"
  if (score >= 650) return "var(--color-accent-500)"
  if (score >= 450) return "var(--color-status-yellow-text)"
  return "var(--color-text-error-primary)"
}


