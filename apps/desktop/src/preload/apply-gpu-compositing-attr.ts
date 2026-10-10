/**
 * 启动瞬间把主进程算好的合成能力写到 <html>，赶在玻璃皮肤首帧之前。
 */
import { parseGpuCompositingArg } from "../main/services/gpu-compositing"

export function applyGpuCompositingAttr(
  argv: readonly string[] = process.argv,
  env: Record<string, string | undefined> = process.env
): void {
  if (typeof document === "undefined") return
  const flag = parseGpuCompositingArg(argv, env)
  const write = () => document.documentElement.setAttribute("data-gpu-compositing", flag)
  write()
  document.addEventListener("DOMContentLoaded", write)
}
