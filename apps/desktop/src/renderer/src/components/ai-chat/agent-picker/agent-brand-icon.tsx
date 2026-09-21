import { AgentToolId } from "@enjoy-agents/ipc-contract"
import {
  Amp,
  Antigravity,
  Claude,
  Codex,
  Cursor,
  DeepSeek,
  Gemini,
  Grok,
  HermesAgent,
  Hunyuan,
  Kimi,
  Minimax,
  OpenCode,
  Pi,
  Qwen,
  Zhipu
} from "@lobehub/icons"
import { AppMark } from "@renderer/components/brand/app-mark"
import { cx } from "@/utils/cx"

import { resolveIconSize, normalizeAgentId } from "./agent-brand-utils"
export { resolveIconSize, normalizeAgentId }

export function AgentBrandIcon({
  id,
  size,
  className
}: {
  id: string
  size?: number
  className?: string
}) {
  const normId = normalizeAgentId(id)
  const resolvedSize = resolveIconSize(size, className)

  if (normId === "enjoy-local") return <AppMark size={resolvedSize} className={className} />
  if (normId === "claude") return <Claude.Color size={resolvedSize} className={className} />
  if (normId === "cursor") return <Cursor size={resolvedSize} className={className} />
  if (normId === "grok") return <Grok size={resolvedSize} className={className} />
  if (normId === "codex") return <Codex.Color size={resolvedSize} className={className} />
  if (normId === "antigravity") return <Antigravity.Color size={resolvedSize} className={className} />
  if (normId === "gemini") return <Gemini.Color size={resolvedSize} className={className} />
  if (normId === "opencode") return <OpenCode size={resolvedSize} className={className} />
  if (normId === "pi" || normId === "omp") return <Pi size={resolvedSize} className={className} />
  if (normId === "hermes") return <HermesAgent size={resolvedSize} className={className} />
  if (normId === "amp") return <Amp.Color size={resolvedSize} className={className} />
  if (normId === "deepseek") return <DeepSeek.Color size={resolvedSize} className={className} />
  if (normId === "qwen") return <Qwen size={resolvedSize} className={className} />
  if (normId === "kimi") return <Kimi size={resolvedSize} className={className} />
  if (normId === "codebuddy") return <Hunyuan size={resolvedSize} className={className} />
  if (normId === "glm") return <Zhipu size={resolvedSize} className={className} />
  if (normId === "minimax") return <Minimax size={resolvedSize} className={className} />
  return <AgentFallbackMark id={id} size={resolvedSize} className={className} />
}

function AgentFallbackMark({ id, size, className }: { id: string; size: number; className?: string }) {
  const mark = fallbackLetter(id)
  return (
    <span
      aria-hidden
      className={cx(
        "inline-flex items-center justify-center rounded-md bg-background-secondary-default text-text-tertiary select-none font-medium",
        className
      )}
      style={{ width: size, height: size, fontSize: Math.max(8, size * (mark.length > 1 ? 0.38 : 0.55)) }}
    >
      {mark}
    </span>
  )
}

export function isAgentToolId(id: string): id is AgentToolId {
  return AgentToolId.safeParse(id).success
}

function fallbackLetter(id: string): string {
  const slug = id.startsWith("custom:") ? id.slice("custom:".length) : id
  const key = slug.toLowerCase()
  if (key === "droid") return "Dr"
  if (key === "devin") return "De"
  return (slug[0] ?? "?").toUpperCase()
}

