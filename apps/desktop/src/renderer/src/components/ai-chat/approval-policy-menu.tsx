/**
 * 盾牌下拉：permissionMode 三档、Files/Shell/Git 开关、Ask/Plan 提示。
 */
import {
  RiCheckLine,
  RiEqualizer3Line,
  RiFileEditLine,
  RiFlashlightLine,
  RiShieldKeyholeLine
} from "@remixicon/react"
import { Switch } from "@/components/ui/switch"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { cx } from "@/utils/cx"
import {
  APPROVAL_FLAGS,
  APPROVAL_PRESETS,
  flagsForPolicy,
  type ApprovalPolicyKind,
  type ApprovalPrefFlags
} from "./approval-policy"

const PRESET_ICONS = {
  "allow-reads": RiShieldKeyholeLine,
  "allow-edits": RiFileEditLine,
  "allow-all": RiFlashlightLine,
  custom: RiEqualizer3Line
}

export { PRESET_ICONS }

export function ApprovalPresetList({
  kind,
  onPick
}: {
  kind: ApprovalPolicyKind
  onPick: (flags: ApprovalPrefFlags) => void
}) {
  return (
    <>
      {APPROVAL_PRESETS.map((item) => {
        const ItemIcon = PRESET_ICONS[item.id]
        const selected = item.id === kind
        return (
          <DropdownMenuItem
            key={item.id}
            onClick={() => onPick(flagsForPolicy(item.id))}
            className={cx(
              "flex items-center justify-between rounded-xl px-2 py-1.5 text-left cursor-pointer transition-colors",
              selected
                ? cx(item.bgClass, "text-text-primary font-medium")
                : "hover:bg-background-secondary-hover text-text-secondary hover:text-text-primary"
            )}
          >
            <PresetRow
              label={item.label}
              desc={item.desc}
              Icon={ItemIcon}
              bgClass={item.bgClass}
              iconColor={item.iconColor}
            />
            {selected ? <RiCheckLine className={cx("size-4 shrink-0", item.iconColor)} /> : null}
          </DropdownMenuItem>
        )
      })}
    </>
  )
}

export function ApprovalFlagList({
  flags,
  onToggle
}: {
  flags: ApprovalPrefFlags
  onToggle: (id: keyof ApprovalPrefFlags, checked: boolean) => void
}) {
  return (
    <div className="flex flex-col gap-0.5 px-1">
      {APPROVAL_FLAGS.map((flag) => {
        const isAutoAllowed = !flags[flag.id]
        return (
          <label
            key={flag.id}
            className="flex items-center justify-between gap-3 rounded-xl px-2 py-1.5 hover:bg-background-secondary-hover/60 transition-colors cursor-pointer select-none"
          >
            <span className="flex min-w-0 flex-col">
              <span className="text-caption-1-medium text-text-primary">{flag.label}</span>
              <span className="text-caption-2-regular text-text-tertiary">{flag.desc}</span>
            </span>
            <Switch
              size="sm"
              checked={isAutoAllowed}
              onCheckedChange={(autoAllowed) => onToggle(flag.id, !autoAllowed)}
            />
          </label>
        )
      })}
    </div>
  )
}

export function PolicyHint({ readOnly }: { readOnly: boolean }) {
  const text = readOnly
    ? "Ask and Plan always deny writes, commits, and shell — independent of this preset."
    : "All mode auto-approves files, commands, and commits. High-risk actions (sudo, rm -rf) still require explicit confirmation."

  return <p className="px-2 pt-1.5 pb-1 text-caption-2-regular leading-snug text-text-tertiary">{text}</p>
}

export function titleCase(kind: ApprovalPolicyKind): string {
  if (kind === "allow-reads") return "Reads"
  if (kind === "allow-edits") return "Edits"
  return "All"
}

function PresetRow({
  label,
  desc,
  Icon,
  bgClass,
  iconColor
}: {
  label: string
  desc: string
  Icon: typeof RiShieldKeyholeLine
  bgClass: string
  iconColor: string
}) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className={cx("flex size-6 shrink-0 items-center justify-center rounded-lg border", bgClass)}>
        <Icon className={cx("size-3.5", iconColor)} />
      </div>
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-caption-1-medium leading-tight text-text-primary">{label}</span>
        <span className="text-caption-2-regular text-text-tertiary leading-snug mt-0.5">{desc}</span>
      </div>
    </div>
  )
}
