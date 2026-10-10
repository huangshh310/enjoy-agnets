/**
 * 「连一个模型」步的选项：只按 chat.readiness 真源露出，不编造不可用的路。
 * 本机模型 verified===false（远端 Ollama 等）要露出「未验证」，但不算就绪、不占推荐。
 */
import {
  isVerifiedLocalModel,
  type ChatLocalModelRoute,
  type ChatReadiness
} from "@enjoy-agents/ipc-contract/chat-readiness"

export type ConnectModelOption =
  | { id: string; kind: "engine"; runtimeId: string; name: string; recommended: boolean }
  | {
      id: string
      kind: "local_model"
      service: ChatLocalModelRoute["service"]
      verified: boolean
      recommended: boolean
    }
  | { id: string; kind: "api_key"; connected: boolean; recommended: boolean }
  | { id: string; kind: "later" }

/**
 * 已登录引擎 > 已验证本机模型 > 添加密钥。未验证本机模型仍露出，但不推荐。
 * 全新安装只留密钥与「以后再连」，两行等权。
 */
export function connectModelOptions(readiness: ChatReadiness | undefined): ConnectModelOption[] {
  const engines = readiness?.engines ?? []
  const locals = readiness?.localModels ?? []
  const hasKey = (readiness?.apiKeys.length ?? 0) > 0
  const options: ConnectModelOption[] = []
  let recommendNext = true

  for (const engine of engines) {
    options.push({
      id: `engine:${engine.runtimeId}`,
      kind: "engine",
      runtimeId: engine.runtimeId,
      name: engine.name,
      recommended: recommendNext
    })
    recommendNext = false
  }
  for (const local of locals) {
    const verified = isVerifiedLocalModel(local)
    options.push({
      id: `local_model:${local.service}`,
      kind: "local_model",
      service: local.service,
      verified,
      recommended: verified && recommendNext
    })
    if (verified) recommendNext = false
  }
  options.push({
    id: "api_key",
    kind: "api_key",
    connected: hasKey,
    recommended: !hasKey && recommendNext
  })
  options.push({ id: "later", kind: "later" })
  return equalizeFreshInstall(options)
}

export function connectModelRowHintKey(option: ConnectModelOption): string {
  if (option.kind === "engine") return "settings.setupGuide.connectEngineHint"
  if (option.kind === "local_model") {
    return option.verified
      ? "settings.setupGuide.connectLocalHint"
      : "settings.setupGuide.connectLocalUnverifiedWhy"
  }
  if (option.kind === "api_key") return "settings.setupGuide.connectApiKeyHint"
  return "settings.setupGuide.connectLaterHint"
}

/** 什么都没探测到：密钥和「以后再连」等权，不要把添加密钥做成唯一主钮。 */
function equalizeFreshInstall(options: ConnectModelOption[]): ConnectModelOption[] {
  const actionable = options.filter((item) => item.kind !== "later")
  if (actionable.length === 1 && actionable[0]?.kind === "api_key" && !actionable[0].connected) {
    return options.map((item) => (item.kind === "api_key" ? { ...item, recommended: false } : item))
  }
  return options
}
