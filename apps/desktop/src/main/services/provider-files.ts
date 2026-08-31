/**
 * uploadFile / uploadSkill：按 hash 复用 provider_file_refs，密钥不出 main。
 */
import { Buffer } from "node:buffer"
import { findProviderRef, getAsset, upsertProviderRef } from "@enjoy-agents/db"
import { hashBytes, modelFamilyOf } from "@enjoy-agents/assets"
import { createFilesApi, createSkillsApi, type ProviderConfig } from "@enjoy-agents/providers"
import { uploadFile, uploadSkill } from "ai"
import { getDatabase } from "./database"
import { createId } from "./ids"
import { readAssetBytes } from "./asset-service"
import { getActiveProfile, readSecret } from "./secrets"

export async function uploadAssetToProvider(input: { id: string; purpose: "file" | "skill" }) {
  const row = getAsset(getDatabase(), input.id)
  if (!row) throw new Error("Asset not found.")
  const config = await requireProviderConfig()
  const payload = await readAssetBytes(input.id)
  const bytes = Buffer.from(payload.bytesBase64, "base64")
  const fileHash = row.hash || hashBytes(bytes)
  const family = modelFamilyOf(config.modelId)
  const cached = findProviderRef(getDatabase(), {
    providerId: config.provider,
    modelFamily: family,
    fileHash
  })
  if (cached) return { ref: cached, cached: true, purpose: input.purpose }
  const ref = await sendUpload(input.purpose, config, bytes, row.name, row.mediaType)
  upsertProviderRef(getDatabase(), {
    id: createId("pref"),
    providerId: config.provider,
    modelFamily: family,
    fileHash,
    ref,
    scope: input.purpose
  })
  return { ref, cached: false, purpose: input.purpose }
}

async function sendUpload(
  purpose: "file" | "skill",
  config: ProviderConfig,
  bytes: Uint8Array,
  filename: string,
  mediaType: string
): Promise<string> {
  if (purpose === "skill") {
    const result = await uploadSkill({
      api: createSkillsApi(config) as never,
      files: [{ path: filename, data: bytes }],
      displayTitle: filename
    })
    return JSON.stringify(result.providerReference)
  }
  const result = await uploadFile({
    api: createFilesApi(config) as never,
    data: bytes,
    mediaType,
    filename
  })
  return JSON.stringify(result.providerReference)
}

async function requireProviderConfig(): Promise<ProviderConfig> {
  const secret = await readSecret()
  const active = await getActiveProfile()
  if (!secret && !active) throw new Error("No provider key configured.")
  return {
    provider: (active?.kind ?? secret?.provider ?? "custom") as ProviderConfig["provider"],
    apiKey: secret?.apiKey ?? active?.apiKey ?? "",
    modelId: active?.modelId ?? secret?.modelId ?? "gpt-4o",
    baseURL: active?.baseURL ?? secret?.baseURL
  }
}
