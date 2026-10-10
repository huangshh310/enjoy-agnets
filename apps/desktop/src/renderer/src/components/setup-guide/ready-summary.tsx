/**
 * 完成页摘要：只认 ready；引擎数只读 engineCount，不把引擎就绪写成可以开始。
 */
import { useThemeMode } from "@/components/application/theme/theme-toggle"
import { useT } from "@renderer/i18n"
import { joinSegments } from "@renderer/lib/join-segments"
import { useChatReadiness } from "@renderer/hooks/use-chat-readiness"

export function ReadySummary({ workspaceName }: { workspaceName: string }) {
  const t = useT()
  const theme = useThemeMode()
  const readiness = useChatReadiness().data
  const ready = readiness?.ready === true
  const engineCount = readiness?.engineCount ?? 0
  if (!ready) {
    return (
      <p data-testid="ready-need-summary" className="text-center text-headline-regular leading-normal text-text-secondary">
        {t("settings.setupGuide.readyNeedSummary", { count: engineCount })}
      </p>
    )
  }
  const themeLabel = theme === "dark" ? t("common.dark") : t("common.light")
  const workspace = workspaceName
    ? t("settings.setupGuide.readyWorkspace", { name: workspaceName })
    : t("settings.setupGuide.readyNoWorkspace")
  const unverified = (readiness.localModels ?? []).some((row) => row.verified === false)
  return (
    <p data-testid="ready-ok-summary" className="text-center text-headline-regular leading-normal text-text-secondary">
      {joinSegments(
        t("settings.setupGuide.readyEngines", { count: engineCount }),
        unverified ? t("settings.setupGuide.configuredUnverified") : undefined,
        themeLabel,
        workspace
      )}
    </p>
  )
}

const SHORTCUTS = [
  { label: "settings.setupGuide.shortcutSettings", keys: ["⌘", ","] },
  { label: "settings.setupGuide.shortcutApproval", keys: ["⇧", "Tab"] },
  { label: "settings.setupGuide.shortcutFind", keys: ["⌘", "F"] }
] as const

export function ReadyShortcuts() {
  const t = useT()
  const mod = navigator.platform.includes("Mac") ? "⌘" : "Ctrl"
  return (
    <div className="flex flex-col gap-3.5 px-28">
      <p className="text-caption-1-medium font-medium text-text-tertiary uppercase">
        {t("settings.setupGuide.shortcutsToday")}
      </p>
      <dl className="grid grid-cols-1 gap-x-10 gap-y-2.5 sm:grid-cols-2">
        {SHORTCUTS.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3">
            <dt className="text-headline-regular text-text-primary/85">{t(item.label)}</dt>
            <dd className="flex items-center gap-1">
              {item.keys.map((key) => (
                <kbd key={key} className="rounded-md border border-text-primary/15 px-1.5 py-0.5 text-caption-1-regular text-text-primary">
                  {key === "⌘" ? mod : key}
                </kbd>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
