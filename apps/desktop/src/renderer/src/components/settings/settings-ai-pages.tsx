/**
 * AI 能力相关设置段：能力、知识库、媒体、Workflow、Telemetry、Sandbox、MCP。
 */
import { useNavigate } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { getIde, hasIde } from "@renderer/lib/ide"
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

export function CapabilitySettings() {
  const settingsQuery = useSettingsSnapshot()
  const modelsQuery = useQuery({
    queryKey: ["models"],
    enabled: hasIde(),
    queryFn: () =>
      getIde().models.list() as Promise<
        Array<{
          id: string
          label: string
          capabilities?: string[]
          probedCaps?: string[]
          probedAt?: number
        }>
      >
  })
  const activeId = settingsQuery.data?.defaultModelId
  const active = modelsQuery.data?.find((model) => model.id === activeId) ?? modelsQuery.data?.[0]
  const caps = active?.capabilities ?? []
  const probed = active?.probedCaps ?? []
  return (
    <SettingsCard title="Model capabilities">
      <SettingsRow
        title={active ? active.label : "No model"}
        description={
          probed.length > 0
            ? `Probed ${active?.probedAt ? new Date(active.probedAt).toLocaleString() : "live catalog"}. UI disables unsupported controls.`
            : "Static catalog until you probe the provider. Video and Realtime stay experimental."
        }
      >
        <span className="text-body-medium text-text-tertiary">
          {caps.length > 0 ? caps.join(" · ") : "Static catalog + probe"}
        </span>
      </SettingsRow>
    </SettingsCard>
  )
}

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

export function MediaSettings() {
  const navigate = useNavigate()
  const { preferences, update } = usePrefUpdate()
  return (
    <SettingsCard title="Media & assets">
      <SettingsRow
        title="Experimental media"
        description="Video generation and Realtime sessions. Failures isolate and degrade."
      >
        <Switch
          checked={preferences?.experimentalMedia ?? false}
          onCheckedChange={(value) => void update({ experimentalMedia: value })}
        />
      </SettingsRow>
      <SettingsRow title="Asset library" description="Import, preview, and export with path approval.">
        <Button size="sm" variant="outline" onClick={() => void navigate({ to: "/media" })}>
          Open Media
        </Button>
      </SettingsRow>
    </SettingsCard>
  )
}

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
