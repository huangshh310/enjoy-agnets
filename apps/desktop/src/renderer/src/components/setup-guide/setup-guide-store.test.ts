/**
 * 去添加密钥时暂停向导，回来还停在连模型步。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { resumeSetupGuide, shouldFinishGuideOnDismiss, useSetupGuideStore } from "./setup-guide-store.ts"

test("pauseAt 不弹回介绍，resume 停在连模型", () => {
  useSetupGuideStore.setState({
    open: true,
    reason: "first-run",
    engaged: true,
    paused: false,
    resumeStep: null
  })
  useSetupGuideStore.getState().pauseAt("connect-model")
  assert.equal(useSetupGuideStore.getState().open, false)
  assert.equal(useSetupGuideStore.getState().paused, true)
  resumeSetupGuide()
  assert.equal(useSetupGuideStore.getState().open, true)
  assert.equal(useSetupGuideStore.getState().takeResumeStep(), "connect-model")
})

test("pause 期间 Dialog 关闭不得 finish", () => {
  useSetupGuideStore.setState({ paused: true })
  assert.equal(shouldFinishGuideOnDismiss(), false)
  useSetupGuideStore.setState({ paused: false })
  assert.equal(shouldFinishGuideOnDismiss(), true)
})
