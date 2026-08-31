/**
 * Settings → General 的权限：permissionMode + Files / Shell / Git。
 */
import {
  classifyPermissionMode,
  flagsForPermissionMode,
  toHarnessPermissionMode,
  type PermissionMode
} from "@enjoy-agents/ipc-contract"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { SettingsCard, SettingsRow } from "./settings-row"

type ApprovalFlags = {
  requireWriteApproval: boolean
  requireBashApproval: boolean
  requireCommitApproval: boolean
}

export function SettingsPermissions({
  flags,
  onChange
}: {
  flags: ApprovalFlags
  onChange: (patch: ApprovalFlags & { permissionMode: PermissionMode }) => void
}) {
  const kind = classifyPermissionMode(flags)

  function persist(next: ApprovalFlags, mode?: PermissionMode) {
    onChange({ ...next, permissionMode: mode ?? toHarnessPermissionMode(next) })
  }

  return (
    <SettingsCard title="Permissions">
      <PermissionModeRow kind={kind} onPick={(mode) => persist(flagsForPermissionMode(mode), mode)} />
      <FlagRow
        title="Approve file writes"
        description="Pause before write / edit (and host write_file). allow-edits turns this off."
        checked={flags.requireWriteApproval}
        onCheckedChange={(checked) => persist({ ...flags, requireWriteApproval: checked })}
      />
      <FlagRow
        title="Approve shell commands"
        description="Pause before bash. Harness All still pauses sandbox shell (cannot inspect the command)."
        checked={flags.requireBashApproval}
        onCheckedChange={(checked) => persist({ ...flags, requireBashApproval: checked })}
      />
      <FlagRow
        title="Approve git commits"
        description="Pause before git_commit. Host-tool extra, not part of Harness permissionMode."
        checked={flags.requireCommitApproval}
        onCheckedChange={(checked) => persist({ ...flags, requireCommitApproval: checked })}
      />
    </SettingsCard>
  )
}

function PermissionModeRow({
  kind,
  onPick
}: {
  kind: PermissionMode | "custom"
  onPick: (mode: PermissionMode) => void
}) {
  return (
    <SettingsRow
      title="permissionMode"
      description="Harness allow-reads / allow-edits. All is capped to allow-edits in the sandbox so bash still pauses."
    >
      <Select
        value={kind}
        onValueChange={(value) => {
          if (value === "custom") return
          onPick(value as PermissionMode)
        }}
      >
        <SelectTrigger className="min-w-[11rem] rounded-2lg">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="allow-reads">allow-reads</SelectItem>
          <SelectItem value="allow-edits">allow-edits</SelectItem>
          <SelectItem value="allow-all">allow-all</SelectItem>
          {kind === "custom" ? <SelectItem value="custom">custom</SelectItem> : null}
        </SelectContent>
      </Select>
    </SettingsRow>
  )
}

function FlagRow({
  title,
  description,
  checked,
  onCheckedChange
}: {
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <SettingsRow title={title} description={description} align="start">
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </SettingsRow>
  )
}
