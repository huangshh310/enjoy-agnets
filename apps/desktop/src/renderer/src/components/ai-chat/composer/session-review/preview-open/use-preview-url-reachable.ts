/**
 * 检测本地服务 URL 是否处于实际运行/可访问状态。
 * 避免因历史会话中偶然提到端口而在未启动服务时误画假绿灯和预览入口。
 */
import { useEffect, useState } from "react"

export async function probeUrlReachable(url: string, timeoutMs = 800): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    await fetch(url, {
      method: "HEAD",
      mode: "no-cors",
      cache: "no-store",
      signal: controller.signal
    })
    clearTimeout(timer)
    return true
  } catch {
    return false
  }
}

export function usePreviewUrlReachable(url?: string | null): boolean {
  const [reachable, setReachable] = useState(false)

  useEffect(() => {
    if (!url) {
      setReachable(false)
      return
    }

    let canceled = false

    async function check() {
      const ok = await probeUrlReachable(url as string)
      if (!canceled) {
        setReachable(ok)
      }
    }

    void check()
    // 每 5 秒轻量探测一次，以便用户在终端中启动 dev server 后自动点亮入口
    const interval = setInterval(check, 5000)

    return () => {
      canceled = true
      clearInterval(interval)
    }
  }, [url])

  return reachable
}
