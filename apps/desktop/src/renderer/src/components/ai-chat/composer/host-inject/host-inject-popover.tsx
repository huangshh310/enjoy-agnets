/**
 * 注入芯片 Popover：已启用 / 已注入 / 不支持诚实卡 / 单一「管理扩展」。
 * 长脚注只在这里，不进 Composer 表面。
 */
import { useNavigate } from "@tanstack/react-router"
import { useT } from "@renderer/i18n"
import { hostInjectCountLane, type HostInjectBarView } from "./host-inject-view.ts"

export function HostInjectPopover({
  view,
  enabledMcp,
  enabledSkills
}: {
  view: Exclude<HostInjectBarView, { kind: "hidden" }>
  enabledMcp: number
  enabledSkills: number
}) {
  const t = useT()
  const navigate = useNavigate()
  return (
    <div className="w-[260px] overflow-hidden">
      <header className="border-b border-separator-border px-3 py-2">
        <p className="text-caption-1-semibold text-text-primary">{t("chat.hostInjectPopoverTitle")}</p>
        <p className="mt-0.5 text-caption-2-regular text-text-tertiary">{t("chat.hostInjectFootnote")}</p>
      </header>
      <dl className="space-y-1.5 px-3 py-2 text-caption-2-medium">
        <Row label={t("chat.hostInjectEnabledLabel")} value={countPair(t, enabledMcp, enabledSkills)} />
        {view.kind === "injected" ? (
          <Row
            label={t("chat.hostInjectedLabel")}
            value={injectedPair(t, view.mcp, view.skills)}
          />
        ) : null}
        {view.kind === "unsupported" ? <UnsupportedLines view={view} /> : null}
        {view.kind === "failed" ? (
          <p className="text-caption-2-regular text-text-warning-primary">
            {t("chat.hostInjectSkipped", { names: view.skipped.map((item) => item.name).join(" · ") })}
          </p>
        ) : null}
        {view.kind === "injected" && view.skipped.length > 0 ? (
          <p className="text-caption-2-regular text-text-warning-primary">
            {t("chat.hostInjectSkipped", { names: view.skipped.map((item) => item.name).join(" · ") })}
          </p>
        ) : null}
        {view.kind !== "unsupported" && view.kind !== "failed" ? (
          <p className="text-caption-2-regular text-text-secondary">{t("chat.hostInjectEngineSupported")}</p>
        ) : null}
      </dl>
      <button
        type="button"
        onClick={() => void navigate({ to: "/settings/$section", params: { section: "extensions" } })}
        className="w-full border-t border-separator-border bg-background-secondary-default px-3 py-2 text-left text-caption-2-medium text-accent-600 hover:text-accent-500"
      >
        {t("chat.hostInjectManage")}
      </button>
    </div>
  )
}

function UnsupportedLines({ view }: { view: Extract<HostInjectBarView, { kind: "unsupported" }> }) {
  const t = useT()
  return (
    <>
      {view.mcp ? (
        <p className="text-caption-2-regular text-text-warning-primary">{t("chat.hostInjectMcpUnsupported")}</p>
      ) : null}
      {view.skills ? (
        <p className="text-caption-2-regular text-text-warning-primary">{t("chat.hostInjectSkillsUnsupported")}</p>
      ) : null}
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-text-tertiary">{label}</dt>
      <dd className="font-medium text-text-primary">{value}</dd>
    </div>
  )
}

function countPair(t: ReturnType<typeof useT>, mcp: number, skills: number): string {
  const lane = hostInjectCountLane(mcp, skills)
  if (lane === "both") return t("chat.hostInjectEnabledPair", { mcp, skills })
  if (lane === "mcp") return t("chat.hostInjectEnabledPairMcp", { mcp })
  if (lane === "skills") return t("chat.hostInjectEnabledPairSkills", { skills })
  return "—"
}

function injectedPair(t: ReturnType<typeof useT>, mcp: number, skills: number): string {
  const lane = hostInjectCountLane(mcp, skills)
  if (lane === "both") return t("chat.hostInjectedPair", { mcp, skills })
  if (lane === "mcp") return t("chat.hostInjectedPairMcp", { mcp })
  if (lane === "skills") return t("chat.hostInjectedPairSkills", { skills })
  return "—"
}
