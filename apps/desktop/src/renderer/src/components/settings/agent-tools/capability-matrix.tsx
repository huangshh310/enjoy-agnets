/**
 * 设置 → 智能体：静态 RuntimeCapabilities 只读矩阵。
 * 「支持」不是已登录；点行滚到对应卡片。
 */
import {
  MATRIX_RUNTIME_IDS,
  capabilitiesFor,
  isCustomAgentId,
  runtimePathKind,
  SANDBOX_HARNESS_ID,
  type RuntimeCapabilities
} from "@enjoy-agents/ipc-contract"
import { AgentBrandIcon } from "@renderer/components/ai-chat/agent-picker/agent-brand-icon"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { useT, type TranslateFn } from "@renderer/i18n"
import { matrixRuntimeLabel } from "./capability-matrix-label"

const COLS = ["spawn", "login", "quota", "thinking", "fast", "executionModes", "hostMcp", "hostSkills"] as const

export function CapabilityMatrix({ onJump }: { onJump?: (runtimeId: string) => void }) {
  const t = useT()
  const customAgents =
    useSettingsSnapshot().data?.agentTools.filter((item) => isCustomAgentId(item.id)) ?? []
  const customLabels = Object.fromEntries(customAgents.map((item) => [item.id, item.label]))
  const ids = [...MATRIX_RUNTIME_IDS, ...customAgents.map((item) => item.id)]
  return (
    <section className="flex flex-col gap-2.5">
      <div>
        <h3 className="text-body-medium font-semibold text-text-primary">{t("settings.runtimeCaps.title")}</h3>
        <p className="mt-0.5 text-caption-1-regular text-text-secondary">{t("settings.runtimeCaps.desc")}</p>
      </div>
      <div className="w-full overflow-x-auto rounded-xl border border-border-button-default">
        <table className="w-full min-w-[40rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-separator-border bg-background-secondary-default/60">
              <th className="px-3 py-2 text-caption-2-medium text-text-tertiary">{t("settings.runtimeCaps.colRuntime")}</th>
              <th className="px-3 py-2 text-caption-2-medium text-text-tertiary">{t("settings.runtimeCaps.colPath")}</th>
              {COLS.map((col) => (
                <th key={col} className="px-3 py-2 text-caption-2-medium text-text-tertiary">
                  {t(`settings.runtimeCaps.col.${col}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ids.map((id) => (
              <MatrixRow
                key={id}
                id={id}
                cap={capabilitiesFor(id)}
                customLabel={customLabels[id]}
                onJump={onJump}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function MatrixRow({
  id,
  cap,
  customLabel,
  onJump
}: {
  id: string
  cap: RuntimeCapabilities
  customLabel?: string
  onJump?: (runtimeId: string) => void
}) {
  const t = useT()
  const path = runtimePathKind(id)
  const label =
    id === SANDBOX_HARNESS_ID ? t("settings.runtimeCaps.sandboxLabel") : matrixRuntimeLabel(id, customLabel)
  return (
    <tr
      className={
        onJump
          ? "cursor-pointer border-b border-separator-border/70 last:border-0 hover:bg-background-secondary-hover/60"
          : "border-b border-separator-border/70 last:border-0"
      }
      onClick={onJump ? () => onJump(id) : undefined}
    >
      <td className="px-3 py-2 text-caption-1-medium text-text-primary">
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex size-4 shrink-0 items-center justify-center">
            <AgentBrandIcon id={id} size={14} />
          </span>
          <span className="truncate">{label}</span>
        </span>
      </td>
      <td className="px-3 py-2 text-caption-2-medium text-text-secondary">{t(`settings.runtimeCaps.path.${path}`)}</td>
      <td className="px-3 py-2">{flag(cap.spawn, t)}</td>
      <td className="px-3 py-2">{flag(cap.login, t)}</td>
      <td className="px-3 py-2">{flag(cap.quota, t)}</td>
      <td className="px-3 py-2 font-mono text-caption-2-medium text-text-secondary">{cap.thinking}</td>
      <td className="px-3 py-2 font-mono text-caption-2-medium text-text-secondary">{cap.fast}</td>
      <td className="px-3 py-2 font-mono text-caption-2-medium text-text-secondary">{cap.executionModes}</td>
      <td className="px-3 py-2 font-mono text-caption-2-medium text-text-secondary">{cap.hostMcp}</td>
      <td className="px-3 py-2 font-mono text-caption-2-medium text-text-secondary">{cap.hostSkills}</td>
    </tr>
  )
}

function flag(on: boolean, t: TranslateFn) {
  return (
    <span className={on ? "text-caption-2-medium text-accent-600" : "text-caption-2-medium text-text-tertiary"}>
      {on ? t("settings.runtimeCaps.yes") : t("settings.runtimeCaps.no")}
    </span>
  )
}
