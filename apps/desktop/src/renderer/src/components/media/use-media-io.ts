/**
 * 导入 / 导出 / 上传 Provider / 删除。
 */
import { useState } from "react"
import type { AssetRecord } from "@enjoy-agents/ipc-contract"
import { exportLibraryAsset } from "@renderer/hooks/media-library"
import { fileToBase64 } from "@renderer/lib/file-bytes"
import { getIde } from "@renderer/lib/ide"
import { useT } from "@renderer/i18n"
import type { TranslateFn } from "@renderer/i18n"
import { exportLibraryAssetFlow, importLibraryFiles } from "./library-actions"

type IoContext = {
  workspaceId: string | null
  selectedAssetId: string | null
  pendingDeleteId: string | null
  setSelectedAssetId: (id: string | null) => void
  setPendingDeleteId: (id: string | null) => void
  refresh: () => Promise<void>
  setNote: (note: string | null) => void
}

export function useMediaIo(input: IoContext) {
  const t = useT()
  const [exportPath, setExportPath] = useState("assets/export.bin")
  const [overwriteArmed, setOverwriteArmed] = useState(false)

  return {
    exportPath,
    setExportPath,
    overwriteArmed,
    importFiles: (files: File[]) => runImport(files, input, t),
    handleExport: (asset: AssetRecord) =>
      runExport(asset, input, exportPath, overwriteArmed, setOverwriteArmed, t),
    handleUpload: (assetId: string) => runUpload(assetId, input.setNote, t),
    confirmDelete: () => deleteLibraryAsset(input, setOverwriteArmed, t)
  }
}

async function runImport(files: File[], input: IoContext, t: TranslateFn) {
  const note = await importLibraryFiles({
    files,
    encode: fileToBase64,
    importAsset: async (payload) => {
      await getIde().assets.import(payload)
    },
    t
  })
  input.setNote(note)
  await input.refresh()
}

async function runExport(
  asset: AssetRecord,
  input: IoContext,
  exportPath: string,
  overwriteArmed: boolean,
  setOverwriteArmed: (armed: boolean) => void,
  t: TranslateFn
) {
  const result = await exportLibraryAssetFlow({
    workspaceId: input.workspaceId,
    asset,
    relativePath: exportPath,
    overwriteArmed,
    exportAsset: exportLibraryAsset,
    t
  })
  setOverwriteArmed(result.overwriteArmed)
  input.setNote(result.note)
}

async function runUpload(assetId: string, setNote: (note: string | null) => void, t: TranslateFn) {
  try {
    await getIde().assets.upload({ id: assetId, purpose: "file" })
    setNote(t("pages.media.uploadedProvider"))
  } catch (error: unknown) {
    setNote(error instanceof Error ? error.message : t("pages.media.uploadFailed"))
  }
}

async function deleteLibraryAsset(
  input: IoContext,
  setOverwriteArmed: (armed: boolean) => void,
  t: TranslateFn
) {
  const assetId = input.pendingDeleteId
  if (!assetId) return
  input.setPendingDeleteId(null)
  try {
    await getIde().assets.delete(assetId)
    await input.refresh()
    if (input.selectedAssetId === assetId) input.setSelectedAssetId(null)
    setOverwriteArmed(false)
    input.setNote(t("pages.media.assetDeleted"))
  } catch (error: unknown) {
    input.setNote(error instanceof Error ? error.message : t("pages.media.deleteFailed"))
  }
}
