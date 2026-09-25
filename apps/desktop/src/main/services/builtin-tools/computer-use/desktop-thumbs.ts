/**
 * 宿主截桌面缩略图：进 userData，最多 20 张，不把像素交给模型。
 */
import { app, desktopCapturer } from "electron"
import fs from "node:fs"
import path from "node:path"

const CAP = 20

export type DesktopView = {
  observationId: string
  appName: string
  appKey?: string
  elements: Array<{ id: string; role: string; name: string; clickable: boolean }>
  thumbnailPath?: string
}

let lastView: DesktopView | null = null

export function setLastDesktopView(view: DesktopView) {
  lastView = view
}

export function getLastDesktopView(): DesktopView | null {
  return lastView
}

export async function readThumbDataUrl(filePath?: string): Promise<string | undefined> {
  const target = filePath ?? lastView?.thumbnailPath
  if (!target || !target.startsWith(thumbDir())) return undefined
  if (!fs.existsSync(target)) return undefined
  const bytes = fs.readFileSync(target)
  return `data:image/png;base64,${bytes.toString("base64")}`
}

export async function captureDesktopThumb(): Promise<string | null> {
  try {
    const sources = await desktopCapturer.getSources({
      types: ["screen", "window"],
      thumbnailSize: { width: 320, height: 200 }
    })
    const shot = sources[0]?.thumbnail
    if (!shot) return null
    const dir = thumbDir()
    fs.mkdirSync(dir, { recursive: true })
    const file = path.join(dir, `thumb-${Date.now()}.png`)
    fs.writeFileSync(file, shot.toPNG())
    pruneThumbs(dir)
    return file
  } catch {
    return null
  }
}

function thumbDir() {
  return path.join(app.getPath("userData"), "computer-use-thumbs")
}

function pruneThumbs(dir: string) {
  const files = fs.readdirSync(dir).filter((name) => name.endsWith(".png")).sort()
  const extra = files.length - CAP
  if (extra <= 0) return
  for (const name of files.slice(0, extra)) fs.rmSync(path.join(dir, name), { force: true })
}
