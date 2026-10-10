import assert from "node:assert/strict"
import { test } from "node:test"
import {
  MODELS_LIST_WAIT_MS,
  markModelsListFailed,
  markModelsListed,
  modelsListGate,
  resetModelsListed
} from "./models-listed.ts"

test("失败或超时不再永远 pending", () => {
  resetModelsListed()
  assert.equal(modelsListGate(0), "pending")
  assert.equal(modelsListGate(MODELS_LIST_WAIT_MS), "timeout")
  resetModelsListed()
  markModelsListFailed()
  assert.equal(modelsListGate(), "failed")
  markModelsListed()
  assert.equal(modelsListGate(), "listed")
})
