/**
 * 白名单生成式 UI：只渲染 GENERATIVE_COMPONENT_IDS，不执行远程脚本。
 */
import type { ThreadMessage } from "@renderer/stores/chat-store"
import { TaskList, type TaskItem } from "@/components/ai-elements/task-list"
import { AssetPreview } from "./asset-preview"
import { SourceList } from "./source-list"
import { StructuredCard } from "./structured-card"
import { useT } from "@renderer/i18n"

export function GenerativeUi({
  components,
  prompt
}: {
  components: NonNullable<ThreadMessage["components"]>
  prompt?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      {components.map((item, index) => (
        <GenerativeBlock key={`${item.componentId}-${index}`} item={item} prompt={prompt} />
      ))}
    </div>
  )
}

function GenerativeBlock({
  item,
  prompt
}: {
  item: NonNullable<ThreadMessage["components"]>[number]
  prompt?: string
}) {
  const t = useT()
  if (item.componentId === "source-list") {
    return <SourceList sources={asSources(item.props.sources)} />
  }
  if (item.componentId === "asset-preview") {
    return (
      <AssetPreview
        assets={asAssets(item.props.assets)}
        prompt={typeof item.props.prompt === "string" ? item.props.prompt : prompt}
      />
    )
  }
  if (item.componentId === "task-list" || item.componentId === "todo-list" || item.componentId === "tasks") {
    const tasks = (item.props.tasks as TaskItem[]) || (item.props.items as TaskItem[]) || []
    return (
      <TaskList
        title={typeof item.props.title === "string" ? item.props.title : t("chat.todos")}
        tasks={tasks}
        currentIndex={typeof item.props.currentIndex === "number" ? item.props.currentIndex : undefined}
      />
    )
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
        {t("chat.approvalStays")} {safeText(item.props.summary)}
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
