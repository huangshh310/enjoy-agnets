/**
 * 遥测默认面文案键：local 不承诺零出站；otel 才说发到用户配置的地址。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { telemetryFaceKeys } from "./settings-telemetry-copy.ts"

test("telemetryFaceKeys: local / off 用默认记录句，不走 otel 句", () => {
  assert.deepEqual(telemetryFaceKeys("local"), {
    collect: "collectDesc",
    recordDesc: "recordLocalDesc"
  })
  assert.deepEqual(telemetryFaceKeys("off"), {
    collect: "collectDesc",
    recordDesc: "recordLocalDesc"
  })
})

test("telemetryFaceKeys: otel 说明会发到用户配置的地址", () => {
  assert.deepEqual(telemetryFaceKeys("otel"), {
    collect: "collectDescOtel",
    recordDesc: "recordLocalDescOtel"
  })
})
