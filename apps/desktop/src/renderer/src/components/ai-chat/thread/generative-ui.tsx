/**
 * 白名单生成式 UI：只渲染 GENERATIVE_COMPONENT_IDS，不执行远程脚本。
 */
import type { ThreadMessage } from "@renderer/stores/chat-store"
import { AssetPreview } from "./asset-preview"
import { SourceList } from "./source-list"
import { StructuredCard } from "./structured-card"

export function GenerativeUi({
  components
}: {
  components: NonNullable<ThreadMessage["components"]>
}) {
  return (
    <div className="flex flex-col gap-2">
      {components.map((item, index) => (
        <GenerativeBlock key={`${item.componentId}-${index}`} item={item} />
      ))}
    </div>
  )
}

function GenerativeBlock({
  item
}: {
  item: NonNullable<ThreadMessage["components"]>[number]
}) {
  if (item.componentId === "source-list") {
    return <SourceList sources={asSources(item.props.sources)} />
  }
  if (item.componentId === "asset-preview") {
    return <AssetPreview assets={asAssets(item.props.assets)} />
  }
  if (item.componentId === "form") {
    return <StructuredCard value={item.props.value ?? item.props} variant="form" />
  }
  if (item.componentId === "table") {
    return <StructuredCard value={item.props.value ?? item.props} variant="table" />
  }
  if (item.componentId === "approval") {
    return (
      <p className="text-body-medium text-text-secondary">
        Approval stays in the confirmation card above. {safeText(item.props.summary)}
      </p>
    )
  }
  if (item.componentId === "card") {
    return <StructuredCard value={item.props.value ?? item.props} variant="card" />
  }
  return null
}

function asSources(value: unknown): NonNullable<ThreadMessage["sources"]> {
  return Array.isArray(value) ? (value as NonNullable<ThreadMessage["sources"]>) : []
}

function asAssets(value: unknown): NonNullable<ThreadMessage["assets"]> {
  return Array.isArray(value) ? (value as NonNullable<ThreadMessage["assets"]>) : []
}

function safeText(value: unknown): string {
  return typeof value === "string" ? value : ""
}
