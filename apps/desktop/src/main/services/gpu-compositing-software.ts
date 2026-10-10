/**
 * SwiftShader / LLVMpipe / 命令行软件 GL 一律不算硬件合成。
 * getGPUFeatureStatus 在软件 GL 上仍可能报 enabled。
 */

const SOFTWARE_GL_RE =
  /swiftshader|llvmpipe|lavapipe|softpipe|osmesa|microsoft basic render|software gl|software rasterizer/

export function gpuInfoLooksSoftware(info: unknown): boolean {
  if (info == null) return false
  try {
    return SOFTWARE_GL_RE.test(JSON.stringify(info).toLowerCase())
  } catch {
    return false
  }
}

export function softwareRendererSwitchOn(input: {
  switchValue?: (name: string) => string
}): boolean {
  const value = input.switchValue
  if (!value) return false
  const gl = (value("use-gl") || "").toLowerCase()
  const angle = (value("use-angle") || "").toLowerCase()
  if (gl === "disabled" || gl === "swiftshader" || gl === "osmesa") return true
  return angle === "swiftshader" || angle === "swiftshader-webgl"
}
