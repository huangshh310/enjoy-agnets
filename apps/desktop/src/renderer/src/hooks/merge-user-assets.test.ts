import assert from "node:assert/strict"
import { test } from "node:test"
import { mergeUserAssets } from "./merge-user-assets.ts"

test("同会话重灌时保住内存里的用户附件", () => {
  const previous = [
    {
      role: "user",
      content: "这是什么图片",
      assets: [{ assetId: "ast_jpg", mediaType: "image/jpeg", name: "bg.jpg" }]
    }
  ]
  const next = [{ role: "user" as const, content: "这是什么图片" }]
  const merged = mergeUserAssets(next, previous)
  assert.equal(merged[0]?.assets?.[0]?.name, "bg.jpg")
})

test("DB 已有附件时不覆盖", () => {
  const previous = [
    {
      role: "user",
      content: "看图",
      assets: [{ assetId: "ast_old", mediaType: "image/png", name: "old.png" }]
    }
  ]
  const next = [
    {
      role: "user" as const,
      content: "看图",
      assets: [{ assetId: "ast_new", mediaType: "image/jpeg", name: "new.jpg" }]
    }
  ]
  const merged = mergeUserAssets(next, previous)
  assert.equal(merged[0]?.assets?.[0]?.name, "new.jpg")
})
