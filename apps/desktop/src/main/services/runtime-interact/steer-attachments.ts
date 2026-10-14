/**
 * jojo #155：带图的纠偏句——把资产编进这条 user 消息（与开跑同一套 appendRunAttachments），
 * 落库用的附件元数据一并返回（落库事务里顺手清掉这些图的草稿附件）。
 */
import type { ModelMessage, UserContent } from "ai"
import type { AttachedAssetMeta } from "../attach-run-files.ts"

export type AppendAttachments = (messages: ModelMessage[], assetIds: string[]) => Promise<AttachedAssetMeta[]>

export async function encodeSteerTurn(
  text: string,
  assetIds: readonly string[] | undefined,
  append: AppendAttachments
): Promise<{ content?: UserContent; attached: AttachedAssetMeta[] }> {
  if (!assetIds?.length) return { attached: [] }
  const messages: ModelMessage[] = [{ role: "user", content: text }]
  const attached = await append(messages, [...assetIds])
  const last = messages[0]
  const content = last && last.role === "user" && typeof last.content !== "string" ? last.content : undefined
  return { content, attached }
}
