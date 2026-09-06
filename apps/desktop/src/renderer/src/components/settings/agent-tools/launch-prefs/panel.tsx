/**
 * 运行偏好：人话开关，不让用户手填 argv。
 */
import { RiFlashlightLine, RiGlobalLine } from "@remixicon/react"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { Switch } from "@/components/ui/switch"
import { useT } from "@renderer/i18n"
import type { AgentToolActions } from "../use-agent-tool-actions"
import { decodeLaunchArgs, encodeLaunchArgs, launchPrefsFor, type LaunchPrefId } from "./args"

export function AgentToolLaunchPrefs({
  tool,
  actions
}: {
  tool: AgentToolPublic
  actions: AgentToolActions
}) {
  const t = useT()
  const prefs = launchPrefsFor(tool.id)
  if (prefs.length === 0) return null
  const decoded = decodeLaunchArgs(tool.id, tool.extraArgs ?? [])
  return (
    <div className="space-y-3 rounded-xl border border-border-button-default/80 bg-background-secondary-default/30 p-3.5">
      <div>
        <p className="text-caption-1-medium text-text-primary">{t("settings.agentTools.launchPrefs")}</p>
        <p className="mt-0.5 text-caption-2-regular text-text-tertiary">{t("settings.agentTools.launchPrefsHint")}</p>
      </div>
      {prefs.map((pref) => (
        <PrefRow
          key={pref.id}
          id={pref.id}
          checked={Boolean(decoded.values[pref.id])}
          onToggle={(next) =>
            void actions.persist({
              extraArgs: encodeLaunchArgs(tool.id, { ...decoded.values, [pref.id]: next }, decoded.custom)
            })
          }
        />
      ))}
    </div>
  )
}

function PrefRow({
  id,
  checked,
  onToggle
}: {
  id: LaunchPrefId
  checked: boolean
  onToggle: (next: boolean) => void
}) {
  const t = useT()
  const copy =
    id === "web-search"
      ? {
          icon: <RiGlobalLine className="size-3.5 text-accent-500" />,
          title: t("settings.agentTools.prefWebSearch"),
          hint: t("settings.agentTools.prefWebSearchHint")
        }
      : {
          icon: <RiFlashlightLine className="size-3.5 text-accent-500" />,
          title: t("settings.agentTools.prefFast"),
          hint: t("settings.agentTools.prefFastHint")
        }
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border-button-default/50 bg-background-primary-default/70 px-3 py-2.5">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-caption-1-medium text-text-primary">
          {copy.icon}
          {copy.title}
        </p>
        <p className="mt-0.5 text-caption-2-regular text-text-tertiary">{copy.hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onToggle} aria-label={copy.title} />
    </div>
  )
}
