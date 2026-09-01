/**
 * Settings → General 的权限：permissionMode + Files / Shell / Git 自动放行控制。
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
        title="Auto-apply file writes"
        description="Allow write and edit operations (write_file, edit_file) without prompting for approval."
        checked={!flags.requireWriteApproval}
        onCheckedChange={(auto) => persist({ ...flags, requireWriteApproval: !auto })}
      />
      <FlagRow
        title="Auto-run shell commands"
        description="Allow terminal bash commands to execute automatically without prompting."
        checked={!flags.requireBashApproval}
        onCheckedChange={(auto) => persist({ ...flags, requireBashApproval: !auto })}
      />
      <FlagRow
        title="Auto-commit git changes"
        description="Allow repository git commits without prompting for approval."
        checked={!flags.requireCommitApproval}
        onCheckedChange={(auto) => persist({ ...flags, requireCommitApproval: !auto })}
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
      title="Permission mode"
      description="Presets for tool approval. allow-all runs commands without approval; custom lets you mix."
    >
      <Select value={kind} onValueChange={(val) => onPick(val as PermissionMode)}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Select mode" />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectItem value="allow-reads">
            <div className="flex flex-col">
              <span>Reads (Safe)</span>
              <span className="text-[10px] text-text-tertiary">Approve writes, shell, git</span>
            </div>
          </SelectItem>
          <SelectItem value="allow-edits">
            <div className="flex flex-col">
              <span>Edits</span>
              <span className="text-[10px] text-text-tertiary">Auto writes; approve shell</span>
            </div>
          </SelectItem>
          <SelectItem value="allow-all">
            <div className="flex flex-col">
              <span>All (Autonomous)</span>
              <span className="text-[10px] text-text-tertiary">Auto writes, shell, commits</span>
            </div>
          </SelectItem>
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
    <SettingsRow title={title} description={description}>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </SettingsRow>
  )
}
