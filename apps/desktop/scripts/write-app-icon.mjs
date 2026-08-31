/**
 * 从 enjoy-ui-kit PNG 打成 Windows ICO（内嵌 PNG 帧），并同步到 resources/ 与 build/。
 * 用法：node apps/desktop/scripts/write-app-icon.mjs
 */
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

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

const images = []
for (const size of FRAME_SIZES) {
  images.push({ size, data: await readFile(resolve(kitPng, `icon-${size}.png`)) })
}

const ico = packPngIco(images)
const targets = [
  { dir: "resources", png: "icon-256.png" },
  { dir: "build", png: "icon-512.png" }
]

for (const target of targets) {
  const dir = resolve(desktopRoot, target.dir)
  await mkdir(dir, { recursive: true })
  await writeFile(resolve(dir, "icon.ico"), ico)
  await copyFile(resolve(kitPng, target.png), resolve(dir, "icon.png"))
}

console.log(`wrote icon.ico (${ico.length} bytes) to resources/ and build/`)
