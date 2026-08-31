/**
 * Harness 适配器目录：按 Provider 选插件，而不是写死 Claude + Vercel。
 * available=false 的槽位只做占位，方便以后接 DeepSeek 等适配器。
 */
export type HarnessAdapterId = "claude-code" | "deepseek"

export type HarnessAdapter = {
  id: HarnessAdapterId
  label: string
  description: string
  providerKinds: readonly string[]
  needsSandbox: boolean
  available: boolean
  comingSoon: boolean
}

export const HARNESS_ADAPTERS: readonly HarnessAdapter[] = [
  {
    id: "claude-code",
    label: "Claude Code",
    description: "Uses the Anthropic key from Providers. Vercel Sandbox is only the jail.",
    providerKinds: ["anthropic"],
    needsSandbox: true,
    available: true,
    comingSoon: false
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    description: "Not shipped yet. Local ToolLoop already runs your DeepSeek models and tools.",
    providerKinds: ["deepseek"],
    needsSandbox: false,
    available: false,
    comingSoon: true
  }
]

/** 按 id 取适配器。 */
export function harnessAdapterById(id: string | undefined): HarnessAdapter | undefined {
  if (!id) return undefined
  return HARNESS_ADAPTERS.find((item) => item.id === id)
}

/** 当前供应商对应的 Harness 槽位。 */
export function harnessAdapterForProvider(kind: string | undefined): HarnessAdapter | undefined {
  if (!kind) return undefined
  return HARNESS_ADAPTERS.find((item) => item.providerKinds.includes(kind))
}

/**
 * 解析实际要用的适配器：显式 id 优先，否则跟当前 Provider。
 */
export function resolveHarnessAdapter(
  harnessId: string | undefined,
  providerKind: string | undefined
): HarnessAdapter | undefined {
  return harnessAdapterById(harnessId) ?? harnessAdapterForProvider(providerKind)
}
