/**
 * Design Mode 截图：webview capturePage → 资产库，随下一轮附件发送。
 */
import { queueComposerAsset } from "@renderer/hooks/composer-assets"
import { getIde, hasIde } from "@renderer/lib/ide"

export async function importDesignScreenshot(
  view: Electron.WebviewTag,
  tag: string
): Promise<void> {
  if (!hasIde() || typeof view.capturePage !== "function") return
  const image = await view.capturePage()
  const png = new Uint8Array(image.toPNG())
  const name = `design-${tag || "element"}.png`
  const asset = (await getIde().assets.import({
    name,
    mediaType: "image/png",
    bytesBase64: bytesToBase64(png)
  })) as { id: string }
  const url = URL.createObjectURL(new Blob([png], { type: "image/png" }))
  queueComposerAsset({
    id: asset.id,
    name,
    mediaType: "image/png",
    size: png.byteLength,
    url
  })
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}
