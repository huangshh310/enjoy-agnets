"use client"

import { Button } from "@/components/base/buttons/button"
import { Input } from "@/components/base/input/input"
import { saveApiKey } from "@renderer/hooks/use-agent-session"
import { useChatStore } from "@renderer/stores/chat-store"

export function AiChatKeysDialog() {
  const settingsOpen = useChatStore((state) => state.settingsOpen)
  const setSettingsOpen = useChatStore((state) => state.setSettingsOpen)
  const apiKeyDraft = useChatStore((state) => state.apiKeyDraft)
  const setApiKeyDraft = useChatStore((state) => state.setApiKeyDraft)
  const providerDraft = useChatStore((state) => state.providerDraft)
  const setProviderDraft = useChatStore((state) => state.setProviderDraft)
  const hasKey = useChatStore((state) => state.hasKey)

  if (settingsOpen !== "keys") return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-6">
      <div className="w-[420px] rounded-3xl bg-background-primary-default p-6 shadow-xl">
        <h2 className="text-title-3-semibold text-text-primary">Provider key</h2>
        <p className="mt-1 text-body-medium text-text-secondary">
          Keys stay in the main process via OS encryption. The renderer never
          reads the raw secret after save.
        </p>
        <div className="mt-4 flex flex-col gap-3">
          <label className="text-caption-1-medium text-text-secondary">
            Provider
            <select
              value={providerDraft}
              onChange={(event) =>
                setProviderDraft(event.target.value as typeof providerDraft)
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
            onChange={setApiKeyDraft}
            placeholder={hasKey ? "Key saved — paste to replace" : "sk-..."}
          />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" size="small" onClick={() => setSettingsOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="small" onClick={() => void saveApiKey()}>
            Save key
          </Button>
        </div>
      </div>
    </div>
  )
}
