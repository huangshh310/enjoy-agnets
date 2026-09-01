/**
 * enjoy-asset 协议：把 userData/assets/<id> 交给 renderer 的 <video>。
 * 必须先 registerAssetScheme（app ready 之前），再 handleAssetProtocol。
 */
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { app, net, protocol } from "electron"
import { ASSET_PLAYBACK_SCHEME, parseAssetPlaybackId } from "@enjoy-agents/assets"

export function registerAssetScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: ASSET_PLAYBACK_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        corsEnabled: true
      }
    }
  ])
}

export function handleAssetProtocol(): void {
  protocol.handle(ASSET_PLAYBACK_SCHEME, async (request) => {
    const id = parseAssetPlaybackId(request.url)
    if (!id) return new Response("Bad asset id", { status: 400 })
    const fileUrl = pathToFileURL(join(app.getPath("userData"), "assets", id)).href
    try {
      return await net.fetch(fileUrl)
    } catch {
      return new Response("Asset not found", { status: 404 })
    }
  })
}
