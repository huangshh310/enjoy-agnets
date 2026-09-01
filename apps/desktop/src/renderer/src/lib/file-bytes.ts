/**
 * 把本地 File / 字节编成 IPC 用的 base64。禁止 String.fromCharCode(...buffer)，
 * 大数组 spread 会在远低于 8 MB 合约上限时 RangeError。
 */

export const ASSET_IMPORT_MAX_BYTES = 8 * 1024 * 1024

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

export async function fileToBase64(file: File): Promise<string> {
  return bytesToBase64(new Uint8Array(await file.arrayBuffer()))
}
