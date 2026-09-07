/**
 * 排队后续任务的数据合同。prompt 是规范名，text 是同值别名。
 */
import type { QuotedContext } from "@enjoy-agents/ipc-contract"
import type { QueuedComposerAsset } from "../composer-assets"

export type FollowupStatus = "pending" | "elevated_to_steer"

export type FollowupItem = {
  id: string
  sessionId: string
  /** 发给下一轮 agent.run 的完整 Prompt（含引用块）。 */
  prompt: string
  /** 与 prompt 同值，兼容旧调用。 */
  text: string
  /** 回填输入框用的原文，不含引用块。 */
  draft?: string
  quotedContexts?: QuotedContext[]
  assets: QueuedComposerAsset[]
  createdAt: number
  status: FollowupStatus
}

export type EnqueueFollowupInput = Omit<FollowupItem, "id" | "createdAt" | "status" | "prompt" | "text"> & {
  prompt?: string
  text?: string
  status?: FollowupStatus
}

export type RuntimeHintCode = "queued" | "steered" | "chipQueued" | null
