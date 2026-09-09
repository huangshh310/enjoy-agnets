/**
 * Composer 引擎胶囊：只拼「引擎 · 模型」。
 * 供应商仅进 title / Picker 左栏，禁止第三段，禁止协议词。
 */
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
