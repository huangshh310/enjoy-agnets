/**
 * 取稿 + 组发送 payload。leo #145 M1：看门狗已作废这一发时，必须在清稿 / 取附件**之前**退出。
 */
import { resolveMediaType } from "@enjoy-agents/assets/media-type"
import { takeComputerUseSlash } from "@enjoy-agents/ipc-contract"
import { listComposerAssets, takeComposerAssetDetails, type QueuedComposerAsset } from "../composer-assets"
import { composerCanSend } from "./composer-can-send"
import { clearComposerDraft, prefixHostModeForSend, takeComposerText } from "./composer-draft"
import type { ComposerSendSnapshot } from "./composer-send-snapshot"
import { sendAttemptCancelled, type SendAttempt } from "./send-watchdog"

type PreparedSend = { content: string; assets?: QueuedComposerAsset[]; executePlan?: boolean }

export type SendPayload = {
  content: string
  /** 输入框里真正打出去的那段原文。content 可能垫了引用 / 技能 / 宿主模式前缀，不能拿它对输入框。 */
  typed: string
  /** 失败还原用：原文、Chip 与附件。 */
  snapshot: ComposerSendSnapshot
  assetIds: string[]
  messageAssets: Array<{ assetId: string; mediaType: string; name: string; url?: string }>
  executePlan?: boolean
  /** 句首 /computer-use。只作用于这一发，不把总开关写成开。 */
  computerUseOnce?: boolean
}

export async function resolveSendPayload(
  prepared: PreparedSend | undefined,
  snapshot: ComposerSendSnapshot,
  attempt?: SendAttempt,
  /** 测试注入：取稿（含 /compact 等异步等待）。 */
  takeText: (source: string, attempt?: SendAttempt) => Promise<string> = takeComposerText
): Promise<SendPayload | null | "cancelled"> {
  const fromDraft = !prepared
  const typed = snapshot.text
  const raw = prepared?.content ?? (await takeText(snapshot.text, attempt))
  // leo M1：看门狗已还稿出提示 → 迟到的这一发作废，且必须在清稿 / 取附件**之前**退出，
  // 否则输入框和附件被清掉、什么也没发出去。
  if (sendAttemptCancelled(attempt)) return "cancelled"
  // 只贴图不打字：正文为空但有附件也照发（luna 巡检：此处只看正文，蓝按钮点了没反应）。
  const assetCount = prepared ? (prepared.assets?.length ?? 0) : listComposerAssets().length
  if (!composerCanSend({ text: raw, assetCount })) return null
  const slash = takeComputerUseSlash(raw)
  const body = slash.once ? slash.text || raw.trim() : raw.trim() ? raw : ""
  const content = prefixHostModeForSend(body)
  if (fromDraft) clearComposerDraft()
  const queuedAssets = prepared?.assets ?? takeComposerAssetDetails()
  return {
    content,
    typed,
    snapshot,
    assetIds: queuedAssets.map((item) => item.id),
    messageAssets: queuedAssets.map((item) => ({
      assetId: item.id,
      mediaType: resolveMediaType(item.name, item.mediaType),
      name: item.name,
      url: item.url
    })),
    executePlan: prepared?.executePlan,
    computerUseOnce: slash.once || undefined
  }
}
