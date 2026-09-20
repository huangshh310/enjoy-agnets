/**
 * webhook 本机端口 / 路径 / 可选密钥。明文非公网，不要画公网隧道。
 */
import { Input } from "@/components/ui/input"
import type { AutomationDraft } from "../lib/draft"
import { useT } from "@renderer/i18n"

export function WebhookFields({
  draft,
  onChange
}: {
  draft: AutomationDraft
  onChange: (patch: Partial<AutomationDraft>) => void
}) {
  const t = useT()
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <label>
          <span className="text-caption-1-medium text-text-tertiary">{t("studio.automations.webhookPort")}</span>
          <Input
            value={draft.webhookPort}
            onChange={(event) => onChange({ webhookPort: event.target.value })}
            className="mt-1 font-mono"
            inputMode="numeric"
          />
        </label>
        <label>
          <span className="text-caption-1-medium text-text-tertiary">{t("studio.automations.webhookPath")}</span>
          <Input
            value={draft.webhookPath}
            onChange={(event) => onChange({ webhookPath: event.target.value })}
            className="mt-1 font-mono"
          />
        </label>
      </div>
      <label className="block">
        <span className="text-caption-1-medium text-text-tertiary">
          {t("studio.automations.webhookSecret")}{" "}
          <span className="text-text-tertiary/70">{t("studio.automations.webhookSecretOptional")}</span>
        </span>
        <Input
          value={draft.webhookSecret}
          onChange={(event) => onChange({ webhookSecret: event.target.value })}
          className="mt-1 font-mono"
          type="password"
          autoComplete="off"
        />
      </label>
      <p className="rounded-lg bg-background-secondary-default px-2.5 py-2 text-[10px] text-text-tertiary">
        {t("studio.automations.webhookListenHint", { port: draft.webhookPort.trim() || "8765" })}
      </p>
    </div>
  )
}
