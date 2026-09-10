/**
 * 智能体抽屉里叠一层供应商新建抽屉。
 */
import { useT } from "@renderer/i18n"
import { ProviderEditorDrawer } from "../providers/provider-editor-drawer"
import type { useAgentProviderCreate } from "./use-agent-provider-create"

export function AgentToolNeedProvider({
  create
}: {
  create: ReturnType<typeof useAgentProviderCreate>
}) {
  const t = useT()
  return (
    <ProviderEditorDrawer
      editor={create.settings.editor}
      preset={create.settings.preset}
      probe={create.settings.probe}
      modelChoices={create.settings.modelChoices}
      canSave={create.settings.canSave}
      onClose={create.settings.closeEditor}
      onChangeKind={create.settings.changeKind}
      onChange={create.settings.updateEditor}
      onFetchModels={() => void create.settings.fetchModels()}
      onSave={() => void create.saveAndUse()}
      saveLabel={t("settings.agentTools.saveProvider")}
      layer="nested"
    />
  )
}

export { useAgentProviderCreate } from "./use-agent-provider-create"
