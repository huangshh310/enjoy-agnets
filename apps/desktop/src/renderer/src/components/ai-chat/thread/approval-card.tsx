/**
 * AI Approval Card 人机审批卡片组件：
 * 参考 https://www.aicss.dev/components/approval-card 顶级交互设计与 BoardUI 设计系统。
 * 支持 Shell 命令审批、文件写入与 Diff 修改审批、会话信任白名单与一键放行。
 */
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  RiCheckLine,
  RiClipboardLine,
  RiCloseLine,
  RiCommandLine,
  RiFileEditLine,
  RiFileLine,
  RiGitCommitLine,
  RiShieldCheckLine,
  RiShieldKeyholeLine,
  RiTerminalBoxLine
} from "@remixicon/react"
import { diffTexts, parseUnifiedDiff } from "@enjoy-agents/agent-core/diff"
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { CodeBlock } from "@/components/ai-elements/code-block"
import { getIde, hasIde } from "@renderer/lib/ide"
import { asRecord, readString } from "@renderer/lib/record"
import { useChatStore } from "@renderer/stores/chat-store"
import { FileDiff } from "../diff/file-diff"
import { formatToolName } from "./tool-summary"

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
  const args = asRecord(pending.args)
  const isBash = pending.name === "bash"
  const isFile =
    pending.name === "write_file" ||
    pending.name === "write" ||
    pending.name === "edit_file" ||
    pending.name === "edit"

  return (
    <div className="overflow-hidden rounded-2xl border border-separator-border/80 bg-background-primary-default shadow-md font-sans">
      {/* 头部标题与审批上下文 */}
      <div className="flex items-start justify-between gap-3 border-b border-separator-border/60 bg-background-secondary-default/40 px-4.5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-2xs">
            {isBash ? (
              <RiTerminalBoxLine className="size-4.5" />
            ) : isFile ? (
              <RiFileEditLine className="size-4.5" />
            ) : (
              <RiShieldKeyholeLine className="size-4.5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-caption-1-medium font-bold text-text-primary tracking-tight">
                {isBash
                  ? "执行 Shell 命令审批"
                  : isFile
                    ? `修改文件审批 · ${formatToolName(pending.name)}`
                    : `工具调用审批 · ${formatToolName(pending.name)}`}
              </h3>
              <span className="rounded bg-amber-500/10 px-1.5 py-0.2 font-mono text-[9.5px] font-semibold text-amber-600 dark:text-amber-400">
                Action Required
              </span>
            </div>
            <p className="text-[11.5px] text-text-secondary mt-0.5">
              在 Agent 继续执行前审查即将发生的系统或文件变更。
            </p>
          </div>
        </div>
      </div>

      {/* 核心内容预览区域 */}
      <div className="p-4 bg-background-primary-default">
        <ApprovalPreview name={pending.name} args={args} />
      </div>

      {/* 底部操作工具栏 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-separator-border/60 bg-background-secondary-default/30 px-4.5 py-3 text-caption-2-medium">
        <Button
          size="sm"
          variant="outline"
          onClick={onAllowSession}
          className="gap-1.5 h-7.5 text-[11.5px] text-text-secondary hover:text-text-primary"
          title="在此会话后续所有操作中自动放行同类调用"
        >
          <RiShieldCheckLine className="size-3.5 text-accent-500" />
          <span>本会话总是允许 (Always Allow)</span>
        </Button>

        <div className="flex items-center gap-2 ml-auto">
          <Button
            size="sm"
            variant="ghost"
            onClick={onDeny}
            className="gap-1 h-7.5 px-3 text-[11.5px] text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
          >
            <RiCloseLine className="size-3.5" />
            <span>拒绝 (Deny)</span>
          </Button>

          <Button
            size="sm"
            onClick={onApprove}
            className="gap-1.5 h-7.5 px-4 text-[11.5px] shadow-xs"
          >
            <RiCheckLine className="size-3.5" />
            <span>允许执行 (Approve)</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

function ApprovalPreview({ name, args }: { name: string; args: Record<string, unknown> }) {
  const [copied, setCopied] = useState(false)

  if (name === "edit_file" || name === "edit") return <EditFilePreview args={args} />

  if (name === "write_file" || name === "write") {
    return (
      <WorkspaceFilePreview
        path={filePathOf(args)}
        next={readString(args, "content")}
      />
    )
  }

  // Shell 命令专业终端卡片 (对标 aicss.dev/components/approval-card 的 command 变体)
  if (name === "bash") {
    const commandText = readString(args, "command") || JSON.stringify(args, null, 2)

    function handleCopy() {
      void navigator.clipboard.writeText(commandText).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }

    return (
      <div className="flex flex-col rounded-xl border border-separator-border/80 bg-background-secondary-default/70 overflow-hidden font-mono text-[12px] shadow-2xs">
        {/* 终端仿 macOS 顶部控制点与复制 */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-background-secondary-default/90 border-b border-separator-border/60 text-[10.5px] text-text-tertiary">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-rose-500/60" />
            <span className="size-2.5 rounded-full bg-amber-500/60" />
            <span className="size-2.5 rounded-full bg-emerald-500/60" />
            <span className="ml-2 flex items-center gap-1 text-text-secondary font-medium">
              <RiCommandLine className="size-3" />
              <span>Shell Command</span>
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 text-text-tertiary hover:text-text-primary transition-colors"
          >
            {copied ? (
              <>
                <RiCheckLine className="size-3 text-emerald-500" />
                <span>已复制</span>
              </>
            ) : (
              <>
                <RiClipboardLine className="size-3" />
                <span>复制命令</span>
              </>
            )}
          </button>
        </div>

        {/* 命令行内容 */}
        <div className="p-3 bg-background-secondary-default/40 text-text-primary leading-relaxed whitespace-pre-wrap overflow-x-auto">
          <code>{commandText}</code>
        </div>
      </div>
    )
  }

  if (name === "git_commit") {
    return (
      <div className="flex flex-col gap-1.5 rounded-xl border border-separator-border/80 bg-background-secondary-default/50 p-3">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-text-secondary">
          <RiGitCommitLine className="size-3.5 text-accent-500" />
          <span>Git Commit Message:</span>
        </div>
        <p className="font-mono text-caption-1-medium text-text-primary whitespace-pre-wrap leading-relaxed bg-background-primary-default p-2.5 rounded-lg border border-separator-border/50">
          {readString(args, "message") || "(empty)"}
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-separator-border/80">
      <CodeBlock code={JSON.stringify(args, null, 2)} language="json" />
    </div>
  )
}

function filePathOf(args: Record<string, unknown>): string {
  return readString(args, "path") || readString(args, "file_path")
}

function EditFilePreview({ args }: { args: Record<string, unknown> }) {
  const path = filePathOf(args)
  const rawDiff = readString(args, "diff") || readString(args, "edits")
  if (rawDiff) {
    const model = parseUnifiedDiff(rawDiff, path)
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-text-secondary">
          <RiFileLine className="size-3.5 text-blue-500" />
          <span className="font-semibold">{path}</span>
        </div>
        <FileDiff model={model} compact />
      </div>
    )
  }
  return <WorkspaceFilePreview path={path} nextFromCurrent={readString(args, "replacement")} />
}

function WorkspaceFilePreview({
  path,
  next,
  nextFromCurrent,
  fallbackCurrent = ""
}: {
  path: string
  next?: string
  nextFromCurrent?: string
  fallbackCurrent?: string
}) {
  const currentWorkspaceId = useChatStore((state) => state.workspaceId)
  const currentQuery = useQuery({
    queryKey: ["workspace-file", currentWorkspaceId, path],
    enabled: hasIde() && Boolean(currentWorkspaceId && path),
    queryFn: () => getIde().workspace.readFile({ path }) as Promise<{ content: string }>
  })
  const currentContent = currentQuery.data?.content ?? fallbackCurrent
  const nextContent = next ?? (nextFromCurrent ? `${currentContent}\n${nextFromCurrent}` : "")
  const diffModel = diffTexts(currentContent, nextContent, path)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-[11px] font-mono text-text-secondary">
        <RiFileLine className="size-3.5 text-blue-500" />
        <span className="font-semibold">{path}</span>
      </div>
      <FileDiff model={diffModel} compact />
    </div>
  )
}
