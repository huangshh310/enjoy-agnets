/**
 * Registry 安装/复制：失败走人话，禁止假进度条。
 */
import type { AgentToolId } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"

export async function runRegistryInstall(
  id: string,
  setBusy: (value: boolean) => void,
  setError: (value: string | null) => void,
  onInstalled: () => void
): Promise<void> {
  if (!hasIde()) return
  setBusy(true)
  setError(null)
  try {
    const result = (await getIde().agentTools.install({ id })) as { ok?: boolean; message?: string }
    if (!result?.ok) setError(result?.message || "Install failed.")
    else onInstalled()
  } catch (error) {
    setError(error instanceof Error ? error.message : String(error))
  } finally {
    setBusy(false)
  }
}

export function copyRegistryCommand(text: string, setCopied: (value: boolean) => void): void {
  void navigator.clipboard.writeText(text).then(() => {
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  })
}

export function asAgentToolId(id: string): AgentToolId {
  return id as AgentToolId
}
