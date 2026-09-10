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
  agent?: {
    label?: string
    selectedModel?: string | null
    models?: readonly { id: string; label: string }[]
  }
}

/** Enjoy Local 用档案目录；ACP 用 CLI selectedModel。禁止把上一引擎的 catalog 名带到 Grok。 */
export function composerActiveModelLabel(input: ComposerActiveModelInput): string {
  if (input.runtimeId === ENJOY_LOCAL) {
    return input.catalogLabel.trim() || input.catalogId.trim()
  }
  const selected = input.agent?.selectedModel?.trim()
  const fromCli = selected
    ? (input.agent?.models?.find((item) => item.id === selected)?.label ?? selected)
    : ""
  return fromCli || input.agent?.label?.trim() || input.runtimeId
}
