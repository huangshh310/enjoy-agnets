/**
 * 合并目录、覆盖与探测，给设置 / Composer 用。
 * 列表只做 PATH 查找，不跑 --version；version 留给 doctor。
 */
import {
  AGENT_TOOL_PRESETS,
  catalogFor,
  detectStatusFor,
  installKindFor,
  probeBinaries,
  type AgentToolPreset
} from "@enjoy-agents/agent-harness"
import type { AgentToolId, AgentToolDoctorResult, AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { safeCustomBinaryPath } from "./agent-tools-guard"
import { readAgentToolOverrides, writeAgentToolOverride } from "./agent-tools-vault"

export async function listAgentTools(): Promise<AgentToolPublic[]> {
  const overrides = readAgentToolOverrides()
  return Promise.all(AGENT_TOOL_PRESETS.map((preset) => toPublic(preset, overrides[preset.id])))
}

export async function detectAgentTools(): Promise<AgentToolPublic[]> {
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
  const models = catalog?.models ?? []
  const selected =
    override?.modelId && models.some((item) => item.id === override.modelId)
      ? override.modelId
      : catalog?.defaultModel
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
