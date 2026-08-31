/**
 * Sandbox 超时与步数上限。main 读同一套偏好执法。
 */
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { SettingsCard, SettingsRow } from "./settings-row"
import { usePrefUpdate } from "./settings-pref"

export function SandboxSettings() {
  const { preferences, update } = usePrefUpdate()
  return (
    <SettingsCard title="Sandbox">
      <SettingsRow
        title="Allow network"
        description="Default off. Writes, commits, and external network still require approval."
      >
        <Switch
          checked={preferences?.sandboxNetwork ?? false}
          onCheckedChange={(value) => void update({ sandboxNetwork: value })}
        />
      </SettingsRow>
      <SettingsRow
        title="Agent timeout (ms)"
        description="0 means no total timeout. Timeout errors are retryable."
      >
        <TimeoutInput
          testId="agent-timeout-ms"
          value={preferences?.agentTimeoutMs ?? 0}
          min={0}
          max={600_000}
          onCommit={(next) => void update({ agentTimeoutMs: next })}
        />
      </SettingsRow>
      <SettingsRow
        title="Step timeout (ms)"
        description="0 means no per-step timeout. Passed to ToolLoop as timeout.stepMs."
      >
        <TimeoutInput
          testId="step-timeout-ms"
          value={preferences?.stepTimeoutMs ?? 0}
          min={0}
          max={600_000}
          onCommit={(next) => void update({ stepTimeoutMs: next })}
        />
      </SettingsRow>
      <SettingsRow title="Tool timeout (ms)" description="Applies to sandbox bash. Default 30s.">
        <TimeoutInput
          testId="tool-timeout-ms"
          value={preferences?.toolTimeoutMs ?? 30_000}
          min={1_000}
          max={300_000}
          onCommit={(next) => void update({ toolTimeoutMs: next })}
        />
      </SettingsRow>
      <SettingsRow
        title="Max agent steps"
        description="ToolLoop stopWhen uses AI SDK stepCountIs. Default 20, max 64."
      >
        <TimeoutInput
          value={preferences?.maxAgentSteps ?? 20}
          min={1}
          max={64}
          widthClass="w-20"
          onCommit={(next) => void update({ maxAgentSteps: next })}
        />
      </SettingsRow>
    </SettingsCard>
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
      className={widthClass}
      data-testid={testId}
      value={value}
      onChange={(event) => {
        const next = Number(event.target.value)
        if (!Number.isFinite(next)) return
        onCommit(Math.min(max, Math.max(min, Math.floor(next))))
      }}
    />
  )
}
