/**
 * AI 能力相关设置段：能力、知识库、媒体、Workflow、Telemetry、Sandbox、MCP。
 */
import { useNavigate } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { SettingsCard, SettingsRow } from "./settings-row"
import { usePrefUpdate } from "./settings-pref"

export function McpSettings() {
  const navigate = useNavigate()
  return (
    <SettingsCard title="MCP permissions">
      <SettingsRow title="Servers" description="New servers start untrusted. Tools stay in the main process.">
        <Button size="sm" variant="outline" onClick={() => void navigate({ to: "/mcp" })}>
          Open MCP
        </Button>
      </SettingsRow>
    </SettingsCard>
  )
}

export { CapabilitySettings } from "./settings-capabilities"

export function KnowledgeSettings() {
  const navigate = useNavigate()
  const { preferences, update } = usePrefUpdate()
  return (
    <SettingsCard title="Knowledge indexing">
      <SettingsRow title="Auto-index new sources" description="Off by default. Only user-selected paths are indexed.">
        <Switch
          checked={preferences?.knowledgeAutoIndex ?? false}
          onCheckedChange={(value) => void update({ knowledgeAutoIndex: value })}
        />
      </SettingsRow>
      <SettingsRow title="Sources" description="Add folders, retry failed files, and search citations.">
        <Button size="sm" variant="outline" onClick={() => void navigate({ to: "/knowledge" })}>
          Open Knowledge
        </Button>
      </SettingsRow>
    </SettingsCard>
  )
}

export { MediaSettings } from "./settings-media"

export function WorkflowSettings() {
  const navigate = useNavigate()
  const { preferences, update } = usePrefUpdate()
  return (
    <SettingsCard title="Workflow recovery">
      <SettingsRow title="Resume on launch" description="Restart from the last checkpoint after quit.">
        <Switch
          checked={preferences?.workflowAutoResume ?? true}
          onCheckedChange={(value) => void update({ workflowAutoResume: value })}
        />
      </SettingsRow>
      <SettingsRow title="Runs" description="Pause, resume, retry, and cancel durable workflows.">
        <Button size="sm" variant="outline" onClick={() => void navigate({ to: "/workflows" })}>
          Open Workflows
        </Button>
      </SettingsRow>
    </SettingsCard>
  )
}

export function TelemetrySettings() {
  const navigate = useNavigate()
  const { preferences, update } = usePrefUpdate()
  return (
    <SettingsCard title="Telemetry & privacy">
      <SettingsRow title="Local metrics" description="Prompts, keys, and tool args are redacted.">
        <Switch
          checked={(preferences?.telemetryPolicy ?? "local") !== "off"}
          onCheckedChange={(value) => void update({ telemetryPolicy: value ? "local" : "off" })}
        />
      </SettingsRow>
      <SettingsRow title="Diagnostics" description="Filter metrics and export JSON or CSV.">
        <Button size="sm" variant="outline" onClick={() => void navigate({ to: "/observability" })}>
          Open Observability
        </Button>
      </SettingsRow>
    </SettingsCard>
  )
}

export { SandboxSettings } from "./sandbox-settings"
