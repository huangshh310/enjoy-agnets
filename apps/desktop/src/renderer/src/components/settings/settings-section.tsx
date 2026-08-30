import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useParams } from "@tanstack/react-router"
import { ThemeToggle } from "@/components/application/theme/theme-toggle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { SettingsSnapshot } from "@enjoy-agents/ipc-contract"
import { openFolder, saveApiKey } from "@renderer/hooks/use-agent-session"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"
import { findSettingsItem, isSettingsSectionId, type SettingsSectionId } from "./settings-catalog"
import { SettingsCard, SettingsComingSoon, SettingsRow } from "./settings-row"

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
  if (section === "mcp") {
    return (
      <SettingsComingSoon body="Model Context Protocol servers will be configured here. Tools stay in the main process and high-risk ones will still require approval." />
    )
  }
  return (
    <SettingsComingSoon body="Commit, branch, and diff preferences will live here. The Changes pane already reads the working tree for the open folder." />
  )
}

function useSettingsSnapshot() {
  return useQuery({
    queryKey: ["settings"],
    enabled: hasIde(),
    queryFn: () => getIde().settings.get() as Promise<SettingsSnapshot>
  })
}

async function patchPreferences(patch: SettingsSnapshot["preferences"] extends infer T ? Partial<T> : never) {
  if (!hasIde()) return
  await getIde().settings.setPreferences(patch)
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
      <SettingsCard title="Permissions">
        <SettingsRow
          title="Approve file writes"
          description="The agent pauses before write_file and edit_file. Allow, deny, or allow for the rest of the session."
          align="start"
        >
          <Switch
            checked={preferences?.requireWriteApproval ?? true}
            onCheckedChange={(checked) => void update({ requireWriteApproval: checked })}
          />
        </SettingsRow>
        <SettingsRow
          title="Approve shell commands"
          description="The agent pauses before bash. This is the default for a local-first IDE and should stay on unless you trust the workspace."
          align="start"
        >
          <Switch
            checked={preferences?.requireBashApproval ?? true}
            onCheckedChange={(checked) => void update({ requireBashApproval: checked })}
          />
        </SettingsRow>
      </SettingsCard>

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

function ProviderSettings() {
  const queryClient = useQueryClient()
  const hasKey = useChatStore((state) => state.hasKey)
  const apiKeyDraft = useChatStore((state) => state.apiKeyDraft)
  const setApiKeyDraft = useChatStore((state) => state.setApiKeyDraft)
  const providerDraft = useChatStore((state) => state.providerDraft)
  const setProviderDraft = useChatStore((state) => state.setProviderDraft)

  async function onSave() {
    await saveApiKey()
    await queryClient.invalidateQueries({ queryKey: ["settings"] })
  }

  return (
    <SettingsCard title="API key">
      <div className="flex flex-col gap-4 px-5 py-4">
        <p className="text-caption-1-medium text-text-secondary">
          Keys stay in the main process via OS encryption. The renderer never reads the raw secret after save.
        </p>
        <div className="flex flex-col gap-1.5">
          <Label className="text-caption-1-medium text-text-secondary">Provider</Label>
          <Select value={providerDraft} onValueChange={(value) => setProviderDraft(value as typeof providerDraft)}>
            <SelectTrigger className="h-10 w-full rounded-2lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deepseek">DeepSeek</SelectItem>
              <SelectItem value="openai">OpenAI compatible</SelectItem>
              <SelectItem value="anthropic">Anthropic</SelectItem>
              <SelectItem value="openrouter">OpenRouter</SelectItem>
              <SelectItem value="ollama">Ollama</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-caption-1-medium text-text-secondary">API key</Label>
          <Input
            type="password"
            value={apiKeyDraft}
            onChange={(event) => setApiKeyDraft(event.target.value)}
            placeholder={hasKey ? "Key saved — paste to replace" : "sk-..."}
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-caption-1-medium text-text-tertiary">
            {hasKey ? "A key is saved for this provider." : "No key saved yet."}
          </p>
          <Button size="sm" disabled={!apiKeyDraft.trim()} onClick={() => void onSave()}>
            Save key
          </Button>
        </div>
      </div>
    </SettingsCard>
  )
}

function AgentSettings() {
  const queryClient = useQueryClient()
  const settingsQuery = useSettingsSnapshot()
  const models = useChatStore((state) => state.models)
  const modelId = useChatStore((state) => state.modelId)
  const provider = useChatStore((state) => state.provider)
  const setModel = useChatStore((state) => state.setModel)
  const setMode = useChatStore((state) => state.setMode)
  const availableModels = provider ? models.filter((model) => model.provider === provider) : models
  const defaultMode = settingsQuery.data?.preferences.defaultMode ?? "agent"

  async function onModelChange(id: string) {
    const selected = availableModels.find((model) => model.id === id)
    if (!selected) return
    setModel(selected.id, selected.label)
    if (hasIde()) await getIde().settings.setDefaultModel(selected.id)
    await queryClient.invalidateQueries({ queryKey: ["settings"] })
  }

  async function onModeChange(mode: "agent" | "plan" | "ask" | "debug") {
    setMode(mode)
    await patchPreferences({ defaultMode: mode })
    await queryClient.invalidateQueries({ queryKey: ["settings"] })
  }

  return (
    <SettingsCard title="Defaults">
      <SettingsRow title="Default model" description="Used for new agent runs in this app.">
        <Select value={modelId} onValueChange={(value) => void onModelChange(value)}>
          <SelectTrigger className="min-w-[12rem] rounded-2lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableModels.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingsRow>
      <SettingsRow title="Default mode" description="Agent can edit with approval. Ask is read-only.">
        <Select value={defaultMode} onValueChange={(value) => void onModeChange(value as typeof defaultMode)}>
          <SelectTrigger className="min-w-[9rem] rounded-2lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="agent">Agent</SelectItem>
            <SelectItem value="ask">Ask</SelectItem>
            <SelectItem value="plan">Plan</SelectItem>
            <SelectItem value="debug">Debug</SelectItem>
          </SelectContent>
        </Select>
      </SettingsRow>
    </SettingsCard>
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
