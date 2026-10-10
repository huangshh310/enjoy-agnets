/**
 * 输入框底栏盾牌：会话内审批策略入口（写入 / Shell / Git）。
 * 设置页发现性另走 approval-discover 摘要条，不在这里画第二套表。
 */
import type { ComponentProps } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { classifyApprovalPolicy, toneForPolicy } from "./approval-policy"
import { ApprovalPolicyMenuBody, PRESET_ICONS, titleCase } from "./approval-policy-menu"
import { useApprovalPolicyEditor } from "./use-approval-policy-editor"

export function ApprovalPolicyToggle() {
  const { flags, kind, persist } = useApprovalPolicyEditor()
  const CurrentIcon = PRESET_ICONS[kind]

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
        <ApprovalPolicyMenuBody kind={kind} flags={flags} onPersist={(next) => void persist(next)} />
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
      title={t("chat.approvalCycleHint")}
      className={cx(
        "group flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2 text-caption-2-medium outline-none transition-all shadow-2xs cursor-pointer",
        "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
        tone.bgClass,
        tone.colorClass,
        className
      )}
      {...props}
    >
      <Icon className={cx("size-3.5 shrink-0", tone.iconColor)} />
      <span className="whitespace-nowrap font-medium">
        {kind === "custom" ? t("common.permissionCustom") : titleCase(kind, t)}
      </span>
    </button>
  )
}
