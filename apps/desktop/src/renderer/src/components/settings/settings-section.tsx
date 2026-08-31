import { useQueryClient } from "@tanstack/react-query"
import { useParams } from "@tanstack/react-router"
import { ThemeToggle } from "@/components/application/theme/theme-toggle"
import { Button } from "@/components/ui/button"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { openFolder } from "@renderer/hooks/use-agent-session"
import { patchPreferences, useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { useChatStore } from "@renderer/stores/chat-store"
import { ProviderSettings } from "./providers/providers-settings"
import { findSettingsItem, isSettingsSectionId, type SettingsSectionId } from "./settings-catalog"
import { SettingsDefaults } from "./settings-defaults"
import { SettingsHarness } from "./settings-harness"
import { SettingsPermissions } from "./settings-permissions"
import { SettingsCard, SettingsComingSoon, SettingsRow } from "./settings-row"
import {
  CapabilitySettings,
  KnowledgeSettings,
  McpSettings,
  MediaSettings,
  SandboxSettings,
  TelemetrySettings,
  WorkflowSettings
} from "./settings-ai-pages"

const SHORTCUTS: Array<{ action: string; keys: string[] }> = [
  { action: "Open settings", keys: ["Mod", ","] },
  { action: "Focus search", keys: ["Mod", "L"] },
  { action: "Send message", keys: ["Enter"] },
  { action: "New line in composer", keys: ["Shift", "Enter"] },
  { action: "Back to workspace", keys: ["Esc"] }
]

function isApplePlatform() {
  if (typeof navigator === "undefined") return false
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent)
}

function shortcutGlyph(key: string) {
  if (key === "Mod") return isApplePlatform() ? "⌘" : "Ctrl"
  if (key === "Shift") return isApplePlatform() ? "⇧" : "Shift"
  if (key === "Alt") return isApplePlatform() ? "⌥" : "Alt"
  if (key === "Enter") return isApplePlatform() ? "⏎" : "Enter"
  return key
}

function ShortcutKeys({ keys }: { keys: string[] }) {
  return (
    <KbdGroup>
      {keys.flatMap((key, index) => [
        index > 0 ? (
          <span key={`plus-${key}-${index}`} aria-hidden>
            +
          </span>
        ) : null,
        <Kbd key={`${key}-${index}`}>{shortcutGlyph(key)}</Kbd>
      ])}
    </KbdGroup>
  )
}

export function SettingsSectionPage() {
  const params = useParams({ strict: false }) as { section?: string }
  const section: SettingsSectionId = isSettingsSectionId(params.section ?? "")
    ? (params.section as SettingsSectionId)
    : "general"
  const item = findSettingsItem(section)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-title-3-semibold text-text-primary">{item?.label ?? "Settings"}</h1>
      </div>
      <SettingsSectionBody section={section} />
    </div>
  )
}

function SettingsSectionBody({ section }: { section: SettingsSectionId }) {
  if (section === "general") return <GeneralSettings />
  if (section === "appearance") return <AppearanceSettings />
  if (section === "shortcuts") return <ShortcutSettings />
  if (section === "providers") return <ProviderSettings />
  if (section === "agent") return <AgentSettings />
  if (section === "workspace") return <WorkspaceSettings />
  if (section === "mcp") return <McpSettings />
  if (section === "capabilities") return <CapabilitySettings />
  if (section === "knowledge") return <KnowledgeSettings />
  if (section === "media") return <MediaSettings />
  if (section === "workflow") return <WorkflowSettings />
  if (section === "telemetry") return <TelemetrySettings />
  if (section === "sandbox") return <SandboxSettings />
  return (
    <SettingsComingSoon body="Commit, branch, and diff preferences will live here. The Changes pane already reads the working tree for the open folder." />
  )
}

function GeneralSettings() {
  const queryClient = useQueryClient()
  const settingsQuery = useSettingsSnapshot()
  const preferences = settingsQuery.data?.preferences

  async function update(patch: Partial<NonNullable<typeof preferences>>) {
    await patchPreferences(patch)
    await queryClient.invalidateQueries({ queryKey: ["settings"] })
  }

  return (
    <div className="flex flex-col gap-6">
      <SettingsPermissions
        flags={{
          requireWriteApproval: preferences?.requireWriteApproval ?? true,
          requireBashApproval: preferences?.requireBashApproval ?? true,
          requireCommitApproval: preferences?.requireCommitApproval ?? true
        }}
        onChange={(patch) => void update(patch)}
      />

      <SettingsCard title="General">
        <SettingsRow title="Language" description="Application UI language. Auto follows this machine.">
          <Select
            value={preferences?.language ?? "auto"}
            onValueChange={(value) => void update({ language: value as "auto" | "en" | "zh" })}
          >
            <SelectTrigger className="min-w-[9rem] rounded-2lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Detect automatically</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="zh">中文</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
      </SettingsCard>
    </div>
  )
}

function AppearanceSettings() {
  return (
    <SettingsCard title="Theme">
      <SettingsRow
        title="Color mode"
        description="Manual light or dark. Enjoy Agents does not follow the operating system theme."
      >
        <ThemeToggle appearance="sidebar-segmented" />
      </SettingsRow>
    </SettingsCard>
  )
}

function ShortcutSettings() {
  return (
    <SettingsCard>
      {SHORTCUTS.map((shortcut) => (
        <SettingsRow key={shortcut.action} title={shortcut.action}>
          <ShortcutKeys keys={shortcut.keys} />
        </SettingsRow>
      ))}
    </SettingsCard>
  )
}

function AgentSettings() {
  return (
    <>
      <SettingsHarness />
      <SettingsDefaults />
    </>
  )
}

function WorkspaceSettings() {
  const workspaceName = useChatStore((state) => state.workspaceName)
  const workspaceRootLabel = useChatStore((state) => state.workspaceRootLabel)
  const workspaceId = useChatStore((state) => state.workspaceId)

  return (
    <SettingsCard title="Folder">
      <SettingsRow
        title="Current workspace"
        description={
          workspaceId
            ? `${workspaceName} · ${workspaceRootLabel}`
            : "No folder is open. Enjoy Agents only runs against a folder you choose."
        }
        align="start"
      >
        <Button size="sm" variant="outline" onClick={() => void openFolder()}>
          {workspaceId ? "Change" : "Open folder"}
        </Button>
      </SettingsRow>
    </SettingsCard>
  )
}
