/**
 * OpenTelemetry (OTEL) 与远程可观测性导出配置模态框：
 * 遵循 Vercel AI SDK 7 遥测规范，支持本地脱敏模式与 Langfuse / Helicone / 自建 OTLP Collector 上报。
 */
import { useEffect, useState } from "react"
import {
  RiCheckLine,
  RiLoader4Line,
  RiShieldCheckLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { getIde, hasIde } from "@renderer/lib/ide"

export function ObservabilityOtelModal(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const { open, onOpenChange, onSaved } = props
  const t = useT()
  const [policy, setPolicy] = useState<"local" | "otel" | "off">("local")
  const [endpoint, setEndpoint] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    if (open && hasIde()) {
      // 默认读取当前策略
      setSaveSuccess(false)
    }
  }, [open])

  async function handleSave() {
    if (!hasIde() || isSaving) return
    setIsSaving(true)
    try {
      await getIde().observability.setPolicy({
        policy,
        otelEndpoint: policy === "otel" && endpoint.trim() ? endpoint.trim() : undefined
      })
      setSaveSuccess(true)
      onSaved()
      setTimeout(() => {
        onOpenChange(false)
      }, 800)
    } catch {
      // ignore
    } finally {
      setIsSaving(false)
    }
  }

  const policyItems = [
    { id: "local" as const, label: t("pages.observability.policyLocal") },
    { id: "otel" as const, label: t("pages.observability.policyOtel") },
    { id: "off" as const, label: t("pages.observability.policyOff") }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden rounded-xl border border-separator-border/80 bg-background-primary-default shadow-xl">
        <div className="border-b border-separator-border/70 px-5 py-3.5 flex flex-col gap-0.5">
          <DialogTitle className="text-body-medium font-semibold text-text-primary">
            {t("pages.observability.otelModalTitle")}
          </DialogTitle>
          <p className="text-caption-2-regular text-text-tertiary">
            {t("pages.observability.otelModalHint")}
          </p>
        </div>

        <div className="flex flex-col gap-4 p-5">
          {/* 遥测策略模式单选 */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-caption-2-medium font-medium text-text-secondary">
              {t("pages.observability.telemetryPolicy")}
            </Label>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-background-secondary-default/60 p-0.5">
              {policyItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPolicy(item.id)}
                  className={cx(
                    "rounded py-1 text-caption-2-medium font-medium transition-all flex items-center justify-center",
                    policy === item.id
                      ? "bg-background-primary-default text-text-primary shadow-2xs font-semibold"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 远程端点配置 */}
          {policy === "otel" ? (
            <div className="flex flex-col gap-1.5">
              <Label className="text-caption-2-medium font-medium text-text-secondary">
                {t("pages.observability.otlpEndpoint")}
              </Label>
              <Input
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder={t("pages.observability.otlpPlaceholder")}
                className="font-mono text-caption-2-medium h-8 bg-background-secondary-default/40"
              />
              <div className="flex items-center gap-1.5 text-caption-2-regular text-text-tertiary">
                <span>{t("pages.observability.otlpHint")}</span>
              </div>
            </div>
          ) : null}

          {/* 脱敏安全说明 */}
          <div className="flex items-start gap-2.5 rounded-lg border border-separator-border/60 bg-background-secondary-default/30 p-3 text-caption-2-regular text-text-secondary">
            <RiShieldCheckLine className="size-4 text-state-success-text shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>{t("pages.observability.privacyTitle")}</strong>
              {t("pages.observability.privacyBefore")}
              <code>redactMetric</code>
              {t("pages.observability.privacyAfter")}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-separator-border/70 px-5 py-3 bg-background-secondary-default/30">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="h-8 text-caption-2-medium"
          >
            {t("common.cancel")}
          </Button>

          <Button
            size="sm"
            disabled={isSaving}
            onClick={() => void handleSave()}
            className="gap-1.5 h-8 text-caption-2-medium shadow-xs"
          >
            {isSaving ? (
              <RiLoader4Line className="size-3 animate-spin" />
            ) : saveSuccess ? (
              <RiCheckLine className="size-3 text-state-success-text" />
            ) : (
              <RiCheckLine className="size-3" />
            )}
            <span>
              {saveSuccess
                ? t("pages.observability.saved")
                : t("pages.observability.saveSettings")}
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
