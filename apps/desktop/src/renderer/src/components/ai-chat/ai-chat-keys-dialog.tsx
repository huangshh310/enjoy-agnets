"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"

type ProviderId = "deepseek" | "openai" | "anthropic" | "openrouter" | "ollama"

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
  providerDraft: ProviderId
  hasKey: boolean
  onApiKeyChange: (value: string) => void
  onProviderChange: (value: ProviderId) => void
  onClose: () => void
  onSave: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="w-[420px] sm:max-w-[420px]" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-title-3-semibold text-text-primary">Provider key</DialogTitle>
          <DialogDescription className="text-body-medium text-text-secondary">
            Keys stay in the main process via OS encryption. The renderer never reads the raw secret after save.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-caption-1-medium text-text-secondary">Provider</Label>
            <Select value={providerDraft} onValueChange={(value) => onProviderChange(value as ProviderId)}>
              <SelectTrigger className="h-10 w-full rounded-2lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deepseek">DeepSeek</SelectItem>
                <SelectItem value="openai">OpenAI compatible</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="openrouter">OpenRouter</SelectItem>
                <SelectItem value="ollama">Ollama</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-caption-1-medium text-text-secondary">API key</Label>
            <Input
              type="password"
              value={apiKeyDraft}
              onChange={(event) => onApiKeyChange(event.target.value)}
              placeholder={hasKey ? "Key saved — paste to replace" : "sk-..."}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={onSave}>
            Save key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
