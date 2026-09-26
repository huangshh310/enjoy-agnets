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
import { APPROVAL_PERMISSIONS_ANCHOR } from "./approval-discover/approval-discover-nav"
import { SettingsCard, SettingsRow } from "./settings-row"
import { useT } from "@renderer/i18n"

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
  const t = useT()
  const kind = classifyPermissionMode(flags)

  function persist(next: ApprovalFlags, mode?: PermissionMode) {
    onChange({ ...next, permissionMode: mode ?? toHarnessPermissionMode(next) })
  }

  return (
    <SettingsCard id={APPROVAL_PERMISSIONS_ANCHOR} title={t("settings.permissions.title")}>
      <PermissionModeRow kind={kind} onPick={(mode) => persist(flagsForPermissionMode(mode), mode)} />
      <FlagRow
        title={t("settings.permissions.autoWrites")}
        description={t("settings.permissions.autoWritesDesc")}
        checked={!flags.requireWriteApproval}
        onCheckedChange={(auto) => persist({ ...flags, requireWriteApproval: !auto })}
      />
      <FlagRow
        title={t("settings.permissions.autoBash")}
        description={t("settings.permissions.autoBashDesc")}
        checked={!flags.requireBashApproval}
        onCheckedChange={(auto) => persist({ ...flags, requireBashApproval: !auto })}
      />
      <FlagRow
        title={t("settings.permissions.autoCommit")}
        description={t("settings.permissions.autoCommitDesc")}
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
  const t = useT()
  return (
    <SettingsRow title={t("settings.general.permissionMode")} description={t("settings.permissions.modeDesc")}>
      <Select value={kind} onValueChange={(val) => onPick(val as PermissionMode)}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder={t("settings.permissions.selectMode")} />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectItem value="allow-reads">
            <div className="flex flex-col">
              <span>{t("common.permissionReads")}</span>
              <span className="text-caption-2-regular text-text-tertiary">{t("settings.permissions.readsHint")}</span>
            </div>
          </SelectItem>
          <SelectItem value="allow-edits">
            <div className="flex flex-col">
              <span>{t("common.permissionEdits")}</span>
              <span className="text-caption-2-regular text-text-tertiary">{t("settings.permissions.editsHint")}</span>
            </div>
          </SelectItem>
          <SelectItem value="allow-all">
            <div className="flex flex-col">
              <span>{t("common.permissionAll")}</span>
              <span className="text-caption-2-regular text-text-tertiary">{t("settings.permissions.allHint")}</span>
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
