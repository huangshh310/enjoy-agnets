/**
 * 应用资产库：二进制落 userData/assets，SQLite 只存元数据。
 */
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { app, dialog, type BrowserWindow } from "electron"
import { assertInsideRoot, deleteAsset, getAsset, insertAsset, listAssets } from "@enjoy-agents/db"
import {
  assertAssetImportSize,
  hashBytes,
  kindFromMediaType,
  previewExport,
  resolveMediaType,
  resolvePickedExportPath
} from "@enjoy-agents/assets"
import { getDatabase } from "./database"
import { createId } from "./ids"
import { isE2eStub } from "./e2e-stub"
import { refuseSshLocalFilesystem } from "./ssh/refuse-local-cwd.ts"
import { getWorkspace } from "./workspace"

function assetsDir(): string {
  return join(app.getPath("userData"), "assets")
}

function filePathFor(id: string): string {
  return join(assetsDir(), id)
}

export async function importAsset(input: { name: string; mediaType: string; bytesBase64: string }) {
  const bytes = Buffer.from(input.bytesBase64, "base64")
  assertAssetImportSize(bytes.byteLength)
  const id = createId("ast")
  await mkdir(assetsDir(), { recursive: true })
  await writeFile(filePathFor(id), bytes)
  const mediaType = resolveMediaType(input.name, input.mediaType)
  return insertAsset(getDatabase(), {
    id,
    name: input.name,
    kind: kindFromMediaType(mediaType),
    mediaType,
    size: bytes.byteLength,
    hash: hashBytes(bytes),
    source: "import",
    createdAt: Date.now()
  })
}

export function listImportedAssets() {
  return listAssets(getDatabase())
}

export async function readAssetBytes(id: string) {
  const row = getAsset(getDatabase(), id)
  if (!row) throw new Error("Asset not found.")
  const bytes = await readFile(filePathFor(id))
  return { ...row, bytesBase64: bytes.toString("base64") }
}

export async function exportAsset(
  window: BrowserWindow,
  input: {
    id: string
    workspaceId: string
    relativePath: string
    overwrite: boolean
  }
) {
  const workspace = await getWorkspace(input.workspaceId)
  refuseSshLocalFilesystem(workspace, "asset export")
  const row = getAsset(getDatabase(), input.id)
  if (!row) throw new Error("Asset not found.")
  const defaultTarget = assertInsideRoot(workspace.rootPath, input.relativePath)
  const exists = await readFile(defaultTarget)
    .then(() => true)
    .catch(() => false)
  const preview = previewExport(workspace.rootPath, input.relativePath, exists)
  if (preview.overwriteRisk && !input.overwrite) {
    return { ...preview, exported: false }
  }
  const target = await confirmExportTarget(window, workspace.rootPath, defaultTarget)
  const bytes = await readFile(filePathFor(input.id))
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, bytes)
  return { ...preview, targetPath: target, exported: true }
}

/** 真正写盘前弹出系统保存框；E2E stub 跳过以免挂住无头窗口。 */
async function confirmExportTarget(window: BrowserWindow, rootPath: string, defaultPath: string) {
  if (isE2eStub()) return defaultPath
  const picked = await dialog.showSaveDialog(window, { defaultPath })
  if (picked.canceled || !picked.filePath) throw new Error("Export cancelled.")
  return resolvePickedExportPath(rootPath, picked.filePath)
}

export async function removeAsset(id: string) {
  deleteAsset(getDatabase(), id)
  await unlink(filePathFor(id)).catch(() => undefined)
  return { ok: true }
}

/** 生成结果入库，供聊天发出 asset.created。 */
export async function saveGeneratedAsset(input: {
  name: string
  mediaType: string
  bytes: Uint8Array
}) {
  const id = createId("ast")
  await mkdir(assetsDir(), { recursive: true })
  await writeFile(filePathFor(id), Buffer.from(input.bytes))
  return insertAsset(getDatabase(), {
    id,
    name: input.name,
    kind: kindFromMediaType(input.mediaType),
    mediaType: input.mediaType,
    size: input.bytes.byteLength,
    hash: hashBytes(input.bytes),
    source: "generated",
    createdAt: Date.now()
  })
}
