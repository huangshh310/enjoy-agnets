/**
 * 档案代理：空 = 跟随进程环境；direct = 这次请求不走 HTTP(S)_PROXY；
 * 其它必须是 http(s) URL。SOCKS 没有现成依赖，直接拒绝，避免半套接线。
 * undici 不在依赖里时，URL 代理在建连时失败；direct 退回全局 fetch。
 */
import { createRequire } from "node:module"
export type ProxyMode =
  | { kind: "system" }
  | { kind: "direct" }
  | { kind: "url"; href: string }

const PROXY_ENV_KEYS = ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy"] as const

export function parseProxy(value?: string): ProxyMode {
  const raw = value?.trim() ?? ""
  if (!raw) return { kind: "system" }
  if (raw === "direct") return { kind: "direct" }
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error("Proxy must be an http or https URL.")
  }
  if (url.protocol === "socks5:" || url.protocol === "socks:" || url.protocol === "socks4:") {
    throw new Error("SOCKS proxies are not available. Use an http or https proxy.")
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Proxy must be an http or https URL.")
  }
  return { kind: "url", href: url.toString() }
}

/** 合并进子进程 env。system 不覆盖继承的代理变量。 */
export function proxyEnvOverlay(value?: string): Record<string, string> {
  const mode = parseProxy(value)
  if (mode.kind === "system") return {}
  if (mode.kind === "direct") {
    return Object.fromEntries(PROXY_ENV_KEYS.map((key) => [key, ""]))
  }
  return Object.fromEntries(PROXY_ENV_KEYS.map((key) => [key, mode.href]))
}

type UndiciModule = {
  ProxyAgent: new (uri: string) => object
  Agent: new () => object
  fetch: typeof fetch
}

const requireUndici = createRequire(import.meta.url)

function loadUndici(): UndiciModule | null {
  try {
    // 不静态 import undici：没装时 URL 代理失败，direct 退回全局 fetch。
    return requireUndici("undici") as UndiciModule
  } catch {
    return null
  }
}

/** 给本次上游请求用的 fetch。system 返回 undefined，调用方继续用全局 fetch。 */
export function fetchForProxy(value?: string): typeof fetch | undefined {
  const mode = parseProxy(value)
  if (mode.kind === "system") return undefined
  const undici = loadUndici()
  if (!undici) {
    if (mode.kind === "url") {
      throw new Error("HTTP proxy needs undici, which is not installed. SOCKS is not available.")
    }
    return undefined
  }
  if (mode.kind === "direct") {
    const dispatcher = new undici.Agent()
    return ((input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) =>
      undici.fetch(input, { ...init, dispatcher } as Parameters<typeof fetch>[1])) as typeof fetch
  }
  const dispatcher = new undici.ProxyAgent(mode.href)
  return ((input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) =>
    undici.fetch(input, { ...init, dispatcher } as Parameters<typeof fetch>[1])) as typeof fetch
}
