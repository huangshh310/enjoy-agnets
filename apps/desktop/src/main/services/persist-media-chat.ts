/**
 * 聊天里生图：用户 prompt 与生成资产落库，刷新后气泡能回放。
 */
import type { AssistantRunKind } from "@enjoy-agents/ipc-contract"
import { announcePersistedMessage } from "./announce-persisted-message"
import { persistFinishedAssistant } from "./persist-parts"
import { metasFromAssetIds, persistUserTurn } from "./persist-user-attachments"

export function persistMediaUserPrompt(
  sessionId: string,
  prompt: string,
  attachmentIds: string[]
) {
  persistUserTurn(sessionId, prompt, metasFromAssetIds(attachmentIds))
}

export function persistMediaAssistantAsset(
  sessionId: string,
  asset: { id: string; mediaType: string; name: string },
  runKind?: AssistantRunKind,
  runId?: string
): string | undefined {
  const id = persistFinishedAssistant({
    sessionId,
    content: "",
    reasoning: "",
    tools: [],
    startedAt: Date.now(),
    extras: {
      assets: [{ assetId: asset.id, mediaType: asset.mediaType, name: asset.name }]
    },
    runKind,
    runId
  })
  // 生图 / 生视频行也回报真 id（同 flush-agent-run），气泡才能绑上 persistedId、进截断名单。
  if (id && runId) announcePersistedMessage({ runId, sessionId, messageId: id, role: "assistant" })
  return id
}
