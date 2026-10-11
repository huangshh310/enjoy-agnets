/**
 * Composer 引擎胶囊：只拼「引擎 · 模型」。
 * 供应商仅进 title / Picker 左栏，禁止第三段，禁止协议词。
 */
import { sessionOverlayOnEngine } from "@enjoy-agents/ipc-contract/session-overlay"
import { joinSegments } from "../../../lib/join-segments"
import { resolveModelDisplayName } from "../../../lib/model-display-name"

const ENJOY_LOCAL = "enjoy-local"

export function composerChipParts(input: {
  engineLabel: string
  modelLabel: string
  providerLabel?: string
}): { engine: string; model: string; title: string } {
  const engine = input.engineLabel.trim()
  const model = input.modelLabel.trim()
  const provider = input.providerLabel?.trim() ?? ""
  const title = joinSegments(engine, provider, model)
  return { engine, model, title }
}

export function composerChipText(parts: { engine: string; model: string }): string {
  return joinSegments(parts.engine, parts.model)
}

export type ComposerActiveModelInput = {
  runtimeId: string
  catalogLabel: string
  catalogId: string
  /** 会话覆盖优先于引擎默认 selectedModel。 */
  sessionModelId?: string | null
  agent?: {
    label?: string
    selectedModel?: string | null
    models?: readonly { id: string; label: string }[]
    useCustomProvider?: boolean
    boundProviderName?: string
  }
}

/**
 * 会话覆盖只在当前引擎的名单里生效。
 * 没拿到 agent 时先保留；名单已到但是空或不含该 id，就丢掉。
 */
export function sessionModelOnEngine(input: {
  runtimeId: string
  sessionModelId?: string | null
  agent?: { models?: readonly { id: string }[] }
}): string {
  return sessionOverlayOnEngine({
    runtimeId: input.runtimeId,
    sessionModelId: input.sessionModelId,
    modelIds: input.agent ? (input.agent.models?.map((item) => item.id) ?? []) : undefined
  })
}

/** 当前引擎正在用的模型 id。Enjoy 本地用档案；ACP 用本引擎会话覆盖或 CLI selectedModel。 */
export function composerActiveModelId(input: ComposerActiveModelInput): string {
  const overlay = sessionModelOnEngine(input)
  if (input.runtimeId === ENJOY_LOCAL) return overlay || input.catalogId.trim()
  return overlay || input.agent?.selectedModel?.trim() || ""
}

/** Enjoy Local 用档案目录；ACP 用会话覆盖或 CLI selectedModel。绑定档案时不要用 inspect 假目录。 */
export function composerActiveModelLabel(input: ComposerActiveModelInput): string {
  if (input.runtimeId === ENJOY_LOCAL) {
    return resolveModelDisplayName(input.catalogId, input.catalogLabel)
  }
  const selected = sessionModelOnEngine(input) || input.agent?.selectedModel?.trim()
  const fromList = selected
    ? input.agent?.models?.find((item) => item.id === selected)?.label
    : undefined
  if (selected) return resolveModelDisplayName(selected, fromList)
  if (input.agent?.useCustomProvider) {
    return input.agent.boundProviderName?.trim() || input.agent.label?.trim() || input.runtimeId
  }
  return input.agent?.label?.trim() || input.runtimeId
}

/** 绑定档案时 title 带档案名；胶囊正文仍是引擎 · 模型。 */
export function composerBoundProviderLabel(agent?: {
  useCustomProvider?: boolean
  boundProviderName?: string
}): string | undefined {
  if (!agent?.useCustomProvider) return undefined
  const name = agent.boundProviderName?.trim()
  return name || undefined
}
