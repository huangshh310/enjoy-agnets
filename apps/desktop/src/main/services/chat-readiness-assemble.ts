/**
 * 可对话路线纯组装。探测与推送在 chat-readiness.ts。
 */
import {
  apiKeyRoutes,
  buildChatReadiness,
  countAvailableEngines,
  isLoopbackModelBaseUrl,
  localModelRoutes,
  signedInEngineRoutes,
  type AvailableEngineTool,
  type ChatReadiness,
  type PublicKeyProvider
} from "@enjoy-agents/ipc-contract/chat-readiness"

export function assembleChatReadiness(
  tools: readonly AvailableEngineTool[],
  providers: readonly PublicKeyProvider[],
  live: readonly ("ollama" | "lmstudio")[],
  loggedInIds: ReadonlySet<string> = new Set()
): ChatReadiness {
  const remoteUnverified = providers
    .filter(
      (row) =>
        row.enabled !== false &&
        (row.kind === "ollama" || row.kind === "lmstudio") &&
        !isLoopbackModelBaseUrl(row.baseURL)
    )
    .map((row) => row.kind)
  return buildChatReadiness({
    engines: signedInEngineRoutes(tools, loggedInIds),
    localModels: localModelRoutes(live, remoteUnverified),
    apiKeys: apiKeyRoutes(providers),
    engineCount: countAvailableEngines(tools)
  })
}

export const LOCAL_MODEL_PING_MS = 400

const LOCAL_PING_URL: Record<"ollama" | "lmstudio", string> = {
  ollama: "http://127.0.0.1:11434/api/tags",
  lmstudio: "http://127.0.0.1:1234/v1/models"
}

export async function pingLocalModelServices(
  now: (url: string, ms: number) => Promise<boolean> = pingWithTimeout
): Promise<Array<"ollama" | "lmstudio">> {
  const hits = await Promise.all([
    now(LOCAL_PING_URL.ollama, LOCAL_MODEL_PING_MS).then((ok) => (ok ? "ollama" : null)),
    now(LOCAL_PING_URL.lmstudio, LOCAL_MODEL_PING_MS).then((ok) => (ok ? "lmstudio" : null))
  ])
  return hits.filter((hit): hit is "ollama" | "lmstudio" => Boolean(hit))
}

export async function pingWithTimeout(url: string, ms: number): Promise<boolean> {
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), ms)
  try {
    const response = await fetch(url, { signal: abort.signal })
    return response.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}
