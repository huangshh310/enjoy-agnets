/**
 * 供应商编辑/添加表单字段组：
 * 采用分栏 Tabs 组织四大模块：
 * 1. Connection (基础连接与认证)
 * 2. Models (默认模型、角色分工与模型目录管理)
 * 3. Parameters (上下文大小、推理强度、Tokens 与温度)
 * 4. Overrides (自定义 Headers 与 Body 参数覆盖)
 */
import {
  RiCodeSSlashLine,
  RiEqualizerLine,
  RiLinkM,
  RiRobot2Line
} from "@remixicon/react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ProviderPreset } from "@enjoy-agents/providers/presets"
import { ProviderConnectionFields } from "./provider-connection-fields"
import { ProviderModelsTab } from "./provider-models-tab"
import { ProviderOverridesTab } from "./provider-overrides-tab"
import { ProviderParamsTab } from "./provider-params-tab"
import type { EditorState, ProbeState } from "./providers.types"
import { useT } from "@renderer/i18n"
import { SecretStorageWarning } from "../secret-storage-warning"

export function ProviderEditorFields({
  editor,
  preset,
  modelChoices,
  probe,
  detecting,
  onChange,
  onFetchModels,
  onDetect
}: {
  editor: EditorState
  preset: ProviderPreset
  modelChoices: Array<{ id: string; label: string }>
  probe: ProbeState
  detecting: boolean
  onChange: (patch: Partial<EditorState>) => void
  onFetchModels: () => void
  onDetect: () => void
}) {
  const t = useT()
  return (
    <div className="flex flex-col gap-3">
    <SecretStorageWarning />
    <Tabs defaultValue="connection" className="w-full">
      {/* 顶部 Tab 导航栏 */}
      <TabsList className="grid w-full grid-cols-4 rounded-xl bg-background-tertiary-default p-1 mb-2">
        <TabsTrigger
          value="connection"
          className="gap-1.5 text-caption-1-medium py-1.5 rounded-lg data-[state=active]:bg-background-primary-default data-[state=active]:text-text-primary data-[state=active]:shadow-xs"
        >
          <RiLinkM className="size-3.5" />
          <span>{t("settings.providers.tabConnection")}</span>
        </TabsTrigger>

        <TabsTrigger
          value="models"
          className="gap-1.5 text-caption-1-medium py-1.5 rounded-lg data-[state=active]:bg-background-primary-default data-[state=active]:text-text-primary data-[state=active]:shadow-xs"
        >
          <RiRobot2Line className="size-3.5" />
          <span>{t("settings.providers.tabModels")}</span>
        </TabsTrigger>

        <TabsTrigger
          value="params"
          className="gap-1.5 text-caption-1-medium py-1.5 rounded-lg data-[state=active]:bg-background-primary-default data-[state=active]:text-text-primary data-[state=active]:shadow-xs"
        >
          <RiEqualizerLine className="size-3.5" />
          <span>{t("settings.providers.tabParams")}</span>
        </TabsTrigger>

        <TabsTrigger
          value="overrides"
          className="gap-1.5 text-caption-1-medium py-1.5 rounded-lg data-[state=active]:bg-background-primary-default data-[state=active]:text-text-primary data-[state=active]:shadow-xs"
        >
          <RiCodeSSlashLine className="size-3.5" />
          <span>{t("settings.providers.tabOverrides")}</span>
        </TabsTrigger>
      </TabsList>

      {/* 各 Tab 对应内容面板 */}
      <TabsContent value="connection" className="focus-visible:outline-none">
        <ProviderConnectionFields
          editor={editor}
          preset={preset}
          detecting={detecting}
          onChange={onChange}
          onDetect={onDetect}
        />
      </TabsContent>

      <TabsContent value="models" className="focus-visible:outline-none">
        <ProviderModelsTab
          editor={editor}
          modelChoices={modelChoices}
          probe={probe}
          onChange={onChange}
          onFetchModels={onFetchModels}
        />
      </TabsContent>

      <TabsContent value="params" className="focus-visible:outline-none">
        <ProviderParamsTab
          editor={editor}
          onChange={onChange}
        />
      </TabsContent>

      <TabsContent value="overrides" className="focus-visible:outline-none">
        <ProviderOverridesTab
          editor={editor}
          preset={preset}
          onChange={onChange}
        />
      </TabsContent>
    </Tabs>
    </div>
  )
}
