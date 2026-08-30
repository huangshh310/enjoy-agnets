"use client"

import { Button } from "@/components/base/buttons/button"
import { Input } from "@/components/base/input/input"

export function AiChatKeysDialog({
  open,
  apiKeyDraft,
  providerDraft,
  hasKey,
  onApiKeyChange,
  onProviderChange,
  onClose,
  onSave
}: {
  open: boolean
  apiKeyDraft: string
  providerDraft: "deepseek" | "openai" | "anthropic" | "openrouter" | "ollama"
  hasKey: boolean
  onApiKeyChange: (value: string) => void
  onProviderChange: (value: "deepseek" | "openai" | "anthropic" | "openrouter" | "ollama") => void
  onClose: () => void
  onSave: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-6">
      <div className="w-[420px] rounded-3xl bg-background-primary-default p-6 shadow-xl">
        <h2 className="text-title-3-semibold text-text-primary">Provider key</h2>
        <p className="mt-1 text-body-medium text-text-secondary">
          Keys stay in the main process via OS encryption. The renderer never reads the raw secret after save.
        </p>
        <div className="mt-4 flex flex-col gap-3">
          <label className="text-caption-1-medium text-text-secondary">
            Provider
            <select
              value={providerDraft}
              onChange={(event) =>
                onProviderChange(event.target.value as typeof providerDraft)
              }
              className="mt-1 h-10 w-full rounded-2lg border border-border-button-default bg-background-primary-default px-3 text-body-medium text-text-primary"
            >
              <option value="deepseek">DeepSeek</option>
              <option value="openai">OpenAI compatible</option>
              <option value="anthropic">Anthropic</option>
              <option value="openrouter">OpenRouter</option>
              <option value="ollama">Ollama</option>
            </select>
          </label>
          <Input
            type="password"
            label="API key"
            value={apiKeyDraft}
            onChange={onApiKeyChange}
            placeholder={hasKey ? "Key saved — paste to replace" : "sk-..."}
          />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" size="small" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="small" onClick={onSave}>
            Save key
          </Button>
        </div>
      </div>
    </div>
  )
}
