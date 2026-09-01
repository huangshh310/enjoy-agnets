/**
 * 新建 / 编辑自动化规则表单。
 */
import { RiCheckLine, RiSparklingLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { AutomationTrigger } from "@enjoy-agents/ipc-contract"
import { AUTOMATION_TEMPLATES } from "../constants"

export function AutomationDraftForm({
  editingId,
  name,
  prompt,
  trigger,
  onNameChange,
  onPromptChange,
  onTriggerChange,
  onCancel,
  onSubmit
}: {
  editingId: string | null
  name: string
  prompt: string
  trigger: AutomationTrigger
  onNameChange: (value: string) => void
  onPromptChange: (value: string) => void
  onTriggerChange: (value: AutomationTrigger) => void
  onCancel: () => void
  onSubmit: () => void
}) {
  return (
    <form
      className="overflow-hidden rounded-2xl border border-accent-500/40 bg-background-primary-default p-5 shadow-sm transition-all"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <div className="flex items-center justify-between border-b border-separator-border/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-lg bg-accent-500/10 text-accent-500">
            <RiSparklingLine className="size-3.5" />
          </div>
          <h3 className="text-body-medium font-semibold text-text-primary">
            {editingId ? "Edit Automation Rule" : "Create New Custom Automation"}
          </h3>
        </div>
        <span className="text-caption-2-medium text-text-tertiary">Stored securely in local SQLite database</span>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <div className="flex flex-col gap-1.5">
          <Label className="text-caption-1-medium text-text-secondary">Automation Name</Label>
          <Input
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="e.g. Inspect Uncommitted Diffs"
            className="bg-background-secondary-default text-caption-1-medium font-medium focus-visible:bg-background-primary-default"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-caption-1-medium text-text-secondary">Trigger Mode</Label>
          <Select value={trigger} onValueChange={(value) => onTriggerChange(value as AutomationTrigger)}>
            <SelectTrigger className="h-9 w-full rounded-2lg bg-background-secondary-default">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual trigger</SelectItem>
              <SelectItem value="on_save">On file save hook</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-caption-1-medium text-text-secondary">Prompt Instruction</Label>
          <span className="text-caption-2-medium text-text-tertiary">Presets:</span>
        </div>
        <div className="mb-1 flex flex-wrap gap-1.5">
          {AUTOMATION_TEMPLATES.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                if (!name) onNameChange(preset.name)
                onPromptChange(preset.prompt)
                onTriggerChange(preset.trigger)
              }}
              className="inline-flex items-center gap-1 rounded-full border border-border-button-default bg-background-secondary-default px-2.5 py-1 text-caption-2-medium text-text-secondary transition-all hover:border-accent-500/40 hover:bg-background-secondary-hover hover:text-text-primary"
            >
              <RiSparklingLine className="size-3 text-accent-500" />
              <span>{preset.name}</span>
            </button>
          ))}
        </div>
        <Textarea
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          placeholder="Enter prompt instructions for the agent to execute on trigger..."
          className="min-h-28 rounded-xl border-border-button-default bg-background-secondary-default text-body-medium focus-visible:bg-background-primary-default"
        />
      </div>
      <div className="mt-4 flex items-center justify-end gap-2 border-t border-separator-border/60 pt-3">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={!name.trim()} className="gap-1 shadow-xs">
          <RiCheckLine className="size-4" />
          <span>{editingId ? "Save changes" : "Create automation"}</span>
        </Button>
      </div>
    </form>
  )
}
