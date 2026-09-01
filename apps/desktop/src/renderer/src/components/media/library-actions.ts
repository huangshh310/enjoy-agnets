/**
 * 资产库导入 / 导出 / 生成的纯流程，供 hook 调用，也方便 node 测试。
 */
import { resolveMediaType } from "@enjoy-agents/assets/media-type"
import type { AssetRecord } from "@enjoy-agents/ipc-contract"
import type { StudioGenerateKind } from "./media-page.types"

const IMPORT_MAX_BYTES = 8 * 1024 * 1024

export async function importLibraryFiles(input: {
  files: File[]
  maxBytes?: number
  encode: (file: File) => Promise<string>
  importAsset: (payload: { name: string; mediaType: string; bytesBase64: string }) => Promise<void>
}): Promise<string> {
  const files = input.files.filter(Boolean)
  if (files.length === 0) return "Import failed."
  const maxBytes = input.maxBytes ?? IMPORT_MAX_BYTES
  const encode = input.encode
  let imported = 0
  let lastError: string | undefined
  for (const file of files) {
    const error = await importOneLibraryFile(file, maxBytes, encode, input.importAsset)
    if (error) lastError = error
    else imported += 1
  }
  return importSummary(files, imported, lastError)
}

async function importOneLibraryFile(
  file: File,
  maxBytes: number,
  encode: (file: File) => Promise<string>,
  importAsset: (payload: { name: string; mediaType: string; bytesBase64: string }) => Promise<void>
): Promise<string | undefined> {
  if (file.size > maxBytes) return `${file.name} exceeds the 8 MB import limit.`
  try {
    await importAsset({
      name: file.name,
      mediaType: resolveMediaType(file.name, file.type),
      bytesBase64: await encode(file)
    })
    return undefined
  } catch (error: unknown) {
    return error instanceof Error ? error.message : `Failed to import ${file.name}.`
  }
}

function importSummary(files: File[], imported: number, lastError: string | undefined): string {
  if (imported === 0) return lastError ?? "Import failed."
  if (lastError) return `Imported ${imported} file(s). ${lastError}`
  if (imported === 1 && files[0]) return `Imported ${files[0].name} successfully.`
  return `Imported ${imported} files successfully.`
}

export function studioGenerationBlockReason(input: {
  kind: StudioGenerateKind
  sessionId: string | null
  modelId: string | null
  experimentalMedia: boolean
  hasAudio: boolean
}): string | null {
  if (!input.sessionId || !input.modelId) {
    return "Open a chat session and pick a model before generating."
  }
  if (input.kind === "video" && !input.experimentalMedia) {
    return "Enable experimental media in Settings to generate video."
  }
  if ((input.kind === "transcription" || input.kind === "translation") && !input.hasAudio) {
    return "Select an audio asset before transcribing or translating."
  }
  return null
}

export async function exportLibraryAssetFlow(input: {
  workspaceId: string | null
  asset: AssetRecord
  relativePath: string
  overwriteArmed: boolean
  exportAsset: (payload: {
    id: string
    workspaceId: string
    relativePath: string
    overwrite: boolean
  }) => Promise<{ exported?: boolean; overwriteRisk?: boolean; targetPath?: string }>
}): Promise<{ note: string; overwriteArmed: boolean }> {
  if (!input.workspaceId) {
    return { note: "Open a workspace before exporting.", overwriteArmed: false }
  }
  try {
    const result = await input.exportAsset({
      id: input.asset.id,
      workspaceId: input.workspaceId,
      relativePath: input.relativePath,
      overwrite: input.overwriteArmed
    })
    if (result.overwriteRisk && !result.exported) {
      return {
        note: `Overwrite risk at ${result.targetPath}. Click Export again to confirm overwrite.`,
        overwriteArmed: true
      }
    }
    return {
      note: result.exported ? `Exported to ${result.targetPath}` : "Export blocked.",
      overwriteArmed: false
    }
  } catch (error: unknown) {
    return {
      note: error instanceof Error ? error.message : "Export failed.",
      overwriteArmed: false
    }
  }
}
