/**
 * 合并目录、覆盖与探测，给设置 / Composer 用。
 * 列表只做 PATH 查找，不跑 --version / auth status；账号留给 inspect。
 */
import {
  AGENT_TOOL_PRESETS,
  canPromoteComingSoon,
  catalogFor,
  detectStatusFor,
  installKindFor,
  M4_PROMOTION_ORDER,
  probeBinaries,
  type AgentToolPreset
} from "@enjoy-agents/agent-harness"
import {
  capabilitiesFor,
  composeAgentModels,
  isCustomAgentId,
  pickBoundModelId,
  requiredVersionFor,
  type AgentToolId,
  type AgentToolDoctorResult,
  type AgentToolPublic
} from "@enjoy-agents/ipc-contract"
import { assertAndClampBind } from "./agent-tools-bind-assert"
import { invalidateAccountCache } from "./agent-tools-account/inspect"
import { doctorAcpHandshake } from "./agent-tools-doctor-acp"
import { getCustomAgent, readCustomAgents, toPublicCustom, upsertCustomAgent } from "./agent-tools-custom"
import { safeCustomBinaryPath } from "./agent-tools-guard"
import { homeSyncedFor } from "./agent-tools-home-sync"
import { readAgentToolOverrides, writeAgentToolOverride } from "./agent-tools-vault"
import { readVault } from "./secrets-vault"

export async function listAgentTools(): Promise<AgentToolPublic[]> {
  const overrides = readAgentToolOverrides()
  const names = await providerNames()
  const builtin = await Promise.all(
    AGENT_TOOL_PRESETS.map((preset) => toPublic(preset, overrides[preset.id], names))
  )
  const custom = await Promise.all(readCustomAgents().map((record) => toPublicCustom(record)))
  return [...builtin, ...custom]
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
  if (isCustomAgentId(input.id)) {
    const existing = getCustomAgent(input.id)
    if (!existing) throw new Error(`Unknown custom agent '${input.id}'.`)
    upsertCustomAgent({
      id: existing.id,
      label: existing.label,
      command: input.binaryPath?.trim() || existing.command,
      args: input.extraArgs ?? existing.args,
      env: existing.env,
      cwdMode: existing.cwdMode,
      cwd: existing.cwd,
      enabled: input.enabled ?? existing.enabled,
      modelId: input.modelId ?? existing.modelId
    })
    return listAgentTools()
  }
  const clamped = await assertAndClampBind(input)
  writeAgentToolOverride(input.id, {
    enabled: input.enabled,
    binaryPath: input.binaryPath,
    extraArgs: input.extraArgs,
    modelId: clamped.modelId,
    providerId: input.providerId,
    useCustomProvider: input.useCustomProvider
  })
  return listAgentTools()
}

export async function doctorAgentTool(id: AgentToolId): Promise<AgentToolDoctorResult> {
  invalidateAccountCache(id)
  if (isCustomAgentId(id)) return doctorCustom(id)
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
  if (preset.companionBinaries?.length) {
    const companion = await probeBinaries([...preset.companionBinaries], [])
    if (!companion.found) {
      return {
        id,
        ok: false,
        message: `Found ${probe.path}, but missing ${preset.companionBinaries.join(" / ")}. ${preset.needsLoginHint}`,
        version: probe.version,
        path: probe.path
      }
    }
  }
  return doctorAcpHandshake({
    id,
    preset,
    probe,
    binaryPath: custom ?? probe.path ?? undefined
  })
}

