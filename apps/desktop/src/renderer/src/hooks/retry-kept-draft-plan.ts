/**
 * 红卡 / 白卡「再发一次」怎么走（纯判定，便于测）。
 * luna（main c849e3f4 巡检 P1）：只图回滚后输入框没字只有图，也得走发送——判定用 composerCanSend（字或附件），
 * 不能只看 composer.trim()，否则掉进「重跑库里那句」分支，而那句已被回滚删掉，点了没反应。
 */
import { composerCanSend } from "./runtime-interact/composer-can-send.ts"

export type RetryKeptDraftPlan = "send" | "retry-turn" | "none"

export function retryKeptDraftPlan(input: {
  composer: string
  composerAssetCount: number
  lastUserContent: string | undefined
}): RetryKeptDraftPlan {
  if (composerCanSend({ text: input.composer, assetCount: input.composerAssetCount })) return "send"
  return input.lastUserContent ? "retry-turn" : "none"
}
