/**
 * 从 Composer 正文读出 @桌面 / @应用 偏置。提及 ≠ 放行。
 */
import type { DesktopMentionApp } from "@enjoy-agents/ipc-contract"
import { DESKTOP_HOST_TOKEN, isDesktopHostToken } from "./constants.ts"

export type DesktopMentionBias =
  | { kind: "host" }
  | { kind: "app"; displayName: string; appKey: string; stable: boolean }

const TOKEN_RE = /@([^\s@]+)/g

/** 最后一个能对上的提及赢；对不上名单的 token 丢掉，不造假应用。 */
export function readDesktopMentionBias(
  text: string,
  apps: readonly DesktopMentionApp[]
): DesktopMentionBias | null {
  let bias: DesktopMentionBias | null = null
  for (const match of text.matchAll(TOKEN_RE)) {
    const token = match[1] ?? ""
    const next = matchDesktopToken(token, apps)
    if (next) bias = next
  }
  return bias
}

export function desktopMentionInsert(item: {
  role: "host" | "app"
  token: string
}): string {
  const token = item.role === "host" ? DESKTOP_HOST_TOKEN : item.token
  return `@${token} `
}

function matchDesktopToken(token: string, apps: readonly DesktopMentionApp[]): DesktopMentionBias | null {
  if (isDesktopHostToken(token)) return { kind: "host" }
  const needle = token.trim().toLowerCase()
  const hit = apps.find((app) => appTokenHaystack(app).includes(needle))
  if (!hit) return null
  return {
    kind: "app",
    displayName: hit.displayName,
    appKey: hit.appKey,
    stable: hit.stable
  }
}

function appTokenHaystack(app: DesktopMentionApp): string {
  return `${app.displayName} ${app.appKey}`.toLowerCase()
}
