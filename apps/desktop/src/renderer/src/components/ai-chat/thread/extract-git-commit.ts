/**
 * 从助手消息或工具调用中提取 Git 提交信息。
 */
import type { ThreadMessage } from "@renderer/stores/chat-store"
import type { GitCommitInfo } from "./git-commit-card"

export function extractGitCommitInfo(message: ThreadMessage): GitCommitInfo | null {
  // 1. 优先从工具调用解析
  if (message.tools && message.tools.length > 0) {
    const commitTool = message.tools.find(
      (t) => t.name === "git_commit" && t.state === "output-available"
    )
    if (commitTool) {
      const args = commitTool.args as { message?: string } | undefined
      const msg = args?.message || ""
      const res = String(commitTool.result ?? "")
      const hashMatch = res.match(/([a-f0-9]{7,40})/i)
      if (hashMatch) {
        return {
          hash: hashMatch[1],
          message: msg || "Git commit",
          branch: "main"
        }
      }
    }
  }

  // 2. 从消息文本解析（针对大语言模型直接总结的提交文案）
  const text = message.content
  if (!text) return null

  // 匹配类似:
  // 提交：4f885c3
  // 标题：Add session workflow...
  const commitMatch = text.match(/提交[：:]\s*`?([a-f0-9]{7,40})`?/i)
  if (!commitMatch) return null

  const hash = commitMatch[1]

  const titleMatch = text.match(/标题[：:]\s*([^\n\r]+)/i)
  const messageStr = titleMatch ? titleMatch[1].trim() : "Git commit"

  const branchMatch = text.match(/推送到\s*`?([a-zA-Z0-9_\-./]+)`?/i)
  const remote = branchMatch ? branchMatch[1].trim() : undefined

  return {
    hash,
    message: messageStr,
    branch: remote ? remote.split("/").pop() : "main",
    remote
  }
}
