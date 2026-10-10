/**
 * 智能体抽屉内就地快速配置 API Key 弹窗。
 * 允许用户无需离开抽屉直接填入 Key，安全写入 Vault 并自动绑定为动力源。
 */
import { useState } from "react"
import {
  RiCheckLine,
  RiEyeLine,
  RiEyeOffLine,
  RiFlashlightLine,
  RiKey2Line,
  RiLoader4Line
} from "@remixicon/react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { useQueryClient } from "@tanstack/react-query"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { createTargetForBind } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useT } from "@renderer/i18n"
import { AgentBrandIcon } from "@renderer/components/ai-chat/agent-picker/agent-brand-icon"
import { SecretStorageWarning } from "../secret-storage-warning"
import { persistSnapshot } from "../providers/provider-editor-writes"
import { secretWriteErrorMessage, unwrapSettingsWrite } from "@renderer/lib/secret-write"

type QuickPresetMeta = {
  kind: string
  apiStyle: string
  defaultBaseURL: string
  defaultModel: string
  defaultName: string
  models: Array<{ id: string; label: string }>
}

function resolveQuickPreset(toolId: string, toolLabel: string): QuickPresetMeta {
  const target = createTargetForBind(toolId)
  if (toolId === "deepseek") {
    return {
      kind: "deepseek",
      apiStyle: "openai",
      defaultBaseURL: "https://api.deepseek.com",
      defaultModel: "deepseek-chat",
      defaultName: "DeepSeek 官方 API",
      models: [
        { id: "deepseek-chat", label: "DeepSeek-V3 (Chat)" },
        { id: "deepseek-reasoner", label: "DeepSeek-R1 (Reasoner)" }
      ]
    }
  }
  if (toolId === "claude") {
    return {
      kind: "anthropic",
      apiStyle: "anthropic",
      defaultBaseURL: "https://api.anthropic.com",
      defaultModel: "claude-sonnet-4-6",
      defaultName: "Anthropic 官方 API",
      models: [
        { id: "claude-sonnet-4-6", label: "Sonnet 4.6" },
        { id: "claude-opus-4-6", label: "Opus 4.6" }
      ]
    }
  }
  if (toolId === "codex") {
    return {
      kind: "openai",
      apiStyle: "openai",
      defaultBaseURL: "https://api.openai.com/v1",
      defaultModel: "gpt-5.4",
      defaultName: "OpenAI 官方 API",
      models: [
        { id: "gpt-5.4", label: "GPT-5.4" },
        { id: "o3", label: "o3" }
      ]
    }
  }
  if (toolId === "gemini") {
    return {
      kind: "google",
      apiStyle: "openai",
      defaultBaseURL: "https://generativelanguage.googleapis.com",
      defaultModel: "gemini-2.5-pro",
      defaultName: "Google Gemini 官方 API",
      models: [
        { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
        { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" }
      ]
    }
  }
  return {
    kind: target?.kind ?? "openai",
    apiStyle: target?.apiStyle ?? "openai",
    defaultBaseURL: "",
    defaultModel: "default",
    defaultName: `${toolLabel} API`,
    models: [{ id: "default", label: "Default" }]
  }
}

export function AgentToolQuickKeyDialog({
  open,
  onOpenChange,
  tool,
  onSaved
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tool: AgentToolPublic
  onSaved: (providerId: string, modelId: string) => Promise<void>
}) {
  const t = useT()
  const queryClient = useQueryClient()
  const preset = resolveQuickPreset(tool.id, tool.label)

  const [apiKey, setApiKey] = useState("")
  const [baseURL, setBaseURL] = useState("")
  const [name, setName] = useState(preset.defaultName)
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function resetState() {
    setApiKey("")
    setBaseURL("")
    setName(preset.defaultName)
    setShowKey(false)
    setTesting(false)
    setTestResult(null)
    setSaving(false)
    setErrorMsg(null)
  }

  async function handleTestPing() {
    if (!apiKey.trim()) {
      setErrorMsg(t("settings.agentTools.quickKeyInputPlaceholder"))
      return
    }
    if (!hasIde()) return
    setTesting(true)
    setTestResult(null)
    setErrorMsg(null)
    try {
      const res = await getIde().settings.pingProvider({
        kind: preset.kind,
        apiKey: apiKey.trim(),
        baseURL: baseURL.trim() || (preset.defaultBaseURL || undefined),
        apiStyle: preset.apiStyle
      })
      if (res.ok) {
        setTestResult({
          ok: true,
          message: t("settings.agentTools.quickKeyPingOk", { latency: res.latencyMs })
        })
      } else {
        setTestResult({
          ok: false,
          message: t("settings.agentTools.quickKeyPingFail", { message: res.message })
        })
      }
    } catch (err) {
      setTestResult({
        ok: false,
        message: t("settings.agentTools.quickKeyPingFail", {
          message: err instanceof Error ? err.message : String(err)
        })
      })
    } finally {
      setTesting(false)
    }
  }

  async function handleSaveAndBind() {
    const key = apiKey.trim()
    if (!key) {
      setErrorMsg(t("settings.agentTools.quickKeyInputPlaceholder"))
      return
    }
    if (!hasIde()) return
    setSaving(true)
    setErrorMsg(null)
    try {
      const effectiveBaseURL = baseURL.trim() || (preset.defaultBaseURL || undefined)
      const profileName = name.trim() || preset.defaultName
      const snapshot = unwrapSettingsWrite(
        await getIde().settings.upsertProvider({
          name: profileName,
          kind: preset.kind,
          apiKey: key,
          baseURL: effectiveBaseURL,
          apiStyle: preset.apiStyle,
          models: preset.models,
          modelId: preset.defaultModel
        })
      )
      await persistSnapshot(queryClient, snapshot)
      const created = snapshot.providers.find((p: { name: string; id: string }) => p.name === profileName) ?? snapshot.providers.at(-1)
      if (created) {
        await onSaved(created.id, preset.defaultModel)
      }
      onOpenChange(false)
      resetState()
    } catch (err) {
      setErrorMsg(secretWriteErrorMessage(err, t))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) resetState()
      }}
    >
      <DialogContent className="z-50 max-w-md rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-dropdown select-none">
        <DialogHeader className="gap-1.5">
          <div className="flex items-center gap-2">
            <AgentBrandIcon id={tool.id} size={24} />
            <DialogTitle className="text-title-3-semibold text-text-primary">
              {t("settings.agentTools.quickKeyModalTitle", { agent: tool.label })}
            </DialogTitle>
          </div>
          <DialogDescription className="text-caption-2-regular text-text-tertiary">
            {t("settings.agentTools.quickKeyModalDesc")}
          </DialogDescription>
        </DialogHeader>
        <SecretStorageWarning />

        <div className="flex flex-col gap-3.5 py-2">
          {/* API Key 输入框 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-caption-2-medium text-text-secondary">
              {t("settings.agentTools.quickKeyInputLabel")} <span className="text-text-error-primary">*</span>
            </label>
            <div className="relative flex items-center">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={t("settings.agentTools.quickKeyInputPlaceholder")}
                className="w-full rounded-xl border border-border-button-default bg-background-secondary-default py-2 pr-9 pl-3 text-body-medium text-text-primary placeholder:text-text-tertiary focus:border-accent-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                tabIndex={-1}
                className="absolute right-2.5 text-text-tertiary transition-colors hover:text-text-primary"
              >
                {showKey ? <RiEyeOffLine className="size-4" /> : <RiEyeLine className="size-4" />}
              </button>
            </div>
          </div>

          {/* Base URL 输入框 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-caption-2-medium text-text-secondary">
              {t("settings.agentTools.quickKeyBaseUrlLabel")}
            </label>
            <input
              type="text"
              value={baseURL}
              onChange={(e) => setBaseURL(e.target.value)}
              placeholder={preset.defaultBaseURL || t("settings.agentTools.quickKeyBaseUrlPlaceholder")}
              className="w-full rounded-xl border border-border-button-default bg-background-secondary-default px-3 py-2 text-caption-1-regular text-text-primary placeholder:text-text-tertiary focus:border-accent-500 focus:outline-none"
            />
          </div>

          {/* 档案名称 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-caption-2-medium text-text-secondary">
              {t("settings.agentTools.quickKeyNameLabel")}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-border-button-default bg-background-secondary-default px-3 py-2 text-caption-1-regular text-text-primary placeholder:text-text-tertiary focus:border-accent-500 focus:outline-none"
            />
          </div>

          {/* 测试与反馈信息 */}
          {errorMsg ? (
            <p className="text-caption-2-medium text-text-error-primary">{errorMsg}</p>
          ) : null}
          {testResult ? (
            <div
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-caption-2-medium ${
                testResult.ok
                  ? "bg-accent-500/10 text-accent-600 dark:text-accent-400"
                  : "bg-background-tertiary-error text-text-error-primary"
              }`}
            >
              {testResult.ok ? <RiCheckLine className="size-3.5 shrink-0" /> : null}
              <span>{testResult.message}</span>
            </div>
          ) : null}
        </div>

        <DialogFooter className="mt-2 flex items-center justify-between gap-2 sm:justify-between">
          <button
            type="button"
            disabled={testing || saving || !apiKey.trim()}
            onClick={() => void handleTestPing()}
            className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-border-button-default bg-background-secondary-default px-3 py-1.5 text-caption-2-medium text-text-primary transition-colors hover:bg-background-secondary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {testing ? (
              <RiLoader4Line className="size-3.5 animate-spin" />
            ) : (
              <RiFlashlightLine className="size-3.5 text-accent-500" />
            )}
            <span>
              {testing
                ? t("settings.agentTools.quickKeyTestingPing")
                : t("settings.agentTools.quickKeyPingBtn")}
            </span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer rounded-xl border border-border-button-default px-3 py-1.5 text-caption-2-medium text-text-secondary transition-colors hover:bg-background-secondary-hover hover:text-text-primary"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              disabled={saving || !apiKey.trim()}
              onClick={() => void handleSaveAndBind()}
              className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-accent-500 px-3.5 py-1.5 text-caption-2-medium font-semibold text-text-white shadow-2xs transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <RiLoader4Line className="size-3.5 animate-spin" />
              ) : (
                <RiKey2Line className="size-3.5" />
              )}
              <span>{t("settings.agentTools.quickKeySaveBtn")}</span>
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
