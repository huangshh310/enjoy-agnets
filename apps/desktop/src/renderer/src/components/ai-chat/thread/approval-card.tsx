/**
 * 审批卡片：标题、四项元数据、预览、HMAC 与三项决策。
 */
import {
  RiCheckLine,
  RiCloseLine,
  RiFileEditLine,
  RiLock2Line,
  RiShieldCheckLine,
  RiShieldKeyholeLine,
  RiTerminalBoxLine
} from "@remixicon/react"
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { asRecord, readString } from "@renderer/lib/record"
import { useChatStore } from "@renderer/stores/chat-store"
import { ApprovalMeta } from "./approval-meta"
import { ApprovalPreview, filePathOf } from "./approval-preview"
import { formatToolName } from "./tool-summary"
import { useT } from "@renderer/i18n"

export function ApprovalCard({
  pending,
  onApprove,
  onDeny,
  onAllowSession
}: {
  pending: StreamEvent & { type: "approval.required" }
  onApprove: () => void
  onDeny: () => void
  onAllowSession: () => void
}) {
  const t = useT()
  const workspaceName = useChatStore((state) => state.workspaceName)
  const args = asRecord(pending.args)
  const isBash =
    pending.name === "bash" ||
    pending.name === "sh" ||
    pending.name === "execute_command" ||
    pending.name === "run_command" ||
    Boolean(readString(args, "command")) ||
    pending.name.includes(" ") ||
    pending.name.includes("&&") ||
    pending.name.includes(";")
  const isFile =
    pending.name === "write_file" ||
    pending.name === "write" ||
    pending.name === "edit_file" ||
    pending.name === "edit"
  const displayToolName = isBash
    ? (pending.name.includes(" ") || pending.name.includes("&&") ? "bash" : pending.name)
    : formatToolName(pending.name)
  const targetPath = isFile ? filePathOf(args) : isBash ? readString(args, "command") : undefined
  const riskLabel = isBash
    ? t("chat.riskExecutesShell")
    : isFile
      ? t("chat.riskModifiesDisk")
      : t("chat.riskToolCall")
  return (
    <div className="overflow-hidden rounded-2xl border border-separator-border/80 bg-background-primary-default font-sans shadow-md">
      <div className="flex items-start justify-between gap-3 border-b border-separator-border/60 bg-background-secondary-default/40 px-4.5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-500 shadow-2xs">
            {isBash ? (
              <RiTerminalBoxLine className="size-4.5" />
            ) : isFile ? (
              <RiFileEditLine className="size-4.5" />
            ) : (
              <RiShieldKeyholeLine className="size-4.5" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-caption-1-medium font-bold tracking-tight text-text-primary">
                {isBash
                  ? t("chat.approveShell")
                  : isFile
                    ? t("chat.approveFile", { name: displayToolName })
                    : t("chat.approveTool", { name: displayToolName })}
              </h3>
              <span className="rounded bg-amber-500/10 px-1.5 py-0.2 font-mono text-caption-2-medium text-amber-500">
                {t("chat.actionRequired")}
              </span>
            </div>
            <p className="mt-0.5 text-caption-2-regular text-text-secondary">{t("chat.approveHint")}</p>
          </div>
        </div>
      </div>
      <ApprovalMeta
        workspaceName={workspaceName || t("chat.untitledWorkspace")}
        targetPath={targetPath}
        toolName={displayToolName}
        riskLabel={riskLabel}
      />
      <div className="bg-background-primary-default p-4">
        <ApprovalPreview name={pending.name} args={args} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-separator-border/60 bg-background-secondary-default/30 px-4.5 py-2.5 text-caption-2-medium">
        <div className="flex items-center gap-1.5 text-caption-2-regular text-text-tertiary">
          <RiLock2Line className="size-3.5 text-text-tertiary" />
          <span>{t("chat.hmacBoundNotice")}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onDeny}
            className="h-8 gap-1 px-3 text-caption-1-medium text-text-error-primary hover:bg-text-error-primary/10 transition-colors"
          >
            <RiCloseLine className="size-4" />
            <span>{t("chat.deny")}</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onAllowSession}
            className="h-8 gap-1.5 px-3 text-caption-1-medium text-text-secondary hover:text-text-primary"
            title={t("chat.alwaysAllowHint")}
          >
            <RiShieldCheckLine className="size-4 text-accent-500" />
            <span>{t("chat.alwaysAllow")}</span>
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={onApprove}
            className="h-8 gap-1.5 px-4 text-caption-1-medium font-semibold shadow-xs"
          >
            <RiCheckLine className="size-4" />
            <span>{t("chat.allowOnce")}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
