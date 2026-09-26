/**
 * 完成页：标题下的一行摘要，正文是今天用得上的快捷键。
 */
import { useThemeMode } from "@/components/application/theme/theme-toggle"
import { composerAgentTabs } from "@renderer/components/ai-chat/agent-picker/composer-agents"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { useT } from "@renderer/i18n"
import { guideEngineShowsReady } from "./guide-engine-ready"

export function ReadySummary({ workspaceName }: { workspaceName: string }) {
  const t = useT()
  const theme = useThemeMode()
  const tools = composerAgentTabs(useSettingsSnapshot().data?.agentTools ?? [])
  const ready = tools.filter(guideEngineShowsReady).length
  const themeLabel = theme === "dark" ? t("common.dark") : t("common.light")
  const workspace = workspaceName
    ? t("settings.setupGuide.readyWorkspace", { name: workspaceName })
    : t("settings.setupGuide.readyNoWorkspace")
  return (
    <p className="text-center text-headline-regular leading-normal text-text-secondary">
      {[t("settings.setupGuide.readyEngines", { count: ready }), themeLabel, workspace].join(" · ")}
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
