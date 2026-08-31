/**
 * 资产导入体积上限。大文件走 IPC base64，超过后应改流式。
 */
export const MAX_ASSET_IMPORT_BYTES = 8 * 1024 * 1024
export const MAX_ASSET_IMPORT_BASE64 = 12_000_000

export function assertAssetImportSize(byteLength: number): void {
  if (byteLength > MAX_ASSET_IMPORT_BYTES) {
    throw new Error("Asset exceeds the 8 MB import limit.")
  }
}
