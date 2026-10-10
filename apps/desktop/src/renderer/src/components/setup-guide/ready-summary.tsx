/**
 * 完成页摘要：只认 ready；引擎数只读 engineCount，不把引擎就绪写成可以开始。
 * ready + unverified 仍用「可以开始了」标题，只挂副标题。
 */
import { useThemeMode } from "@/components/application/theme/theme-toggle"
import { useT } from "@renderer/i18n"
import { joinSegments } from "@renderer/lib/join-segments"
import { showReadyUnverifiedHint } from "@renderer/lib/credential-check-ui"
import { defaultProviderLabel } from "@renderer/lib/default-provider-label"
import { useChatReadiness } from "@renderer/hooks/use-chat-readiness"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"

export function ReadySummary({ workspaceName }: { workspaceName: string }) {
  const t = useT()
  const theme = useThemeMode()
  const readiness = useChatReadiness().data
  const providers = useSettingsSnapshot().data?.providers ?? []
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
  const connected = readyConnectedLine(readiness, providers, t)
  const unverified = showReadyUnverifiedHint({
    ready,
    credentialState: readiness?.credentialCheck?.state
  })
  return (
    <div className="flex flex-col items-center gap-1">
      <p data-testid="ready-ok-summary" className="text-center text-headline-regular leading-normal text-text-secondary">
        {joinSegments(
          connected,
          t("settings.setupGuide.readyEngines", { count: engineCount }),
          themeLabel,
          workspace
        )}
      </p>
      {unverified ? (
        <p data-testid="ready-unverified-hint" className="text-center text-caption-1-regular text-text-tertiary">
          {t("settings.setupGuide.readyUnverifiedHint")}
        </p>
      ) : null}
    </div>
  )
}

function readyConnectedLine(
  readiness: ReturnType<typeof useChatReadiness>["data"],
  providers: Array<{ id: string; name: string }>,
  t: (path: string, vars?: Record<string, string | number>) => string
): string {
  const model = readiness?.defaultRoute?.modelId?.trim()
  if (!model) return ""
  const name = defaultProviderLabel(readiness, providers, "")
  if (!name) return ""
  return t("settings.setupGuide.readyConnected", { name, model })
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
