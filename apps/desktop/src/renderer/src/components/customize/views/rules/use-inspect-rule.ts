/**
 * 查看规则正文、定位文件、删除。
 */
import { useState } from "react"
import type { ProjectRuleItem } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"

export function useInspectRule(refresh: () => Promise<unknown>) {
  const [inspectRule, setInspectRule] = useState<ProjectRuleItem | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  function reveal(filePath: string) {
    if (hasIde()) void getIde().rules.reveal(filePath)
  }

  async function remove(rule: ProjectRuleItem) {
    if (!hasIde()) return
    await getIde().rules.delete(rule.filePath)
    await refresh()
    if (inspectRule?.id === rule.id) setInspectRule(null)
  }

  function copyText(id: string, text: string) {
    void navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return { inspectRule, setInspectRule, copiedId, reveal, remove, copyText }
}
