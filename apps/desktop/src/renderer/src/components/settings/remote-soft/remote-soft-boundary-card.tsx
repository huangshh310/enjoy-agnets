/**
 * P2 Remote soft：设置 → 关于 Enjoy「本机跑、异地控」只读诚实边界卡。
 * 可折叠不可永久 dismiss；无启用开关 / 无隧道 / pairing / 手机 CTA。
 */
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"
import {
  readRemoteSoftCardCollapsed,
  writeRemoteSoftCardCollapsed
} from "./remote-soft-card-collapsed"

export function RemoteSoftBoundaryCard() {
  const t = useT()
  const [collapsed, setCollapsed] = useState(() => readRemoteSoftCardCollapsed())

  function setCollapsedPref(next: boolean) {
    setCollapsed(next)
    writeRemoteSoftCardCollapsed(next)
  }

  if (collapsed) {
    return (
      <section
        id="remote-soft-boundary"
        data-testid="remote-soft-boundary-card"
        data-state="collapsed"
        className="overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default shadow-2xs"
      >
        <button
          type="button"
          data-testid="remote-soft-boundary-expand"
          className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-background-secondary-default/50"
          onClick={() => setCollapsedPref(false)}
          aria-expanded={false}
        >
          <span className="text-body-medium text-text-primary">
            {t("settings.remoteSoft.collapsedSummary")}
          </span>
          <span className="shrink-0 rounded-full border border-border-button-default bg-background-primary-default px-2.5 py-0.5 text-caption-2-medium text-text-tertiary">
            {t("settings.remoteSoft.expand")}
          </span>
        </button>
      </section>
    )
  }

  const boundaries = [
    t("settings.remoteSoft.boundaryOnline"),
    t("settings.remoteSoft.boundaryNoMobile"),
    t("settings.remoteSoft.boundaryTrend"),
    t("settings.remoteSoft.boundaryNotSsh")
  ]

  return (
    <section
      id="remote-soft-boundary"
      data-testid="remote-soft-boundary-card"
      data-state="expanded"
      className="flex flex-col gap-4 rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-2xs"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-title-3-semibold text-text-primary">{t("settings.remoteSoft.title")}</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="remote-soft-boundary-collapse"
          className="shrink-0 rounded-full"
          onClick={() => setCollapsedPref(true)}
          aria-expanded={true}
        >
          {t("settings.remoteSoft.collapse")}
        </Button>
      </div>

      <p className="text-caption-1-regular leading-relaxed text-text-secondary">
        {t("settings.remoteSoft.lead")}
      </p>

      <ul className="flex flex-col gap-2.5">
        {boundaries.map((line) => (
          <li key={line} className="flex items-start gap-2.5 text-caption-1-regular text-text-primary">
            <span
              aria-hidden
              className="mt-1.5 size-2 shrink-0 rounded-full bg-accent-500/70"
            />
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <p
        data-testid="remote-soft-trend-aside"
        className="rounded-lg bg-background-secondary-default/80 px-3 py-2 text-caption-2-regular leading-relaxed text-text-tertiary"
      >
        <span className="mb-1 block text-caption-2-semibold uppercase tracking-wide text-text-tertiary">
          {t("settings.remoteSoft.trendLabel")}
        </span>
        {t("settings.remoteSoft.trendAside")}
      </p>

      <p className="rounded-xl border border-dashed border-border-button-default bg-background-secondary-default/40 px-3.5 py-2.5 text-caption-2-regular leading-relaxed text-text-tertiary">
        {t("settings.remoteSoft.footnote")}
      </p>
    </section>
  )
}
