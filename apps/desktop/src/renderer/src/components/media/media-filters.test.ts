import assert from "node:assert/strict"
import { test } from "node:test"
import type { AssetRecord } from "@enjoy-agents/ipc-contract"
import { countLibraryAssets, filterLibraryAssets, isAudioLibraryAsset } from "./media-filters.ts"

function asset(partial: Partial<AssetRecord> & Pick<AssetRecord, "id" | "kind" | "mediaType" | "name">): AssetRecord {
  return {
    hash: partial.hash ?? partial.id,
    size: partial.size ?? 1,
    source: partial.source ?? "import",
    createdAt: partial.createdAt ?? 1,
    ...partial
  }
}

test("分类过滤把 pdf 算进 Documents，搜索不区分大小写", () => {
  const rows = [
    asset({ id: "1", kind: "image", mediaType: "image/png", name: "Hero.png" }),
    asset({ id: "2", kind: "pdf", mediaType: "application/pdf", name: "spec.pdf" }),
    asset({ id: "3", kind: "audio", mediaType: "audio/mpeg", name: "voice.mp3" })
  ]
  assert.equal(filterLibraryAssets(rows, "file", "").length, 1)
  assert.equal(filterLibraryAssets(rows, "all", "hero").length, 1)
  assert.equal(countLibraryAssets(rows).file, 1)
  assert.equal(isAudioLibraryAsset(rows[2]!), true)
  assert.equal(isAudioLibraryAsset(rows[0]!), false)
})
