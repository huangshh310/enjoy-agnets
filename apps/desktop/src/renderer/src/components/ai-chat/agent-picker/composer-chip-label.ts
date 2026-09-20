/**
 * Composer 引擎胶囊：只拼「引擎 · 模型」。
 * 供应商仅进 title / Picker 左栏，禁止第三段，禁止协议词。
 */
const ENJOY_LOCAL = "enjoy-local"

export function composerChipParts(input: {
  engineLabel: string
  modelLabel: string
  providerLabel?: string
}): { engine: string; model: string; title: string } {
  const engine = input.engineLabel.trim()
  const model = input.modelLabel.trim()
  const provider = input.providerLabel?.trim() ?? ""
  const title = [engine, provider, model].filter(Boolean).join(" · ")
  return { engine, model, title }
}

export function composerChipText(parts: { engine: string; model: string }): string {
  return [parts.engine, parts.model].filter(Boolean).join(" · ")
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

/** Enjoy Local 用档案目录；ACP 用会话覆盖或 CLI selectedModel。绑定档案时不要用 inspect 假目录。 */
export function composerActiveModelLabel(input: ComposerActiveModelInput): string {
  if (input.runtimeId === ENJOY_LOCAL) {
    return input.catalogLabel.trim() || input.catalogId.trim()
  }
  const selected = input.sessionModelId?.trim() || input.agent?.selectedModel?.trim()
  const fromList = selected
    ? (input.agent?.models?.find((item) => item.id === selected)?.label ?? selected)
    : ""
  if (input.agent?.useCustomProvider) {
    return fromList || input.agent.boundProviderName?.trim() || input.agent.label?.trim() || input.runtimeId
  }
  return fromList || input.agent?.label?.trim() || input.runtimeId
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
