/**
 * 输入框工具审批：Harness allow-reads / allow-edits / allow-all，以及 Files / Shell / Git。
 */
import type { ComponentProps } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { cx } from "@/utils/cx"
import { patchPreferences, useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"

import {
  classifyApprovalPolicy,
  flagsFromPrefs,
  preferencesPatchFromFlags,
  toneForPolicy,
  type ApprovalPrefFlags
} from "./approval-policy"
import { ApprovalFlagList, ApprovalPresetList, PolicyHint, PRESET_ICONS, titleCase } from "./approval-policy-menu"

export function ApprovalPolicyToggle() {
  const t = useT()
  const queryClient = useQueryClient()
  const settingsQuery = useSettingsSnapshot()
  const mode = useChatStore((state) => state.mode)
  const flags = flagsFromPrefs(settingsQuery.data?.preferences)
  const kind = classifyApprovalPolicy(flags)
  const readOnly = mode === "ask" || mode === "plan"
  const CurrentIcon = PRESET_ICONS[kind]

  async function persist(next: ApprovalPrefFlags) {
    await patchPreferences(preferencesPatchFromFlags(next))
    await queryClient.invalidateQueries({ queryKey: ["settings"] })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <PolicyTrigger kind={kind} Icon={CurrentIcon} />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        side="top"
        sideOffset={8}
        className="w-[330px] rounded-2xl border border-border-button-default bg-background-primary-default p-2 shadow-dropdown"
      >
        <div className="px-2 py-1 text-caption-2-semibold text-text-tertiary uppercase tracking-wider">
          {t("chat.approvalSection")}
        </div>
        <ApprovalPresetList kind={kind} onPick={(next) => void persist(next)} />
        <DropdownMenuSeparator className="-mx-1.5 my-1.5 bg-separator-border" />
        <ApprovalFlagList
          flags={flags}
          onToggle={(id, checked) => void persist({ ...flags, [id]: checked })}
        />
        <PolicyHint readOnly={readOnly} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function PolicyTrigger({
  kind,
  Icon,
  className,
  ...props
}: {
  kind: ReturnType<typeof classifyApprovalPolicy>
  Icon: (typeof PRESET_ICONS)[keyof typeof PRESET_ICONS]
} & ComponentProps<"button">) {
  const t = useT()
  const tone = toneForPolicy(kind)
  return (
    <button
      type="button"
      aria-label={t("chat.approvalAria")}
      className={cx(
        "group flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-caption-1-medium outline-none transition-all shadow-2xs cursor-pointer",
        "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
        tone.bgClass,
        tone.colorClass,
        className
      )}
      {...props}
    >
      <Icon className={cx("size-3.5 shrink-0", tone.iconColor)} />
      <span className="whitespace-nowrap font-semibold">
        {kind === "custom" ? t("common.permissionCustom") : titleCase(kind, t)}
      </span>
    </button>
  )
}

