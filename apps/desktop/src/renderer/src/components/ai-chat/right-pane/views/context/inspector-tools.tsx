/**
 * 本轮工具：按 ToolCallState 显示进行中 / 完成 / 失败 / 拒绝。
 */
import { RiCheckLine, RiCloseLine, RiCommandLine, RiLoader4Line } from "@remixicon/react"
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import { useT, type TranslateFn } from "@renderer/i18n"
import { toolRunKind } from "./thread-run-slice"

export function InspectorTools({
  tools,
  running
}: {
  tools: ThreadToolCall[]
  running: boolean
}) {
  const t = useT()
  return (
    <section className="flex flex-col gap-2 border-t border-separator-border/50 pt-3">
      <div className="flex items-center justify-between">
        <span className="text-caption-2-medium font-semibold text-text-tertiary">
          {t("chat.inspectorTools")}
        </span>
        {running ? (
          <span className="text-caption-2-medium text-accent-500">{t("chat.inspectorRunning")}</span>
        ) : null}
      </div>
      {tools.length === 0 ? (
        <p className="text-caption-2-regular text-text-tertiary">{t("chat.inspectorEmptyTools")}</p>
      ) : (
        <div className="flex flex-col gap-1">
          {tools.map((tool) => (
            <ToolRow key={tool.id} tool={tool} />
          ))}
        </div>
      )}
    </section>
  )
}

function ToolRow({ tool }: { tool: ThreadToolCall }) {
  const t = useT()
  const kind = toolRunKind(tool.state, tool)
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border-button-default/60 bg-background-secondary-default/30 px-2.5 py-1.5">
      <div className="flex min-w-0 items-center gap-2">
        <RiCommandLine className="size-3.5 shrink-0 text-text-tertiary" />
        <span className="truncate font-mono text-caption-2-medium text-text-primary">{tool.name}</span>
      </div>
      <ToolMark kind={kind} label={statusLabel(kind, t)} />
    </div>
  )
}

function statusLabel(kind: ReturnType<typeof toolRunKind>, t: TranslateFn) {
  if (kind === "ok") return t("chat.inspectorToolOk")
  if (kind === "error") return t("chat.inspectorToolError")
  if (kind === "denied") return t("chat.inspectorToolDenied")
  if (kind === "skipped") return t("chat.toolStaleObservation")
  return t("chat.inspectorToolRunning")
}

function ToolMark({ kind, label }: { kind: ReturnType<typeof toolRunKind>; label: string }) {
  if (kind === "ok") {
    return (
      <span className="flex items-center gap-1 text-caption-2-medium text-state-success-text">
        <RiCheckLine className="size-3" />
        {label}
      </span>
    )
  }
  if (kind === "skipped") {
    return (
      <span className="flex items-center gap-1 text-caption-2-medium text-text-tertiary">
        <span className="size-1.5 rounded-full bg-text-tertiary" />
        {label}
      </span>
    )
  }
  if (kind === "error" || kind === "denied") {
    return (
      <span className="flex items-center gap-1 text-caption-2-medium text-text-error-primary">
        <RiCloseLine className="size-3" />
        {label}
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-caption-2-medium text-accent-500">
      <RiLoader4Line className="size-3 animate-spin" />
      {label}
    </span>
  )
}