function supportedStylesForTool(id: string): string[] {
  if (id === "claude") return ["anthropic"]
  if (id === "codex") return ["openai", "openai-responses"]
  if (id === "gemini") return ["google"]
  if (id === "opencode") return ["openai", "openai-responses", "anthropic", "google"]
  if (id === "deepseek") return ["openai"]
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
  },
  providerNames?: Map<string, string>
): Promise<AgentToolPublic> {
  const custom = safeCustomBinaryPath(preset.id, override?.binaryPath)
  const binaries = custom ? [custom] : [...preset.binaries]
  const probe =
    binaries.length > 0
      ? await probeBinaries(binaries, [])
      : { found: preset.id === "enjoy-local", path: null, version: null }
  let status = detectStatusFor(preset, probe)
  if (comingSoonFlag(preset)) status = "comingSoon"
  if (status === "ready" && preset.companionBinaries?.length) {
    const companion = await probeBinaries([...preset.companionBinaries], [])
    if (!companion.found) status = "missing"
  }
  const catalog = catalogFor(preset.id)
  const bound = override?.useCustomProvider === true
  const profile = bound ? await loadBoundProfile(override?.providerId) : undefined
  const models = composeAgentModels({
    catalog: catalog?.models ? [...catalog.models] : [],
    bound,
    vaultModels: profile?.models
  })
  const selected = bound
    ? pickBoundModelId(override?.modelId, models)
    : override?.modelId && models.some((item) => item.id === override.modelId)
      ? override.modelId
      : (models[0]?.id ?? catalog?.defaultModel)
  return {
    id: preset.id,
    label: preset.label,
    transport: preset.transport,
    binaries: [...preset.binaries],
    acpArgs: [...preset.acpArgs],
    needsLoginHint: preset.needsLoginHint,
    available: availableFlag(preset),
    comingSoon: comingSoonFlag(preset),
    skillOnly: preset.skillOnly,
    enabled: override?.enabled ?? (availableFlag(preset) && !preset.skillOnly),
    binaryPath: override?.binaryPath,
    extraArgs: override?.extraArgs,
    detectedPath: probe.path,
    version: probe.version,
    requiredVersion: requiredVersionFor(preset.id),
    status,
    models,
    selectedModel: selected,
    installKind: installKindFor(preset.id),
    installCommand: catalog?.installCommand ?? "",
    docsUrl: catalog?.docsUrl ?? "",
    providerId: override?.providerId,
    useCustomProvider: override?.useCustomProvider ?? false,
    boundProviderName:
      bound && override.providerId ? providerNames?.get(override.providerId) : undefined,
    boundProviderKind: profile?.kind,
    boundProviderApiStyle: profile?.apiStyle,
    boundHasKey: bound ? Boolean(profile?.apiKey?.trim()) : undefined,
    supportedApiStyles: supportedStylesForTool(preset.id),
    capabilities: capabilitiesFor(preset.id),
    homeSynced: homeSyncedFor(preset.id)
  }
}

async function loadBoundProfile(providerId?: string) {
  if (!providerId) return undefined
  try {
    const vault = await readVault()
    return vault.profiles.find((item) => item.id === providerId)
  } catch {
    return undefined
  }
}

async function providerNames(): Promise<Map<string, string>> {
  try {
    const vault = await readVault()
    return new Map(vault.profiles.map((profile) => [profile.id, profile.name]))
  } catch {
    return new Map()
  }
}

function availableFlag(preset: AgentToolPreset): boolean {
  if ((M4_PROMOTION_ORDER as readonly string[]).includes(preset.id)) return canPromoteComingSoon(preset.id)
  return preset.available
}

function comingSoonFlag(preset: AgentToolPreset): boolean {
  if ((M4_PROMOTION_ORDER as readonly string[]).includes(preset.id)) return !canPromoteComingSoon(preset.id)
  return preset.comingSoon
}

async function doctorCustom(id: AgentToolId): Promise<AgentToolDoctorResult> {
  const record = getCustomAgent(id)
  if (!record) return { id, ok: false, message: "Unknown custom agent.", version: null, path: null }
  const probe = await probeBinaries([record.command], [])
  if (!probe.found) {
    return { id, ok: false, message: "Custom ACP command not found.", version: null, path: null }
  }
  return { id, ok: true, message: probe.version ?? "Found.", version: probe.version, path: probe.path }
}
