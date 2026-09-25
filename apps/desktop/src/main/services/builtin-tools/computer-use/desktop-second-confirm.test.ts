import assert from "node:assert/strict"
import { beforeEach, test } from "node:test"
import {
  attachDesktopApprovalThumbs,
  clearSecondConfirmMemory,
  forgetSecondConfirm,
  mergeSecondConfirmApprovalArgs,
  refuseSecondConfirmAct,
  rememberSecondConfirm,
  secondConfirmFor,
  secondConfirmThumbsReady
} from "./desktop-second-confirm.ts"

beforeEach(() => {
  clearSecondConfirmMemory()
})

test("二次确认 args 暴露新旧缩略图 data URL", async () => {
  rememberSecondConfirm({
    observationId: "obs_new",
    previousObservationId: "obs_old",
    previousThumbnailPath: "/thumbs/at-allow.png",
    previousAppName: "计算器"
  })
  const merged = mergeSecondConfirmApprovalArgs({
    observationId: "obs_new",
    action: "click",
    thumbnailPath: "/thumbs/after-resnap.png"
  })
  assert.equal(merged.needsSecondConfirm, true)
  assert.equal(merged.previousThumbnailPath, "/thumbs/at-allow.png")
  assert.equal(merged.thumbnailPath, "/thumbs/after-resnap.png")
  const shown = await attachDesktopApprovalThumbs(merged, async (filePath) =>
    filePath === "/thumbs/at-allow.png"
      ? "data:image/png;base64,OLD"
      : filePath === "/thumbs/after-resnap.png"
        ? "data:image/png;base64,NEW"
        : undefined
  )
  assert.equal(shown.previousThumbnailDataUrl, "data:image/png;base64,OLD")
  assert.equal(shown.thumbnailDataUrl, "data:image/png;base64,NEW")
  assert.equal(secondConfirmThumbsReady(shown), true)
})

test("普通 allow 仍是单缩略图路径，不造 previous", async () => {
  const merged = mergeSecondConfirmApprovalArgs({
    observationId: "obs_1",
    action: "click",
    thumbnailPath: "/thumbs/only.png"
  })
  assert.equal(merged.needsSecondConfirm, undefined)
  assert.equal(merged.previousThumbnailPath, undefined)
  const shown = await attachDesktopApprovalThumbs(merged, async (filePath) =>
    filePath === "/thumbs/only.png" ? "data:image/png;base64,ONE" : undefined
  )
  assert.equal(shown.thumbnailDataUrl, "data:image/png;base64,ONE")
  assert.equal(shown.previousThumbnailDataUrl, undefined)
})

test("缺一张缩略图不假装有图，主允许应禁用", async () => {
  const shown = await attachDesktopApprovalThumbs(
    {
      needsSecondConfirm: true,
      previousThumbnailPath: "/thumbs/at-allow.png",
      thumbnailPath: "/thumbs/missing.png"
    },
    async (filePath) => (filePath === "/thumbs/at-allow.png" ? "data:image/png;base64,OLD" : undefined)
  )
  assert.equal(shown.previousThumbnailDataUrl, "data:image/png;base64,OLD")
  assert.equal(shown.thumbnailDataUrl, undefined)
  assert.equal(secondConfirmThumbsReady(shown), false)
})

test("args 已带 previousThumbnailPath 时不必再查账本", () => {
  const merged = mergeSecondConfirmApprovalArgs({
    observationId: "obs_x",
    previousThumbnailPath: "/thumbs/left.png",
    thumbnailPath: "/thumbs/right.png"
  })
  assert.equal(merged.needsSecondConfirm, true)
  assert.equal(secondConfirmFor("obs_x"), undefined)
})

test("deny 丢弃观察时清掉二次确认记忆", () => {
  rememberSecondConfirm({ observationId: "obs_new", previousThumbnailPath: "/thumbs/old.png" })
  forgetSecondConfirm("obs_new")
  assert.equal(secondConfirmFor("obs_new"), undefined)
  assert.equal(mergeSecondConfirmApprovalArgs({ observationId: "obs_new" }).needsSecondConfirm, undefined)
})

test("确认后禁止再点旧观察；缺图诚实失败", () => {
  rememberSecondConfirm({
    observationId: "obs_new",
    previousObservationId: "obs_old",
    previousThumbnailPath: "/thumbs/at-allow.png"
  })
  const onOld = refuseSecondConfirmAct({ observationId: "obs_old" }, "/thumbs/after-resnap.png")
  assert.equal(onOld?.code, "needs_second_confirm")
  const missing = refuseSecondConfirmAct({ observationId: "obs_new" })
  assert.equal(missing?.code, "screenshot_unavailable")
  const ready = refuseSecondConfirmAct({ observationId: "obs_new" }, "/thumbs/after-resnap.png")
  assert.equal(ready, null)
})
