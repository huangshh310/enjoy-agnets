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
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { useChatStore } from "@renderer/stores/chat-store"
import { Switch } from "@/components/ui/switch"
import { cx } from "@/utils/cx"
import { useT, type TranslateFn } from "@renderer/i18n"
import {
  flagsForPolicy,
  getApprovalFlags,
  getApprovalPresets,
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
  const t = useT()
  return (
    <>
      {getApprovalPresets(t).map((item) => {
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
  const t = useT()
  return (
    <div className="flex flex-col gap-0.5 px-1">
      {getApprovalFlags(t).map((flag) => {
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

/** 底栏盾牌的策略菜单体，不是第二套 Allow/Deny。 */
export function ApprovalPolicyMenuBody({
  kind,
  flags,
  onPersist
}: {
  kind: ApprovalPolicyKind
  flags: ApprovalPrefFlags
  onPersist: (next: ApprovalPrefFlags) => void
}) {
  const t = useT()
  const mode = useChatStore((state) => state.mode)
  const readOnly = mode === "ask" || mode === "plan"
  return (
    <>
      <div className="px-2 py-1 text-caption-2-semibold text-text-tertiary uppercase tracking-wider">
        {t("chat.approvalSection")}
      </div>
      <ApprovalPresetList kind={kind} onPick={onPersist} />
      <DropdownMenuSeparator className="-mx-1.5 my-1.5 bg-separator-border" />
      <ApprovalFlagList
        flags={flags}
        onToggle={(id, checked) => onPersist({ ...flags, [id]: checked })}
      />
      <PolicyHint readOnly={readOnly} />
    </>
  )
}

export function PolicyHint({ readOnly }: { readOnly: boolean }) {
  const t = useT()
  const text = readOnly ? t("chat.approvalHintReadOnly") : t("chat.approvalHintAll")
  return <p className="px-2 pt-1.5 pb-1 text-caption-2-regular leading-snug text-text-tertiary">{text}</p>
}

export function titleCase(kind: ApprovalPolicyKind, t: TranslateFn): string {
  if (kind === "allow-reads") return t("chat.approvalReads")
  if (kind === "allow-edits") return t("chat.approvalEdits")
  if (kind === "custom") return t("common.permissionCustom")
  return t("chat.approvalAll")
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
