/**
 * 审批卡片内容预览：bash / 写文件 / 提交说明。
 */
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { RiCheckLine, RiClipboardLine, RiCommandLine, RiFileLine, RiGitCommitLine } from "@remixicon/react"
import { diffTexts, parseUnifiedDiff } from "@enjoy-agents/agent-core/diff"
import { CodeBlock } from "@/components/ai-elements/code-block"
import { getIde, hasIde } from "@renderer/lib/ide"
import { readString } from "@renderer/lib/record"
import { useChatStore } from "@renderer/stores/chat-store"
import { FileDiff } from "../diff/file-diff"
import { useT } from "@renderer/i18n"

export function ApprovalPreview({ name, args }: { name: string; args: Record<string, unknown> }) {
  if (name === "edit_file" || name === "edit") return <EditFilePreview args={args} />
  if (name === "write_file" || name === "write") {
    return <WorkspaceFilePreview path={filePathOf(args)} next={readString(args, "content")} />
  }
  if (name === "bash") return <BashPreview args={args} />
  if (name === "git_commit") return <CommitPreview args={args} />
  return (
    <div className="overflow-hidden rounded-xl border border-separator-border/80">
      <CodeBlock code={JSON.stringify(args, null, 2)} language="json" />
    </div>
  )
}

export function filePathOf(args: Record<string, unknown>): string {
  return readString(args, "path") || readString(args, "file_path")
}

function BashPreview({ args }: { args: Record<string, unknown> }) {
  const t = useT()
  const [copied, setCopied] = useState(false)
  const commandText = readString(args, "command") || JSON.stringify(args, null, 2)
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-separator-border/80 bg-background-secondary-default/70 font-mono text-caption-1-medium shadow-2xs">
      <div className="flex items-center justify-between border-b border-separator-border/60 bg-background-secondary-default/90 px-3 py-1.5 text-caption-2-regular text-text-tertiary">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-rose-500/60" />
          <span className="size-2.5 rounded-full bg-amber-500/60" />
          <span className="size-2.5 rounded-full bg-emerald-500/60" />
          <span className="ml-2 flex items-center gap-1 text-text-secondary">
            <RiCommandLine className="size-3" />
            <span>{t("chat.shellCommand")}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(commandText).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            })
          }}
          className="inline-flex items-center gap-1 text-text-tertiary hover:text-text-primary"
        >
          {copied ? <RiCheckLine className="size-3 text-emerald-500" /> : <RiClipboardLine className="size-3" />}
          <span>{copied ? t("common.copied") : t("chat.copyCommand")}</span>
        </button>
      </div>
      <div className="overflow-x-auto whitespace-pre-wrap bg-background-secondary-default/40 p-3 leading-relaxed text-text-primary">
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

