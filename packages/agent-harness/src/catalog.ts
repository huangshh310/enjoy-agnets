/**
 * Harness 适配器目录：按 Provider 或显式 id 选插件。
 * available=false 的槽位只做占位，方便以后接 DeepSeek 等适配器。
 */
export type HarnessAdapterId = "claude-code" | "codex" | "pi" | "opencode" | "deepseek"

export type HarnessAdapter = {
  id: HarnessAdapterId
  label: string
  description: string
  providerKinds: readonly string[]
  needsSandbox: boolean
  /** false：走本机 CLI / 自有配置，不强制 Providers Key。 */
  needsProviderKey: boolean
  /** vercel = 要端口的桥接沙箱；just-bash = 本机虚文件系统。 */
  sandboxKind: "vercel" | "just-bash" | "none"
  available: boolean
  comingSoon: boolean
}

export const HARNESS_ADAPTERS: readonly HarnessAdapter[] = [
  {
    id: "claude-code",
    label: "Claude Code",
    description: "Anthropic key from Providers. Vercel Sandbox is the jail.",
    providerKinds: ["anthropic"],
    needsSandbox: true,
    needsProviderKey: true,
    sandboxKind: "vercel",
    available: true,
    comingSoon: false
  },
  {
    id: "codex",
    label: "Codex",
    description: "OpenAI key from Providers. Bridge-backed; needs a network sandbox.",
    providerKinds: ["openai"],
    needsSandbox: true,
    needsProviderKey: true,
    sandboxKind: "vercel",
    available: true,
    comingSoon: false
  },
  {
    id: "pi",
    label: "Pi",
    description: "Host-runtime Pi CLI. Default jail is local just-bash, not Vercel.",
    providerKinds: [],
    needsSandbox: false,
    needsProviderKey: false,
    sandboxKind: "just-bash",
    available: true,
    comingSoon: false
  },
  {
    id: "opencode",
    label: "OpenCode",
    description: "OpenCode bridge. Uses its own model config; Vercel Sandbox is the jail.",
    providerKinds: [],
    needsSandbox: true,
    needsProviderKey: false,
    sandboxKind: "vercel",
    available: true,
    comingSoon: false
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    description: "Not shipped yet. Local ToolLoop already runs your DeepSeek models and tools.",
    providerKinds: ["deepseek"],
    needsSandbox: false,
    needsProviderKey: true,
    sandboxKind: "none",
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
