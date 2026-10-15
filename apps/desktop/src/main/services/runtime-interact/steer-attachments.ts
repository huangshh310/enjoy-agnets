/**
 * jojo #155：带图的纠偏句——把资产编进这条 user 消息（与开跑同一套 appendRunAttachments），
 * 落库用的附件元数据一并返回（落库事务里顺手清掉这些图的草稿附件）。
 */
import type { ModelMessage, UserContent } from "ai"
import { isAcpHostRuntimeId } from "@enjoy-agents/ipc-contract/agent-tools"
import { STEER_IMAGES_UNSUPPORTED } from "@enjoy-agents/ipc-contract/quoted-context"
import { MODEL_NEEDS_VISION } from "@enjoy-agents/ipc-contract/run-error-codes"
import type { AttachedAssetMeta } from "../attach-run-files.ts"
import type { SteerItem } from "./steering-queue.ts"

export function assertSteerAttachmentsSupported(runtimeId: string | undefined, attachments: readonly string[] | undefined): void {
  if (attachments?.length && isAcpHostRuntimeId(runtimeId)) throw new Error(STEER_IMAGES_UNSUPPORTED)
}

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

export type SteerDeps = {
  append: AppendAttachments
  persist: (sessionId: string, text: string, attached: AttachedAssetMeta[]) => void
  enqueue: (sessionId: string, item: SteerItem) => void
  newId: () => string
}

/** 纠偏一步到位：ACP 带图拒 → 编图 → 落库（带附件元数据）→ 挂纠偏队列。 */
export async function performSteer(
  input: { sessionId: string; text: string; attachments?: string[] },
  runtimeId: string | undefined,
  deps: SteerDeps
): Promise<void> {
  // leo MUST 2（#155）：ACP 运行时纠偏只取文字（acp-prompt lastUserText），带图会静默丢图——直接拒，renderer 排到下一轮。
  assertSteerAttachmentsSupported(runtimeId, input.attachments)
  let encoded: Awaited<ReturnType<typeof encodeSteerTurn>>
  try {
    encoded = await encodeSteerTurn(input.text, input.attachments, deps.append)
  } catch (error) {
    // 主线决定（#136）：当前模型看不了图（编图抛 model_needs_vision）与 ACP 同一结局——
    // 回「运行中收不了图」，renderer 把这条原样放回队首等下一轮，不弹原始报错红卡。
    if (input.attachments?.length && isModelNeedsVision(error)) throw new Error(STEER_IMAGES_UNSUPPORTED)
    throw error
  }
  const { content, attached } = encoded
  deps.persist(input.sessionId, input.text, attached)
  deps.enqueue(input.sessionId, { id: deps.newId(), text: input.text, ...(content ? { content } : {}) })
}

function isModelNeedsVision(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes(MODEL_NEEDS_VISION)
}
