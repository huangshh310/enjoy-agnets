import assert from "node:assert/strict"
import { test } from "node:test"
import {
  exportLibraryAssetFlow,
  importLibraryFiles,
  studioGenerationBlockReason
} from "./library-actions.ts"

function fakeFile(name: string, size: number): File {
  return { name, size, type: "image/png" } as File
}

test("导入跳过超限文件并汇总成功条数", async () => {
  const imported: string[] = []
  const note = await importLibraryFiles({
    files: [fakeFile("ok.png", 10), fakeFile("big.png", 9 * 1024 * 1024)],
    maxBytes: 1024,
    encode: async () => "YQ==",
    importAsset: async (payload) => {
      imported.push(payload.name)
    }
  })
  assert.deepEqual(imported, ["ok.png"])
  assert.match(note, /Imported 1 file/)
  assert.match(note, /big.png exceeds the 8 MB import limit/)
})

test("无会话时阻止生成", () => {
  assert.equal(
    studioGenerationBlockReason({
      kind: "image",
      sessionId: null,
      modelId: "grok",
      experimentalMedia: true,
      hasAudio: false
    }),
    "Open a chat session and pick a model before generating."
  )
})

test("experimentalMedia 关闭时阻止视频", () => {
  assert.equal(
    studioGenerationBlockReason({
      kind: "video",
      sessionId: "s1",
      modelId: "grok",
      experimentalMedia: false,
      hasAudio: false
    }),
    "Enable experimental media in Settings to generate video."
  )
})

test("导出覆盖风险时武装第二次点击", async () => {
  const result = await exportLibraryAssetFlow({
    workspaceId: "ws_1",
    asset: {
      id: "ast_1",
      hash: "h",
      name: "shot.png",
      mediaType: "image/png",
      kind: "image",
      size: 1,
      source: "import",
      createdAt: 1
    },
    relativePath: "assets/export.bin",
    overwriteArmed: false,
    exportAsset: async () => ({ overwriteRisk: true, exported: false, targetPath: "assets/export.bin" })
  })
  assert.equal(result.overwriteArmed, true)
  assert.match(result.note, /Overwrite risk/)
})
