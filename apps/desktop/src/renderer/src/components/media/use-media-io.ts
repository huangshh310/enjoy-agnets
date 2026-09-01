/**
 * 导入 / 导出 / 上传 Provider / 删除。
 */
import { useState } from "react"
import type { AssetRecord } from "@enjoy-agents/ipc-contract"
import { exportLibraryAsset } from "@renderer/hooks/media-library"
import { fileToBase64 } from "@renderer/lib/file-bytes"
import { getIde } from "@renderer/lib/ide"
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
  const [exportPath, setExportPath] = useState("assets/export.bin")
  const [overwriteArmed, setOverwriteArmed] = useState(false)

  return {
    exportPath,
    setExportPath,
    overwriteArmed,
    importFiles: (files: File[]) => runImport(files, input),
    handleExport: (asset: AssetRecord) =>
      runExport(asset, input, exportPath, overwriteArmed, setOverwriteArmed),
    handleUpload: (assetId: string) => runUpload(assetId, input.setNote),
    confirmDelete: () => deleteLibraryAsset(input, setOverwriteArmed)
  }
}

async function runImport(files: File[], input: IoContext) {
  const note = await importLibraryFiles({
    files,
    encode: fileToBase64,
    importAsset: async (payload) => {
      await getIde().assets.import(payload)
    }
  })
  input.setNote(note)
  await input.refresh()
}

async function runExport(
  asset: AssetRecord,
  input: IoContext,
  exportPath: string,
  overwriteArmed: boolean,
  setOverwriteArmed: (armed: boolean) => void
) {
  const result = await exportLibraryAssetFlow({
    workspaceId: input.workspaceId,
    asset,
    relativePath: exportPath,
    overwriteArmed,
    exportAsset: exportLibraryAsset
  })
  setOverwriteArmed(result.overwriteArmed)
  input.setNote(result.note)
}

async function runUpload(assetId: string, setNote: (note: string | null) => void) {
  try {
    await getIde().assets.upload({ id: assetId, purpose: "file" })
    setNote("Uploaded as Provider file reference.")
  } catch (error: unknown) {
    setNote(error instanceof Error ? error.message : "Upload failed.")
  }
}

async function deleteLibraryAsset(
  input: IoContext,
  setOverwriteArmed: (armed: boolean) => void
) {
  const assetId = input.pendingDeleteId
  if (!assetId) return
  input.setPendingDeleteId(null)
  try {
    await getIde().assets.delete(assetId)
    await input.refresh()
    if (input.selectedAssetId === assetId) input.setSelectedAssetId(null)
    setOverwriteArmed(false)
    input.setNote("Asset deleted.")
  } catch (error: unknown) {
    input.setNote(error instanceof Error ? error.message : "Delete failed.")
  }
}
