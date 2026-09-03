/**
 * 按工具类型渲染结果：File Diff / bash Tool Result，其余回退 JSON。
 */
import { RiTerminalBoxLine } from "@remixicon/react"
import { parseUnifiedDiff } from "@enjoy-agents/agent-core/diff"
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import { CodeBlock } from "@/components/ai-elements/code-block"
import { cx } from "@/utils/cx"
import { asRecord, readString } from "@renderer/lib/record"
import { FileDiff } from "./file-diff"
import { useT } from "@renderer/i18n"

export function ToolResultView({
  tool,
  embedded = false
}: {
  tool: ThreadToolCall
  embedded?: boolean
}) {
  if (tool.errorText) {
    return (
      <p className="px-1 py-2 text-caption-1-medium text-text-error-primary">{tool.errorText}</p>
    )
  }

  const result = asRecord(tool.result)
  const diffText = readString(result, "diff")
  if (diffText.trim()) {
    return (
      <FileDiff
        model={parseUnifiedDiff(diffText, readString(result, "path") || tool.name)}
        compact
        embedded={embedded}
      />
    )
  }

  if (typeof result.stdout === "string" || typeof result.stderr === "string") {
    return <BashResult tool={tool} result={result} />
  }

  const matches = result.matches
  if (Array.isArray(matches)) {
    return <GrepResult matches={matches} />
  }

  if (tool.result == null) return null
  return (
    <div className="overflow-hidden rounded-xl border border-separator-border/80">
      <CodeBlock
        code={typeof tool.result === "string" ? tool.result : JSON.stringify(tool.result, null, 2)}
        language="json"
      />
    </div>
  )
}

function BashResult({
  tool,
  result
}: {
  tool: ThreadToolCall
  result: Record<string, unknown>
}) {
  const t = useT()
  const command =
    readString(result, "command") || readString(asRecord(tool.args), "command") || tool.name
  const stdout = readString(result, "stdout")
  const stderr = readString(result, "stderr")
  const exitCode = result.exitCode
  const ok = exitCode === 0 || exitCode === undefined

  return (
    <div className="overflow-hidden rounded-xl border border-separator-border/80 bg-background-primary-default font-mono shadow-2xs">
      <header className="flex items-center gap-2 border-b border-separator-border/70 bg-background-secondary-default/50 px-3.5 py-2 text-[12px]">
        <RiTerminalBoxLine className="size-3.5 shrink-0 text-text-tertiary" />
        <span className="min-w-0 truncate text-caption-1-medium text-text-primary">{command}</span>
        {exitCode !== undefined ? (
          <span
            className={cx(
              "ml-auto shrink-0 text-caption-2-medium tabular-nums",
              ok ? "text-state-success-text" : "text-text-error-primary"
            )}
          >
            {t("chat.exitCode", { code: String(exitCode) })}
          </span>
        ) : null}
      </header>
      <div className="max-h-48 space-y-2 overflow-auto p-3">
        {stdout ? (
          <pre className="whitespace-pre-wrap break-all font-mono text-caption-1-regular text-text-primary">
            {stdout}
          </pre>
        ) : null}
        {stderr ? (
          <pre className="whitespace-pre-wrap break-all font-mono text-caption-1-regular text-text-error-primary">
            {stderr}
          </pre>
        ) : null}
      </div>
    </div>
  )
}

function GrepResult({ matches }: { matches: unknown[] }) {
  return (
    <div className="max-h-48 overflow-auto p-3">
      {matches.slice(0, 80).map((item, index) => {
        const row = asRecord(item)
        return (
          <div key={`${readString(row, "path")}-${index}`} className="flex gap-2 py-0.5 font-mono text-caption-2-regular">
            <span className="text-accent-600">{readString(row, "path")}</span>
            <span className="text-text-tertiary">{String(row.line ?? "")}</span>
            <span className="min-w-0 truncate text-text-secondary">{readString(row, "text")}</span>
          </div>
        )
      })}
    </div>
  )
}
