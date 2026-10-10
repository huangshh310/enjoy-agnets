/**
 * 启动瞬间把主进程算好的合成能力写到 <html>，赶在玻璃皮肤首帧之前。
 * document-start 时 document 可能还没有，必须轮询，不能直接 return。
 */
import { parseGpuCompositingArg, type GpuCompositingFlag } from "../main/services/gpu-compositing"

export function readGpuCompositingFlag(
  argv: readonly string[] = process.argv,
  env: Record<string, string | undefined> = process.env
): GpuCompositingFlag {
  return parseGpuCompositingArg(argv, env)
}

export function applyGpuCompositingAttr(
  argv: readonly string[] = process.argv,
  env: Record<string, string | undefined> = process.env
): GpuCompositingFlag {
  const flag = readGpuCompositingFlag(argv, env)
  const write = () => {
    try {
      if (typeof document === "undefined" || !document.documentElement) return false
      document.documentElement.setAttribute("data-gpu-compositing", flag)
      return true
    } catch {
      return false
    }
  }
  if (write()) {
    document.addEventListener("DOMContentLoaded", write)
    return flag
  }
  const interval = setInterval(() => {
    if (write()) clearInterval(interval)
  }, 16)
  process.once("loaded", () => {
    write()
  })
  return flag
}
