import assert from "node:assert/strict"
import { test } from "node:test"
import { reviewBannerPeek } from "./review-banner-peek.ts"
import type { SessionReviewFile } from "./session-review.types.ts"

const file = (name: string): SessionReviewFile => ({
  path: name,
  name,
  dir: "",
  additions: 0,
  deletions: 0,
  kind: "file"
})

const t = (key: string, vars?: Record<string, string | number>) => {
  if (key === "chat.stackedFilesChangedNamed") return `${vars?.n} 个文件已改 · ${vars?.name}`
  if (key === "chat.stackedFilesChanged") return `${vars?.n} 个文件已改`
  if (key === "chat.sessionReviewStopped") return `中途停下，已改 ${vars?.n} 个文件，请验收`
  if (key === "chat.sessionReviewMaybeChanged") return "可能改了文件，请核对"
  if (key === "chat.sessionReviewFilesPlaceholder") {
    return "这一轮改了文件，请到「审查」里核对。"
  }
  if (key === "chat.sessionReviewCommandPlaceholder") {
    return "这一轮运行了命令，可能改了文件，请到「审查」里核对。"
  }
  if (key === "chat.sessionReviewUnknownPlaceholder") {
    return "这一轮可能改了文件，请到「审查」里核对。"
  }
  if (key === "chat.sessionReviewWroteThisTurn") return `本轮写过 ${vars?.n} 个文件 · ${vars?.name}`
  if (key === "chat.sessionReviewWroteThisTurnMany") return `本轮写过 ${vars?.n} 个文件`
  return key
}

test("有 path 点名文件，不走占位句", () => {
  assert.equal(reviewBannerPeek([file("e2e-stub.txt")], {}, t), "1 个文件已改 · e2e-stub.txt")
})

test("写盘后停/出错用中途停下", () => {
  assert.equal(
    reviewBannerPeek([file("e2e-stub.txt")], { stopped: true }, t),
    "中途停下，已改 1 个文件，请验收"
  )
})

test("没有确定已改的 path：中断走可能改了；写盘/命令走各自占位", () => {
  assert.equal(reviewBannerPeek([], { placeholder: true }, t), "可能改了文件，请核对")
  assert.equal(reviewBannerPeek([], { maybeChanged: true }, t), "可能改了文件，请核对")
  assert.equal(
    reviewBannerPeek([], { placeholder: true, placeholderKey: "chat.sessionReviewFilesPlaceholder" }, t),
    "这一轮改了文件，请到「审查」里核对。"
  )
  assert.equal(
    reviewBannerPeek([], { placeholder: true, placeholderKey: "chat.sessionReviewCommandPlaceholder" }, t),
    "这一轮运行了命令，可能改了文件，请到「审查」里核对。"
  )
  assert.equal(
    reviewBannerPeek([], { placeholder: true, placeholderKey: "chat.sessionReviewUnknownPlaceholder" }, t),
    "这一轮可能改了文件，请到「审查」里核对。"
  )
  assert.doesNotMatch(
    reviewBannerPeek([], { placeholder: true, placeholderKey: "chat.sessionReviewUnknownPlaceholder" }, t),
    /运行了命令/
  )
})

test("git 仓已提交/还原：回落本轮 path 加「本轮写过」", () => {
  assert.equal(
    reviewBannerPeek([file("e2e-stub.txt")], { wroteThisTurnOnly: true }, t),
    "本轮写过 1 个文件 · e2e-stub.txt"
  )
})
