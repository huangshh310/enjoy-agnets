/**
 * 玻璃棱镜描边要硬件合成。软件渲染 / --disable-gpu 时 mask-composite 会画成同心环。
 */

export type GpuCompositingFlag = "on" | "off"

export const GPU_COMPOSITING_ARG = "--enjoy-gpu-compositing"

export type GpuFeatureStatusLike = {
  gpu_compositing?: string
  webgl?: string
}

export function gpuCompositingArg(flag: GpuCompositingFlag): string {
  return `${GPU_COMPOSITING_ARG}=${flag}`
}

export function parseGpuCompositingArg(
  argv: readonly string[],
  env: Record<string, string | undefined> = {}
): GpuCompositingFlag {
  const fromArg = argv.find((item) => item.startsWith(`${GPU_COMPOSITING_ARG}=`))
  if (fromArg?.endsWith("=off")) return "off"
  if (fromArg?.endsWith("=on")) return "on"
  if (env.ENJOY_GPU_COMPOSITING === "off") return "off"
  if (env.ENJOY_GPU_COMPOSITING === "on") return "on"
  return "on"
}

export function hardwareAccelerationForcedOff(input: {
  disableHardwareAcceleration?: boolean
  hasSwitch?: (name: string) => boolean
}): boolean {
  if (input.disableHardwareAcceleration) return true
  const hasSwitch = input.hasSwitch
  if (!hasSwitch) return false
  return hasSwitch("disable-gpu") || hasSwitch("disable-gpu-compositing")
}

/** enabled / enabled_on 才算硬件合成；disabled* / software / unavailable 一律 off。 */
export function gpuFeatureIsHardware(value: string | undefined): boolean {
  if (!value) return false
  const normalized = value.toLowerCase()
  if (normalized.includes("disabled") || normalized.includes("software")) return false
  if (normalized.includes("unavailable")) return false
  return normalized === "enabled" || normalized.startsWith("enabled")
}

export function gpuCompositingFromStatus(
  status: GpuFeatureStatusLike | null | undefined,
  opts?: { hardwareAccelerationDisabled?: boolean }
): GpuCompositingFlag {
  if (opts?.hardwareAccelerationDisabled) return "off"
  if (!status) return "off"
  if (!gpuFeatureIsHardware(status.gpu_compositing)) return "off"
  if (!gpuFeatureIsHardware(status.webgl)) return "off"
  return "on"
}
