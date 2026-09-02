/**
 * Settings → Sandbox：执行超时、循环步数上限与网络安全沙箱。
 * 对齐 Vercel AI SDK 7 的 stopWhen / prepareStep 步数与超时约束体系。
 */
import { RiTerminalBoxLine } from "@remixicon/react"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { cx } from "@/utils/cx"
import { SettingsCard, SettingsRow } from "./settings-row"
import { usePrefUpdate } from "./settings-pref"

export function SandboxSettings() {
  const { preferences, update } = usePrefUpdate()

  return (
    <div className="flex flex-col gap-6">
      {/* ─── 沙箱执行概览 ───────────────────────────────── */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <RiTerminalBoxLine className="size-6" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-body-large-semibold text-text-primary">
                Execution Sandbox & Guardrails
              </span>
              <span className="rounded-md bg-background-secondary-default px-2 py-0.5 text-[11px] font-medium text-text-tertiary">
                AI SDK 7 Loop Enforcement
              </span>
            </div>
            <span className="text-caption-2-regular text-text-tertiary mt-0.5">
              Strict step limits (stopWhen: stepCountIs), per-tool bash timeouts, and network boundary controls.
            </span>
          </div>
        </div>
      </div>

      {/* ─── 核心循环与超时约束 ─────────────────────────── */}
      <SettingsCard title="Execution Limits & Timeouts">
        <SettingsRow
          title="Max agent steps"
          description="ToolLoop stopWhen uses AI SDK stepCountIs. Default 20 steps, ceiling 64."
        >
          <div className="flex items-center gap-2">
            <TimeoutInput
              value={preferences?.maxAgentSteps ?? 20}
              min={1}
              max={64}
              widthClass="w-20"
              onCommit={(next) => void update({ maxAgentSteps: next })}
            />
            <span className="text-caption-2-medium text-text-tertiary">steps</span>
          </div>
        </SettingsRow>

        <SettingsRow
          title="Tool timeout (bash)"
          description="Applies to terminal commands executed via bash. Default 30s."
        >
          <div className="flex items-center gap-2">
            <TimeoutInput
              testId="tool-timeout-ms"
              value={preferences?.toolTimeoutMs ?? 30_000}
              min={1_000}
              max={300_000}
              widthClass="w-24"
              onCommit={(next) => void update({ toolTimeoutMs: next })}
            />
            <span className="text-caption-2-medium text-text-tertiary">
              ms ({((preferences?.toolTimeoutMs ?? 30_000) / 1000).toFixed(0)}s)
            </span>
          </div>
        </SettingsRow>

        <SettingsRow
          title="Step timeout"
          description="Per-step timeout passed to ToolLoop as timeout.stepMs. 0 means unlimited."
        >
          <div className="flex items-center gap-2">
            <TimeoutInput
              testId="step-timeout-ms"
              value={preferences?.stepTimeoutMs ?? 0}
              min={0}
              max={600_000}
              widthClass="w-24"
              onCommit={(next) => void update({ stepTimeoutMs: next })}
            />
            <span className="text-caption-2-medium text-text-tertiary">ms</span>
          </div>
        </SettingsRow>

        <SettingsRow
          title="Total agent run timeout"
          description="Global timeout for the entire generation run. 0 means unlimited."
        >
          <div className="flex items-center gap-2">
            <TimeoutInput
              testId="agent-timeout-ms"
              value={preferences?.agentTimeoutMs ?? 0}
              min={0}
              max={600_000}
              widthClass="w-24"
              onCommit={(next) => void update({ agentTimeoutMs: next })}
            />
            <span className="text-caption-2-medium text-text-tertiary">ms</span>
          </div>
        </SettingsRow>

        <SettingsRow
          title="Allow external network"
          description="Default off. Writes, commits, and external network calls still require approval."
        >
          <Switch
            checked={preferences?.sandboxNetwork ?? false}
            onCheckedChange={(value) => void update({ sandboxNetwork: value })}
          />
        </SettingsRow>
      </SettingsCard>
    </div>
  )
}

function TimeoutInput({
  value,
  min,
  max,
  onCommit,
  testId,
  widthClass = "w-28"
}: {
  value: number
  min: number
  max: number
  onCommit: (next: number) => void
  testId?: string
  widthClass?: string
}) {
  return (
    <Input
      type="number"
      min={min}
      max={max}
      className={cx("h-8 text-caption-2-medium", widthClass)}
      data-testid={testId}
      value={value}
      onChange={(event) => {
        const next = parseInt(event.target.value, 10)
        if (!Number.isNaN(next)) {
          onCommit(Math.max(min, Math.min(max, next)))
        }
      }}
    />
  )
}
