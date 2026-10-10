/**
 * 精选 MCP 身份：只认安装源写下的 preset id + 官方 command/url 指纹。
 * 显示名 github / filesystem 不能冒充精选。指纹表与 renderer 共用 ipc-contract 叶子。
 */
import {
  CURATED_MCP_FINGERPRINTS,
  curatedFingerprintById,
  type CuratedMcpFingerprint
} from "@enjoy-agents/ipc-contract/mcp-curated"

export { CURATED_MCP_FINGERPRINTS, type CuratedMcpFingerprint }

export type CuratedMcpRow = {
  curatedPresetId?: string | null
  name?: string | null
  transport?: string | null
  command?: string | null
  url?: string | null
}

export function isKnownCuratedPresetId(id: string | undefined | null): boolean {
  return Boolean(id && curatedFingerprintById(id))
}

export function matchesCuratedFingerprint(presetId: string, input: CuratedMcpRow): boolean {
  const preset = curatedFingerprintById(presetId)
  if (!preset) return false
  if ((input.transport ?? "stdio") !== preset.transport) return false
  if (preset.command && normalizeText(input.command) !== normalizeText(preset.command)) return false
  if (preset.url && normalizeText(input.url) !== normalizeText(preset.url)) return false
  if (!preset.url && normalizeText(input.url)) return false
  return true
}

/** 库行是否仍是精选：必须有 marker，且 command/url 还对得上指纹。 */
export function isCuratedMcpIdentity(row: CuratedMcpRow): boolean {
  const id = row.curatedPresetId?.trim()
  if (!id) return false
  return matchesCuratedFingerprint(id, row)
}

/**
 * 只有精选安装可写下 marker。改名 / 改 command/url / 导入都不保留。
 */
export function resolveCuratedPresetId(input: CuratedMcpRow & { existingPresetId?: string | null }): string | null {
  const requested = input.curatedPresetId?.trim()
  if (requested && isKnownCuratedPresetId(requested) && matchesNameAndFingerprint(requested, input)) {
    return requested
  }
  const existing = input.existingPresetId?.trim()
  if (existing && matchesNameAndFingerprint(existing, input)) return existing
  return null
}

function matchesNameAndFingerprint(presetId: string, input: CuratedMcpRow): boolean {
  return matchesCuratedFingerprint(presetId, input) && normalizeText(input.name) === normalizeText(presetId)
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase()
}
