/**
 * 聊天里生图：用户 prompt 与生成资产落库，刷新后气泡能回放。
 */
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
  asset: { id: string; mediaType: string; name: string }
) {
  persistFinishedAssistant({
    sessionId,
    content: "",
    reasoning: "",
    tools: [],
    startedAt: Date.now(),
    extras: {
      assets: [{ assetId: asset.id, mediaType: asset.mediaType, name: asset.name }]
    }
  })
}
