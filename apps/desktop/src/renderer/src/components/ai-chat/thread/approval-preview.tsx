/**
 * 审批卡片内容预览：bash / 写文件 / 提交说明。
 */
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { RiCheckLine, RiClipboardLine, RiCommandLine, RiFileLine, RiGitCommitLine } from "@remixicon/react"
import { diffTexts, parseUnifiedDiff } from "@enjoy-agents/agent-core/diff"
import { getIde, hasIde } from "@renderer/lib/ide"
import { readString } from "@renderer/lib/record"
import { useChatStore } from "@renderer/stores/chat-store"
import { FileDiff } from "../diff/file-diff"
import { useT } from "@renderer/i18n"
import { classifyApproval, commandTextOf, filePathOfArgs } from "./approval/classify-approval"

export function ApprovalPreview({ name, args }: { name: string; args: Record<string, unknown> }) {
  if (name === "edit_file" || name === "edit") return <EditFilePreview args={args} />
  if (name === "write_file" || name === "write") {
    return <WorkspaceFilePreview path={filePathOf(args)} next={readString(args, "content")} />
  }
  if (classifyApproval(name, args) === "command") {
    return <BashPreview commandText={commandTextOf(name, args) || JSON.stringify(args, null, 2)} />
  }
  if (name === "git_commit") return <CommitPreview args={args} />
  return (
    <div className="overflow-hidden rounded-xl border border-separator-border/80 bg-background-secondary-default/40 p-3">
      <pre className="font-mono text-caption-2-medium text-text-primary whitespace-pre-wrap select-text">
        {JSON.stringify(args, null, 2)}
      </pre>
    </div>
  )
}

export function filePathOf(args: Record<string, unknown>): string {
  return filePathOfArgs(args)
}

function BashPreview({ commandText }: { commandText: string }) {
  const t = useT()
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border-button-default bg-background-secondary-default font-mono text-caption-1-regular shadow-2xs">
      <div className="flex items-center justify-between border-b border-separator-border bg-background-tertiary-default px-3 py-1.5 text-caption-2-medium text-text-secondary">
        <div className="flex items-center gap-1.5 font-sans text-text-primary">
          <RiCommandLine className="size-3 text-state-success-text" />
          <span>{t("chat.terminalShell")}</span>
        </div>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(commandText).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            })
          }}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-text-tertiary transition-colors hover:bg-background-secondary-hover hover:text-text-primary"
        >
          {copied ? <RiCheckLine className="size-3 text-state-success-text" /> : <RiClipboardLine className="size-3" />}
          <span>{copied ? t("common.copied") : t("chat.copyCommand")}</span>
        </button>
      </div>
      <div className="overflow-x-auto whitespace-pre-wrap p-3.5 leading-relaxed text-text-primary select-text">
        <span className="mr-2 select-none text-state-success-text">$</span>
        <code>{commandText}</code>
      </div>
    </div>
  )
}

function CommitPreview({ args }: { args: Record<string, unknown> }) {
  const t = useT()
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-separator-border/80 bg-background-secondary-default/50 p-3">
      <div className="flex items-center gap-1.5 text-caption-2-medium text-text-secondary">
        <RiGitCommitLine className="size-3.5 text-accent-500" />
        <span>{t("chat.gitCommitMessage")}</span>
      </div>
      <p className="whitespace-pre-wrap rounded-lg border border-separator-border/50 bg-background-primary-default p-2.5 font-mono text-caption-1-medium leading-relaxed text-text-primary">
        {readString(args, "message") || t("chat.emptyValue")}
      </p>
    </div>
  )
}

function EditFilePreview({ args }: { args: Record<string, unknown> }) {
  const path = filePathOf(args)
  const rawDiff = readString(args, "diff") || readString(args, "edits")
  if (!rawDiff) {
    return <WorkspaceFilePreview path={path} nextFromCurrent={readString(args, "replacement")} />
  }
  return (
    <div className="flex flex-col gap-2">
      <PathLabel path={path} />
      <FileDiff model={parseUnifiedDiff(rawDiff, path)} compact />
    </div>
  )
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
  return (
    <div className="flex flex-col gap-2">
      <PathLabel path={path} />
      <FileDiff model={diffTexts(currentContent, nextContent, path)} compact />
    </div>
  )
}

function PathLabel({ path }: { path: string }) {
  return (
    <div className="flex items-center gap-1.5 font-mono text-caption-2-regular text-text-secondary">
      <RiFileLine className="size-3.5 text-accent-500" />
      <span className="font-semibold">{path}</span>
    </div>
  )
}

