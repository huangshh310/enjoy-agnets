import assert from "node:assert/strict"
import { test } from "node:test"
import {
  gpuCompositingArg,
  gpuCompositingFromStatus,
  gpuFeatureIsHardware,
  hardwareAccelerationForcedOff,
  parseGpuCompositingArg
} from "./gpu-compositing.ts"

test("硬件合成开启：gpu_compositing 与 webgl 都是 enabled", () => {
  assert.equal(
    gpuCompositingFromStatus({ gpu_compositing: "enabled", webgl: "enabled_on" }),
    "on"
  )
})

test("软件 / 关闭 / 不可用：一律 off", () => {
  assert.equal(gpuCompositingFromStatus({ gpu_compositing: "disabled", webgl: "enabled" }), "off")
  assert.equal(
    gpuCompositingFromStatus({ gpu_compositing: "disabled_software", webgl: "enabled" }),
    "off"
  )
  assert.equal(gpuCompositingFromStatus({ gpu_compositing: "software", webgl: "enabled" }), "off")
  assert.equal(gpuCompositingFromStatus({ gpu_compositing: "enabled", webgl: "unavailable" }), "off")
  assert.equal(gpuCompositingFromStatus({ gpu_compositing: "enabled", webgl: "disabled_off" }), "off")
  assert.equal(gpuCompositingFromStatus(null), "off")
  assert.equal(gpuCompositingFromStatus({}), "off")
})

test("命令行或 disableHardwareAcceleration 直接 off", () => {
  assert.equal(
    gpuCompositingFromStatus({ gpu_compositing: "enabled", webgl: "enabled" }, {
      hardwareAccelerationDisabled: true
    }),
    "off"
  )
  assert.equal(
    hardwareAccelerationForcedOff({
      hasSwitch: (name) => name === "disable-gpu"
    }),
    true
  )
  assert.equal(
    hardwareAccelerationForcedOff({
      hasSwitch: (name) => name === "disable-gpu-compositing"
    }),
    true
  )
  assert.equal(hardwareAccelerationForcedOff({ hasSwitch: () => false }), false)
  assert.equal(hardwareAccelerationForcedOff({ disableHardwareAcceleration: true }), true)
})

test("软件渲染旗标或 gpuInfo 里的 SwiftShader 直接 off", () => {
  assert.equal(
    gpuCompositingFromStatus({ gpu_compositing: "enabled", webgl: "enabled" }, {
      softwareRenderer: true
    }),
    "off"
  )
})

test("argv / env 解析给 preload", () => {
  assert.equal(parseGpuCompositingArg([gpuCompositingArg("off")]), "off")
  assert.equal(parseGpuCompositingArg([gpuCompositingArg("on")]), "on")
  assert.equal(parseGpuCompositingArg([], { ENJOY_GPU_COMPOSITING: "off" }), "off")
  assert.equal(parseGpuCompositingArg([]), "off")
  assert.equal(gpuFeatureIsHardware("enabled"), true)
  assert.equal(gpuFeatureIsHardware("enabled_on"), true)
  assert.equal(gpuFeatureIsHardware("disabled_software"), false)
})
