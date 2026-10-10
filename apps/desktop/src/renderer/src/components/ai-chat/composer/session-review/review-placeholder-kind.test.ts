import assert from "node:assert/strict"
import { test } from "node:test"
import { reviewPlaceholderKey, reviewPlaceholderKind } from "./review-placeholder-kind.ts"

test("写盘完成走改了文件，不说运行了命令", () => {
  assert.equal(
    reviewPlaceholderKind([{ name: "write_file", state: "output-available" }]),
    "files"
  )
  assert.equal(reviewPlaceholderKey("files"), "chat.sessionReviewFilesPlaceholder")
})

test("命令完成走运行了命令", () => {
  assert.equal(reviewPlaceholderKind([{ name: "bash", state: "output-available" }]), "command")
  assert.equal(reviewPlaceholderKey("command"), "chat.sessionReviewCommandPlaceholder")
})

test("重启丢了 state：仍从落库工具名认种类，不回退命令句", () => {
  assert.equal(reviewPlaceholderKind([{ name: "write_file" }]), "files")
  assert.equal(reviewPlaceholderKind([{ name: "edit_file" }]), "files")
  assert.equal(reviewPlaceholderKind([{ name: "bash" }]), "command")
})

test("中途中断走可能改了文件", () => {
  assert.equal(
    reviewPlaceholderKind([{ name: "write_file", state: "approval-requested" }]),
    "maybe"
  )
  assert.equal(
    reviewPlaceholderKind([{ name: "write_file", state: "output-error", errorText: "restart_abandoned" }]),
    "maybe"
  )
  assert.equal(
    reviewPlaceholderKind([
      {
        name: "write_file",
        state: "output-error",
        result: { code: "restart_abandoned", decision: "cancelled" }
      }
    ]),
    "maybe"
  )
  assert.equal(
    reviewPlaceholderKind([{ name: "write_file", state: "output-available" }], true),
    "maybe"
  )
  assert.equal(reviewPlaceholderKey("maybe"), "chat.sessionReviewMaybeChanged")
})

test("真认不出种类：未知回退，绝不说运行了命令", () => {
  assert.equal(reviewPlaceholderKind([]), "unknown")
  assert.equal(reviewPlaceholderKind([{ name: "tool" }]), "unknown")
  assert.equal(reviewPlaceholderKind([{ name: "mcp_unknown__do" }]), "unknown")
  assert.equal(reviewPlaceholderKey("unknown"), "chat.sessionReviewUnknownPlaceholder")
  assert.notEqual(reviewPlaceholderKey("unknown"), "chat.sessionReviewCommandPlaceholder")
})
