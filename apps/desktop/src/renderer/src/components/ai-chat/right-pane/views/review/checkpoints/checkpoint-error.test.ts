import assert from "node:assert/strict"
import { test } from "node:test"
import { checkpointErrorMessage } from "./checkpoint-error.ts"

const t = (path: string) => path

test("检查点错误码翻成词表键", () => {
  assert.equal(
    checkpointErrorMessage("Error: CHECKPOINT_REF_INVALID", t),
    "chat.reviewCheckpointRefInvalid"
  )
  assert.equal(
    checkpointErrorMessage("CHECKPOINT_NOT_FOUND", t),
    "chat.reviewCheckpointNotFound"
  )
  assert.equal(
    checkpointErrorMessage("CHECKPOINT_CONFIRM_REQUIRED", t),
    "chat.reviewCheckpointConfirmRequired"
  )
  assert.equal(
    checkpointErrorMessage("CHECKPOINT_RESTORE_FAILED: index", t),
    "chat.reviewCheckpointRestoreFailed"
  )
  assert.equal(checkpointErrorMessage("disk full", t), "chat.reviewCheckpointRestoreFailed")
})
