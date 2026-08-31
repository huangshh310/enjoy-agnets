/**
 * 按工具类型渲染结果：diff / bash / grep，其余回退 JSON。
 */
import { RiTerminalBoxLine } from "@remixicon/react"
import { parseUnifiedDiff } from "@enjoy-agents/agent-core/diff"
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import { CodeBlock } from "@/components/ai-elements/code-block"
import { asRecord, readString } from "@renderer/lib/record"
import { FileDiff } from "./file-diff"

export function ToolResultView({ tool }: { tool: ThreadToolCall }) {
  if (tool.errorText) {
    return (
      <p className="px-1 py-2 text-caption-1-medium text-text-error-primary">{tool.errorText}</p>
    )
  }

  const result = asRecord(tool.result)
  const diffText = readString(result, "diff")
  if (diffText) {
    return (
      <div className="p-3">
        <FileDiff model={parseUnifiedDiff(diffText, readString(result, "path") || tool.name)} compact />
      </div>
    )
  }

  if (typeof result.stdout === "string" || typeof result.stderr === "string") {
    return <BashResult result={result} />
  }

  const matches = result.matches
  if (Array.isArray(matches)) {
    return <GrepResult matches={matches} />
  }

  if (tool.result == null) return null
  return (
    <div className="p-3">
      <CodeBlock
        code={typeof tool.result === "string" ? tool.result : JSON.stringify(tool.result, null, 2)}
        language="json"
      />
    </div>
  )
}

function BashResult({ result }: { result: Record<string, unknown> }) {
  const command = readString(result, "command")
  const stdout = readString(result, "stdout")
  const stderr = readString(result, "stderr")
  const exitCode = result.exitCode

  return (
    <div className="space-y-2 p-3">
      <div className="flex items-center gap-1.5 text-caption-1-medium text-text-secondary">
        <RiTerminalBoxLine className="size-3.5" />
        <span className="truncate font-mono">{command || "bash"}</span>
        {exitCode !== undefined ? (
          <span className="ml-auto text-text-tertiary">exit {String(exitCode)}</span>
        ) : null}
      </div>
      {stdout ? (
        <pre className="overflow-x-auto rounded-lg bg-background-secondary-default p-2 font-mono text-caption-1-regular text-text-primary">
          {stdout}
        </pre>
      ) : null}
      {stderr ? (
        <pre className="overflow-x-auto rounded-lg bg-text-error-primary/6 p-2 font-mono text-caption-1-regular text-text-error-primary">
          {stderr}
        </pre>
      ) : null}
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
