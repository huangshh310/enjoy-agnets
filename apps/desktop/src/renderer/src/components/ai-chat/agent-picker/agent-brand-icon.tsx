/**
 * Agent 品牌标：输入框切 Agent 用，走 Lobe Icons。
 * 未知 id 用首字母，不要回退成 Enjoy 标，免得目录里出现两个 e。
 */
import { AgentToolId } from "@enjoy-agents/ipc-contract"
import { Amp, Antigravity, Claude, Codex, Cursor, DeepSeek, Gemini, OpenCode, Pi } from "@lobehub/icons"
import { AppMark } from "@renderer/components/brand/app-mark"

export function AgentBrandIcon({
  id,
  size = 16
}: {
  id: string
  size?: number
}) {
  if (id === "enjoy-local") return <AppMark size={size} />
  if (id === "claude") return <Claude.Color size={size} />
  if (id === "cursor") return <Cursor size={size} />
  if (id === "codex") return <Codex.Color size={size} />
  if (id === "antigravity") return <Antigravity.Color size={size} />
  if (id === "gemini") return <Gemini.Color size={size} />
  if (id === "opencode") return <OpenCode size={size} />
  if (id === "pi") return <Pi size={size} />
  if (id === "amp") return <Amp.Color size={size} />
  if (id === "deepseek") return <DeepSeek.Color size={size} />
  return <AgentFallbackMark id={id} size={size} />
}

function AgentFallbackMark({ id, size }: { id: string; size: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex items-center justify-center rounded-md bg-background-secondary-default text-text-tertiary"
      style={{ width: size, height: size, fontSize: Math.max(9, size * 0.55) }}
    >
      {(id[0] ?? "?").toUpperCase()}
    </span>
  )
}

export function isAgentToolId(id: string): id is AgentToolId {
  return AgentToolId.safeParse(id).success
}
