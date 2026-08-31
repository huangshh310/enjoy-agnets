/**
 * 人机确认卡片：写文件 / 改文件展示即将落地的 File Diff，shell 展示命令。
 */
import { useQuery } from "@tanstack/react-query"
import { RiShieldKeyholeLine, RiTerminalBoxLine } from "@remixicon/react"
import { diffTexts } from "@enjoy-agents/agent-core/diff"
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

  return (
    <div className="overflow-hidden rounded-3xl border border-border-button-default bg-background-secondary-default/60 shadow-xs">
      <div className="flex items-start gap-3 px-4 pt-3.5 pb-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
          <RiShieldKeyholeLine className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-title-3-semibold text-text-primary">Approve {formatToolName(pending.name)}</p>
          <p className="mt-0.5 text-caption-1-medium text-text-secondary">
            Review the change before the agent continues.
          </p>
        </div>
      </div>

      <div className="px-4 pb-3">
        <ApprovalPreview name={pending.name} args={args} />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-separator-border px-4 py-3">
        <Button size="sm" onClick={onApprove}>
          Allow
        </Button>
        <Button size="sm" variant="outline" onClick={onAllowSession}>
          Allow for session
        </Button>
        <Button size="sm" variant="destructive" onClick={onDeny}>
          Deny
        </Button>
      </div>
    </div>
  )
}

function ApprovalPreview({ name, args }: { name: string; args: Record<string, unknown> }) {
  if (name === "edit_file") return <EditFilePreview args={args} />
  if (name === "write_file") return <WorkspaceFilePreview path={readString(args, "path")} next={readString(args, "content")} />
  if (name === "bash") {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-border-button-default bg-background-primary-default px-3 py-2">
        <RiTerminalBoxLine className="mt-0.5 size-4 text-text-tertiary" />
        <pre className="min-w-0 flex-1 font-mono text-caption-1-regular text-text-primary">
          {readString(args, "command") || JSON.stringify(args, null, 2)}
        </pre>
      </div>
    )
  }
  return (
    <div className="overflow-hidden rounded-xl border border-border-button-default">
      <CodeBlock code={JSON.stringify(args, null, 2)} language="json" />
    </div>
  )
}

function EditFilePreview({ args }: { args: Record<string, unknown> }) {
  const path = readString(args, "path")
  const oldText = readString(args, "oldText")
  const newText = readString(args, "newText")
  return (
    <WorkspaceFilePreview
      path={path}
      nextFromCurrent={(current) => (current.includes(oldText) ? current.replace(oldText, newText) : newText)}
      fallbackCurrent={oldText}
    />
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
  nextFromCurrent?: (current: string) => string
  fallbackCurrent?: string
}) {
  const workspaceId = useChatStore((state) => state.workspaceId)
  const query = useQuery({
    queryKey: ["approval-file-preview", workspaceId, path],
    enabled: Boolean(workspaceId && path && hasIde()),
    queryFn: async () => {
      try {
        return (await getIde().workspace.readFile({ workspaceId, path })) as string
      } catch {
        return fallbackCurrent
      }
    }
  })
  if (query.isPending && query.fetchStatus !== "idle") {
    return <p className="text-caption-1-medium text-text-tertiary">Loading current file…</p>
  }
  const current = query.data ?? fallbackCurrent
  const upcoming = nextFromCurrent ? nextFromCurrent(current) : (next ?? "")
  return <FileDiff model={diffTexts(current, upcoming, path || "file")} compact />
}
