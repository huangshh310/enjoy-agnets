/**
 * 供应商连接：名称、端点、Key 列表、代理。
 * 协议检测和区域切换在端点字段里完成，这里只把结果写回表单。
 */
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cx } from "@/utils/cx"
import type { ProviderPreset } from "@enjoy-agents/providers/presets"
import { ProviderEndpointFields } from "./provider-endpoint-fields"
import { ProviderKeyList } from "./provider-key-list"
import { proxyBlocksSave, type EditorState } from "./providers.types"
import { useT } from "@renderer/i18n"

export function ProviderConnectionFields({
  editor,
  preset,
  detecting,
  onChange,
  onDetect
}: {
  editor: EditorState
  preset: ProviderPreset
  detecting: boolean
  onChange: (patch: Partial<EditorState>) => void
  onDetect: () => void
}) {
  const t = useT()
  const proxyMode = editor.proxy === "direct" ? "direct" : editor.proxy.trim() ? "custom" : "system"
  return (
    <div className="flex flex-col gap-4 py-1">
      <div className="flex flex-col gap-1.5">
        <Label className="text-caption-1-medium text-text-secondary">{t("settings.providers.displayName")}</Label>
        <Input
          value={editor.name}
          onChange={(event) => onChange({ name: event.target.value })}
          placeholder={t("settings.providers.namePlaceholder")}
          className="h-9"
        />
      </div>
      <ProviderEndpointFields
        editor={editor}
        preset={preset}
        detecting={detecting}
        onChange={onChange}
        onDetect={onDetect}
      />
      <ProviderKeyList editor={editor} onChange={onChange} />
      <div className="flex flex-col gap-1.5">
        <Label className="text-caption-1-medium text-text-secondary">{t("settings.providers.proxy")}</Label>
        <div className="flex flex-wrap gap-1 rounded-xl bg-background-tertiary-default p-1">
          <ProxyChoice
            label={t("settings.providers.proxySystem")}
            active={proxyMode === "system"}
            onClick={() => onChange({ proxy: "" })}
          />
          <ProxyChoice
            label={t("settings.providers.proxyDirect")}
            active={proxyMode === "direct"}
            onClick={() => onChange({ proxy: "direct" })}
          />
          <ProxyChoice
            label={t("settings.providers.proxyCustom")}
            active={proxyMode === "custom"}
            onClick={() => {
              if (proxyMode !== "custom") onChange({ proxy: "https://" })
            }}
          />
        </div>
        {proxyMode === "custom" ? (
          <Input
            value={editor.proxy}
            onChange={(event) => onChange({ proxy: event.target.value })}
            placeholder="https://proxy.example:8080"
            className="h-9 font-mono text-body-2-regular"
          />
        ) : null}
        {proxyBlocksSave(editor.proxy) ? (
          <p className="text-caption-2-medium text-text-error-primary">{t("settings.providers.proxySocks")}</p>
        ) : (
          <p className="text-caption-2-regular text-text-secondary">{t("settings.providers.proxySocks")}</p>
        )}
      </div>
    </div>
  )
}

function ProxyChoice({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-lg px-3 py-1 text-caption-1-medium",
        active ? "bg-background-primary-default text-text-primary shadow-xs" : "text-text-secondary hover:text-text-primary"
      )}
    >
      {label}
    </button>
  )
}
