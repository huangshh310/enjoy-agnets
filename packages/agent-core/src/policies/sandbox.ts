/**
 * 本地 Sandbox：限制网络、危险包装器和超长命令。cwd 由调用方锁定。
 */
const NETWORK_BINS = /\b(curl|wget|nc|ncat|ssh|scp|ftp|invoke-webrequest)\b/i

export type SandboxPolicy = {
  allowNetwork: boolean
  maxCommandChars?: number
}

export function assertSandboxCommand(command: string, policy: SandboxPolicy): void {
  const text = command.trim()
  if (!text) throw new Error("Sandbox command is empty.")
  const max = policy.maxCommandChars ?? 4_000
  if (text.length > max) throw new Error("Sandbox command exceeds size limit.")
  if (!policy.allowNetwork && NETWORK_BINS.test(text)) {
    throw new Error("Sandbox network is disabled.")
  }
}
