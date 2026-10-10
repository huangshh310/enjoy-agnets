import assert from "node:assert/strict"
import { test } from "node:test"
import { gpuInfoLooksSoftware, softwareRendererSwitchOn } from "./gpu-compositing-software.ts"

test("gpuInfo 命中 SwiftShader / LLVMpipe 算软件", () => {
  assert.equal(gpuInfoLooksSoftware({ auxAttributes: { glRenderer: "Google SwiftShader" } }), true)
  assert.equal(gpuInfoLooksSoftware({ gpuDevice: [{ driverVendor: "llvmpipe" }] }), true)
  assert.equal(gpuInfoLooksSoftware({ auxAttributes: { glRenderer: "ANGLE (NVIDIA)" } }), false)
  assert.equal(gpuInfoLooksSoftware(null), false)
})

test("use-gl / use-angle 软件实现只能关不能开", () => {
  assert.equal(
    softwareRendererSwitchOn({ switchValue: (name) => (name === "use-gl" ? "disabled" : "") }),
    true
  )
  assert.equal(
    softwareRendererSwitchOn({ switchValue: (name) => (name === "use-angle" ? "swiftshader" : "") }),
    true
  )
  assert.equal(softwareRendererSwitchOn({ switchValue: () => "" }), false)
})
