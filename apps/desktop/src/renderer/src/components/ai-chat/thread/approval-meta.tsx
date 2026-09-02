/**
 * 审批四项元数据：工作区 / 路径 / 工具 / 风险。
 */
import { RiAlertLine, RiCommandLine, RiFileLine, RiFolderLine } from "@remixicon/react"
import { useT } from "@renderer/i18n"

export function ApprovalMeta({
  workspaceName,
  targetPath,
  toolName,
  riskLabel
}: {
  workspaceName: string
  targetPath?: string
  toolName: string
  riskLabel: string
}) {
  const t = useT()
  return (
    <div className="grid grid-cols-2 gap-2 border-b border-separator-border/60 bg-background-secondary-default/20 px-4.5 py-2.5 text-caption-2-medium sm:grid-cols-4">
      <Meta icon={RiFolderLine} label={t("chat.metaWorkspace")} value={workspaceName} />
      <Meta icon={RiFileLine} label={t("chat.metaPath")} value={targetPath || "—"} mono />
      <Meta icon={RiCommandLine} label={t("chat.metaTool")} value={toolName} mono />
      <Meta icon={RiAlertLine} label={t("chat.metaRisk")} value={riskLabel} warn />
    </div>
  )
}

function Meta({
  icon: Icon,
  label,
  value,
  mono,
  warn
}: {
  icon: typeof RiFolderLine
  label: string
  value: string
  mono?: boolean
  warn?: boolean
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <Icon className={`size-3.5 shrink-0 ${warn ? "text-amber-500" : "text-text-tertiary"}`} />
      <span className="text-text-tertiary">{label}</span>
      <span
        className={`truncate ${warn ? "font-medium text-amber-500" : "text-text-secondary"} ${mono ? "font-mono" : ""}`}
        title={value}
      >
        {value}
      </span>
    </div>
  )
}
