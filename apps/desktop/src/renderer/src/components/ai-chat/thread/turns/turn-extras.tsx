/**
 * 助手消息附加区：优先白名单生成式 UI，否则回落来源 / 资产 / 结构化。
 */
import type { ThreadMessage } from "@renderer/stores/chat-store"
import { AssetPreview } from "../asset-preview"
import { GenerativeUi } from "../generative-ui"
import { SourceList } from "../source-list"
import { StructuredCard } from "../structured-card"

export function TurnExtras({ message, prompt }: { message: ThreadMessage; prompt?: string }) {
  const components = message.components ?? []
  if (components.length > 0) return <GenerativeUi components={components} prompt={prompt} />

  const sources = message.sources ?? []
  const assets = message.assets ?? []
  const structured = message.structured
  if (sources.length === 0 && assets.length === 0 && structured == null) return null

  return (
    <div className="mt-2 flex flex-col gap-2">
      {sources.length > 0 ? <SourceList sources={sources} /> : null}
      {assets.length > 0 ? <AssetPreview assets={assets} prompt={prompt} /> : null}
      {structured != null ? <StructuredCard value={structured} /> : null}
    </div>
  )
}
