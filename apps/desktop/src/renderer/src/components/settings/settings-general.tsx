/**
 * Settings → General：权限预设、自动放行开关与界面语言。
 * 顶部看板与 Workspace / MCP 同构，下方仍是 SettingsCard 行。
 */
import { classifyPermissionMode, type PermissionMode } from "@enjoy-agents/ipc-contract"
import { RiSettings4Line } from "@remixicon/react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { SettingsHub } from "./settings-hub"
import { SettingsPermissions } from "./settings-permissions"
import { SettingsCard, SettingsRow } from "./settings-row"
import { usePrefUpdate } from "./settings-pref"

const PERMISSION_MODE_LABEL: Record<PermissionMode | "custom", string> = {
  "allow-reads": "Reads (Safe)",
  "allow-edits": "Edits",
  "allow-all": "All (Autonomous)",
  custom: "Custom"
}

const LANGUAGE_LABEL: Record<"auto" | "en" | "zh", string> = {
  auto: "Auto",
  en: "English",
  zh: "中文"
}

export function GeneralSettings() {
  const { preferences, update } = usePrefUpdate()
  const flags = {
    requireWriteApproval: preferences?.requireWriteApproval ?? true,
    requireBashApproval: preferences?.requireBashApproval ?? true,
    requireCommitApproval: preferences?.requireCommitApproval ?? true
  }
  const kind = classifyPermissionMode(flags)
  const language = preferences?.language ?? "auto"
  const autoCount = [
    !flags.requireWriteApproval,
    !flags.requireBashApproval,
    !flags.requireCommitApproval
  ].filter(Boolean).length

  return (
    <div className="flex flex-col gap-6">
      <SettingsHub
        icon={RiSettings4Line}
        title="Application defaults"
        badge={PERMISSION_MODE_LABEL[kind]}
        description="Tool approval presets, auto-run flags, and the language used by the application chrome."
        pulses={[
          { label: "Permission mode", value: PERMISSION_MODE_LABEL[kind] },
          {
            label: "Auto-run flags",
            value: `${autoCount} / 3`,
            tone: autoCount === 3 ? "warning" : autoCount === 0 ? "success" : "default"
          },
          { label: "Language", value: LANGUAGE_LABEL[language] }
        ]}
      />

      <SettingsPermissions flags={flags} onChange={(patch) => void update(patch)} />
      <LanguageCard language={language} onChange={(value) => void update({ language: value })} />
    </div>
  )
}

function LanguageCard({
  language,
  onChange
}: {
  language: "auto" | "en" | "zh"
  onChange: (value: "auto" | "en" | "zh") => void
}) {
  return (
    <SettingsCard title="General">
      <SettingsRow title="Language" description="Application UI language. Auto follows this machine.">
        <Select value={language} onValueChange={(value) => onChange(value as "auto" | "en" | "zh")}>
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
  )
}
