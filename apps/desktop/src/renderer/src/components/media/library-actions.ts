/**
 * 资产库导入 / 导出 / 生成的纯流程，供 hook 调用，也方便 node 测试。
 */
import { resolveMediaType } from "@enjoy-agents/assets/media-type"
import type { AssetRecord } from "@enjoy-agents/ipc-contract"
import { interpolate } from "../../i18n/lookup.ts"
import type { TranslateFn } from "../../i18n/use-i18n.ts"
import type { StudioGenerateKind } from "./media-page.types.ts"

const IMPORT_MAX_BYTES = 8 * 1024 * 1024

type NoticeT = TranslateFn | undefined

function notice(t: NoticeT, key: string, fallback: string, vars?: Record<string, string | number>): string {
  return t ? t(key, vars) : interpolate(fallback, vars)
}

export async function importLibraryFiles(input: {
  files: File[]
  maxBytes?: number
  encode: (file: File) => Promise<string>
  importAsset: (payload: { name: string; mediaType: string; bytesBase64: string }) => Promise<void>
  t?: TranslateFn
}): Promise<string> {
  const files = input.files.filter(Boolean)
  if (files.length === 0) return notice(input.t, "pages.media.importFailed", "Import failed.")
  const maxBytes = input.maxBytes ?? IMPORT_MAX_BYTES
  const encode = input.encode
  let imported = 0
  let lastError: string | undefined
  for (const file of files) {
    const error = await importOneLibraryFile(file, maxBytes, encode, input.importAsset, input.t)
    if (error) lastError = error
    else imported += 1
  }
  return importSummary(files, imported, lastError, input.t)
}

async function importOneLibraryFile(
  file: File,
  maxBytes: number,
  encode: (file: File) => Promise<string>,
  importAsset: (payload: { name: string; mediaType: string; bytesBase64: string }) => Promise<void>,
  t?: TranslateFn
): Promise<string | undefined> {
  if (file.size > maxBytes) {
    return notice(t, "pages.media.exceedsLimit", "{name} exceeds the 8 MB import limit.", { name: file.name })
  }
  try {
    await importAsset({
      name: file.name,
      mediaType: resolveMediaType(file.name, file.type),
      bytesBase64: await encode(file)
    })
    return undefined
  } catch (error: unknown) {
    return error instanceof Error
      ? error.message
      : notice(t, "pages.media.failedImport", "Failed to import {name}.", { name: file.name })
  }
}

function importSummary(
  files: File[],
  imported: number,
  lastError: string | undefined,
  t?: TranslateFn
): string {
  if (imported === 0) return lastError ?? notice(t, "pages.media.importFailed", "Import failed.")
  if (lastError) {
    return notice(t, "pages.media.importedPartial", "Imported {n} file(s). {lastError}", {
      n: imported,
      lastError
    })
  }
  if (imported === 1 && files[0]) {
    return notice(t, "pages.media.importedOne", "Imported {name} successfully.", { name: files[0].name })
  }
  return notice(t, "pages.media.importedMany", "Imported {n} files successfully.", { n: imported })
}

export function studioGenerationBlockReason(input: {
  kind: StudioGenerateKind
  sessionId: string | null
  modelId: string | null
  experimentalMedia: boolean
  hasAudio: boolean
  t?: TranslateFn
}): string | null {
  if (!input.sessionId || !input.modelId) {
    return notice(input.t, "pages.media.needSession", "Open a chat session and pick a model before generating.")
  }
  if (input.kind === "video" && !input.experimentalMedia) {
    return notice(
      input.t,
      "pages.media.enableExperimentalVideo",
      "Enable experimental media in Settings to generate video."
    )
  }
  if ((input.kind === "transcription" || input.kind === "translation") && !input.hasAudio) {
    return notice(
      input.t,
      "pages.media.needAudio",
      "Select an audio asset before transcribing or translating."
    )
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
  t?: TranslateFn
}): Promise<{ note: string; overwriteArmed: boolean }> {
  if (!input.workspaceId) {
    return {
      note: notice(input.t, "pages.media.needWorkspace", "Open a workspace before exporting."),
      overwriteArmed: false
    }
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
        note: notice(
          input.t,
          "pages.media.overwriteRisk",
          "Overwrite risk at {path}. Click Export again to confirm overwrite.",
          { path: result.targetPath ?? "" }
        ),
        overwriteArmed: true
      }
    }
    return {
      note: result.exported
        ? notice(input.t, "pages.media.exportedTo", "Exported to {path}", { path: result.targetPath ?? "" })
        : notice(input.t, "pages.media.exportBlocked", "Export blocked."),
      overwriteArmed: false
    }
  } catch (error: unknown) {
    return {
      note: error instanceof Error
        ? error.message
        : notice(input.t, "pages.media.exportFailed", "Export failed."),
      overwriteArmed: false
    }
  }
}
