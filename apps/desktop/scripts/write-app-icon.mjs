/**
 * 从 enjoy-ui-kit PNG 打成 Windows ICO、macOS ICNS，并同步到 resources/ 与 build/。
 * 用法：node apps/desktop/scripts/write-app-icon.mjs
 * ICNS 依赖本机 iconutil，只在 darwin 上生成。
 */
import { execFile } from "node:child_process"
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { promisify } from "node:util"
import { fileURLToPath } from "node:url"

const execFileAsync = promisify(execFile)
const desktopRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const kitPng = resolve(desktopRoot, "public/enjoy-ui-kit/png")
const FRAME_SIZES = [16, 32, 64, 128, 256]

/** ICONDIR：6 字节；每帧 ICONDIRENTRY：16 字节。 */
const ICONDIR_BYTES = 6
const ICONDIRENTRY_BYTES = 16
/** ICO type = 1 表示图标（2 是光标）。 */
const ICO_TYPE_ICON = 1
/** 宽/高字节写 0 表示 256px。 */
const ICO_DIM_256 = 0

/** iconutil 要求的 iconset 文件名 → kit PNG。含 1x/2x 到 1024，避免 Dock 放大发糊。 */
const ICONSET_FRAMES = [
  ["icon_16x16.png", "icon-16.png"],
  ["icon_16x16@2x.png", "icon-32.png"],
  ["icon_32x32.png", "icon-32.png"],
  ["icon_32x32@2x.png", "icon-64.png"],
  ["icon_128x128.png", "icon-128.png"],
  ["icon_128x128@2x.png", "icon-256.png"],
  ["icon_256x256.png", "icon-256.png"],
  ["icon_256x256@2x.png", "icon-512.png"],
  ["icon_512x512.png", "icon-512.png"],
  ["icon_512x512@2x.png", "icon-1024.png"]
]

/**
 * 把多张 PNG 打成一张 ICO。Vista+ 允许帧数据直接是 PNG，不必转 BMP。
 * @param {Array<{ size: number, data: Buffer }>} images
 */
function packPngIco(images) {
  const headerSize = ICONDIR_BYTES + images.length * ICONDIRENTRY_BYTES
  const header = Buffer.alloc(headerSize)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(ICO_TYPE_ICON, 2)
  header.writeUInt16LE(images.length, 4)

  let payloadOffset = headerSize
  images.forEach((image, index) => {
    const entry = ICONDIR_BYTES + index * ICONDIRENTRY_BYTES
    const dim = image.size === 256 ? ICO_DIM_256 : image.size
    header.writeUInt8(dim, entry)
    header.writeUInt8(dim, entry + 1)
    header.writeUInt16LE(1, entry + 4)
    header.writeUInt16LE(32, entry + 6)
    header.writeUInt32LE(image.data.length, entry + 8)
    header.writeUInt32LE(payloadOffset, entry + 12)
    payloadOffset += image.data.length
  })

  return Buffer.concat([header, ...images.map((image) => image.data)])
}

/** 运行时 PNG 用 512：macOS Dock.setIcon 与 Linux 窗标都吃这张。 */
async function writePngAndIco() {
  const images = []
  for (const size of FRAME_SIZES) {
    images.push({ size, data: await readFile(resolve(kitPng, `icon-${size}.png`)) })
  }

  const ico = packPngIco(images)
  for (const dirName of ["resources", "build"]) {
    const dir = resolve(desktopRoot, dirName)
    await mkdir(dir, { recursive: true })
    await writeFile(resolve(dir, "icon.ico"), ico)
    await copyFile(resolve(kitPng, "icon-512.png"), resolve(dir, "icon.png"))
  }
  console.log(`wrote icon.ico (${ico.length} bytes) and icon.png (512) to resources/ and build/`)
}

/** 用系统 iconutil 打 ICNS；非 darwin 只提示，不阻断 Windows 派生。 */
async function writeIcns() {
  if (process.platform !== "darwin") {
    console.log("skip icon.icns (iconutil is macOS-only)")
    return
  }

  const iconset = resolve(desktopRoot, "build/icon.iconset")
  const icns = resolve(desktopRoot, "build/icon.icns")
  await rm(iconset, { recursive: true, force: true })
  await mkdir(iconset, { recursive: true })
  for (const [name, src] of ICONSET_FRAMES) {
    await copyFile(resolve(kitPng, src), resolve(iconset, name))
  }
  await execFileAsync("iconutil", ["-c", "icns", iconset, "-o", icns])
  await rm(iconset, { recursive: true, force: true })
  console.log(`wrote ${icns}`)
}

await writePngAndIco()
await writeIcns()
