import assert from "node:assert/strict"
import { test } from "node:test"
import { assetPlaybackUrl, parseAssetPlaybackId } from "./playback-url.ts"

test("往返解析合法资产 id，拒绝路径穿越", () => {
  const id = "ast_550e8400-e29b-41d4-a716-446655440000"
  const url = assetPlaybackUrl(id)
  assert.equal(parseAssetPlaybackId(url), id)
  assert.equal(parseAssetPlaybackId("enjoy-asset://local/../secrets"), null)
  assert.equal(parseAssetPlaybackId("https://evil.example/ast_1"), null)
  assert.equal(parseAssetPlaybackId(assetPlaybackUrl("run_550e8400-e29b-41d4-a716-446655440000")), null)
})
