/**
 * 合并目录、覆盖与探测，给设置 / Composer 用。
 * 列表只做 PATH 查找，不跑 --version / auth status；账号留给 inspect。
 */
import {
  AGENT_TOOL_PRESETS,
  catalogFor,
  detectStatusFor,
  installKindFor,
  probeBinaries,
  type AgentToolPreset
} from "@enjoy-agents/agent-harness"
import type { AgentCliModel, AgentToolId, AgentToolDoctorResult, AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { invalidateAccountCache } from "./agent-tools-account/inspect"
import { safeCustomBinaryPath } from "./agent-tools-guard"
import { readAgentToolOverrides, writeAgentToolOverride } from "./agent-tools-vault"
import { readVault } from "./secrets-vault"

export async function listAgentTools(): Promise<AgentToolPublic[]> {
  const overrides = readAgentToolOverrides()
  return Promise.all(AGENT_TOOL_PRESETS.map((preset) => toPublic(preset, overrides[preset.id])))
}

export async function detectAgentTools(): Promise<AgentToolPublic[]> {
  invalidateAccountCache()
  return listAgentTools()
}

export async function upsertAgentTool(input: {
  id: AgentToolId
  enabled?: boolean
  binaryPath?: string
  extraArgs?: string[]
  modelId?: string
  providerId?: string
  useCustomProvider?: boolean
}): Promise<AgentToolPublic[]> {
  writeAgentToolOverride(input.id, {
    enabled: input.enabled,
    binaryPath: input.binaryPath,
    extraArgs: input.extraArgs,
    modelId: input.modelId,
    providerId: input.providerId,
    useCustomProvider: input.useCustomProvider
  })
  return listAgentTools()
}

export async function doctorAgentTool(id: AgentToolId): Promise<AgentToolDoctorResult> {
  invalidateAccountCache(id)
  const preset = AGENT_TOOL_PRESETS.find((item) => item.id === id)
  if (!preset) return { id, ok: false, message: "Unknown agent tool.", version: null, path: null }
  if (preset.skillOnly) {
    return { id, ok: true, message: preset.needsLoginHint, version: null, path: null }
  }
  if (preset.id === "enjoy-local") {
    return { id, ok: true, message: "Enjoy Local uses Providers + ToolLoop.", version: null, path: null }
  }
  const override = readAgentToolOverrides()[id]
  const custom = safeCustomBinaryPath(id, override?.binaryPath)
  const names = custom ? [custom] : [...preset.binaries]
  const probe = await probeBinaries(names, preset.detectArgs)
  if (!probe.found) {
    return {
      id,
      ok: false,
      message: `Not found. ${preset.needsLoginHint || "Install the CLI and ensure it is on PATH."}`,
      version: null,
      path: null
    }
  }
  return {
    id,
    ok: true,
    message: probe.version ?? "Found.",
    version: probe.version,
    path: probe.path
  }
}

function supportedStylesForTool(id: string): string[] {
  if (id === "claude") return ["anthropic"]
  if (id === "codex") return ["openai", "openai-responses"]
  if (id === "cursor") return ["openai", "anthropic"]
  if (id === "antigravity") return ["google", "openai"]
  return []
}

async function toPublic(
  preset: AgentToolPreset,
  override?: {
    enabled?: boolean
    binaryPath?: string
    extraArgs?: string[]
    modelId?: string
    providerId?: string
    useCustomProvider?: boolean
  }
): Promise<AgentToolPublic> {
  const custom = safeCustomBinaryPath(preset.id, override?.binaryPath)
  const names = custom ? [custom] : [...preset.binaries]
  const probe =
    names.length > 0
      ? await probeBinaries(names, [])
      : { found: preset.id === "enjoy-local", path: null, version: null }
  const catalog = catalogFor(preset.id)
  const models = await catalogModels(preset.id, override?.providerId)
  const selected =
    override?.modelId && models.some((item) => item.id === override.modelId)
      ? override.modelId
      : (models[0]?.id ?? catalog?.defaultModel)
  return {
    id: preset.id,
    label: preset.label,
    transport: preset.transport,
    binaries: [...preset.binaries],
    acpArgs: [...preset.acpArgs],
    needsLoginHint: preset.needsLoginHint,
    available: preset.available,
    comingSoon: preset.comingSoon,
    skillOnly: preset.skillOnly,
    enabled: override?.enabled ?? (preset.available && !preset.skillOnly),
    binaryPath: override?.binaryPath,
    extraArgs: override?.extraArgs,
    detectedPath: probe.path,
    version: probe.version,
    status: detectStatusFor(preset, probe),
    models,
    selectedModel: selected,
    installKind: installKindFor(preset.id),
    installCommand: catalog?.installCommand ?? "",
    docsUrl: catalog?.docsUrl ?? "",
    providerId: override?.providerId,
    useCustomProvider: override?.useCustomProvider ?? false,
    supportedApiStyles: supportedStylesForTool(preset.id)
  }
}

/** 列表只用静态目录 + 已绑定供应商模型；账号侧模型走 inspect。 */
async function catalogModels(presetId: string, providerId?: string): Promise<AgentCliModel[]> {
  const baseModels = catalogFor(presetId)?.models ? [...catalogFor(presetId)!.models] : []
  if (!providerId) return baseModels
  try {
    const vault = await readVault()
    const profile = vault.profiles.find((item) => item.id === providerId)
    for (const model of profile?.models ?? []) {
      if (!baseModels.some((item) => item.id === model.id)) {
        baseModels.push({ id: model.id, label: model.label || model.id })
      }
    }
  } catch {
    // vault 读失败时仍返回目录表
  }
  return baseModels
}
