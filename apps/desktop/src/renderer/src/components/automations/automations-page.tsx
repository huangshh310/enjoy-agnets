import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  RiAddLine,
  RiCheckLine,
  RiClipboardLine,
  RiCursorLine,
  RiDeleteBinLine,
  RiEditLine,
  RiFlashlightLine,
  RiPlayCircleLine,
  RiRobot2Line,
  RiSaveLine,
  RiSparklingLine,
  RiStackLine
} from "@remixicon/react"
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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { cx } from "@/utils/cx"
import type { Automation, AutomationTrigger } from "@enjoy-agents/ipc-contract"
import { SecondaryPageShell } from "@renderer/components/app-pages/secondary-page-shell"
import { getIde, hasIde } from "@renderer/lib/ide"

type AutomationFilter = "all" | "manual" | "on_save"

const PROMPT_PRESETS = [
  {
    label: "Review Git Diffs",
    prompt: "Inspect the latest uncommitted changes in the workspace and summarize risk and potential bugs."
  },
  {
    label: "Typecheck & Fixes",
    prompt: "Run project typecheck, identify any type errors, and explain the recommended fix."
  },
  {
    label: "Commit Notes",
    prompt: "Summarize recent file changes into structured Conventional Commits changelog notes."
  },
  {
    label: "Audit TODOs",
    prompt: "Scan recent files for TODO, FIXME, or HACK comments and generate a prioritized checklist."
  }
]

export function AutomationsPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<AutomationFilter>("all")
  const [query, setQuery] = useState("")
  const [draftOpen, setDraftOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [prompt, setPrompt] = useState("")
  const [trigger, setTrigger] = useState<AutomationTrigger>("manual")
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const automationsQuery = useQuery({
    queryKey: ["automations"],
    enabled: hasIde(),
    queryFn: () => getIde().automations.list() as Promise<Automation[]>
  })

  const automations = automationsQuery.data ?? []
  const manualCount = automations.filter((item) => item.trigger === "manual").length
  const onSaveCount = automations.filter((item) => item.trigger === "on_save").length

  const visibleAutomations = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    return automations.filter((item) => {
      if (filter !== "all" && item.trigger !== filter) return false
      if (!normalized) return true
      return `${item.name} ${item.prompt} ${item.trigger}`.toLocaleLowerCase().includes(normalized)
    })
  }, [automations, filter, query])

  const groups = useMemo(
    () => [
      {
        id: "library",
        label: "Library",
        items: [
          {
            id: "all",
            label: "All jobs",
            icon: RiStackLine,
            keywords: ["job", "library", "all"],
            meta: String(automations.length)
          },
          {
            id: "manual",
            label: "Manual trigger",
            icon: RiCursorLine,
            keywords: ["run", "prompt", "manual"],
            meta: String(manualCount)
          },
          {
            id: "on_save",
            label: "On save hook",
            icon: RiSaveLine,
            keywords: ["file", "watch", "hook", "save"],
            meta: String(onSaveCount)
          }
        ]
      }
    ],
    [automations.length, manualCount, onSaveCount]
  )

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["automations"] })
  }

  function resetDraft() {
    setEditingId(null)
    setName("")
    setPrompt("")
    setTrigger("manual")
    setDraftOpen(false)
  }

  function startEdit(automation: Automation) {
    setEditingId(automation.id)
    setName(automation.name)
    setPrompt(automation.prompt)
    setTrigger(automation.trigger)
    setDraftOpen(true)
  }

  async function saveAutomation() {
    if (!name.trim() || !hasIde()) return
    await getIde().automations.upsert({
      id: editingId ?? undefined,
      name: name.trim(),
      prompt: prompt.trim(),
      trigger,
      enabled: true
    })
    resetDraft()
    await refresh()
  }

  async function toggleEnabled(automation: Automation, enabled: boolean) {
    if (!hasIde()) return
    await getIde().automations.upsert({
      id: automation.id,
      name: automation.name,
      prompt: automation.prompt,
      trigger: automation.trigger,
      enabled
    })
    await refresh()
  }

  async function removeAutomation(id: string) {
    if (!hasIde()) return
    await getIde().automations.remove(id)
    await refresh()
  }

  function handleCopyPrompt(id: string, text: string) {
    void navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <SecondaryPageShell
      searchPlaceholder="Search automations..."
      groups={groups}
      selectedId={filter}
      onSelect={(id) => setFilter(id as AutomationFilter)}
      contentWidth="stage"
      filterNav={false}
      searchValue={query}
      onSearchChange={setQuery}
    >
      <div className="flex flex-col gap-6">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500 shadow-xs">
                <RiRobot2Line className="size-5" />
              </div>
              <h1 className="text-title-3-semibold text-text-primary">Automations</h1>
            </div>
            <p className="mt-1 text-body-medium text-text-secondary">
              Repeatable Agent tasks with trigger rules. Run manually or hook on file save.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!draftOpen ? (
              <Button size="sm" onClick={() => setDraftOpen(true)} className="gap-1.5 shadow-xs">
                <RiAddLine className="size-4" />
                <span>New automation</span>
              </Button>
            ) : null}
          </div>
        </header>

        {/* Creation & Edit Card */}
        {draftOpen ? (
          <form
            className="overflow-hidden rounded-2xl border border-accent-500/30 bg-background-primary-default p-5 shadow-sm transition-all"
            onSubmit={(event) => {
              event.preventDefault()
              void saveAutomation()
            }}
          >
            <div className="flex items-center justify-between border-b border-separator-border/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded-lg bg-accent-500/10 text-accent-500">
                  <RiSparklingLine className="size-3.5" />
                </div>
                <h3 className="text-body-medium font-semibold text-text-primary">
                  {editingId ? "Edit Automation" : "Create New Automation"}
                </h3>
              </div>
              <span className="text-caption-2-medium text-text-tertiary">
                Stored in local SQLite preferences
              </span>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
              <div className="flex flex-col gap-1.5">
                <Label className="text-caption-1-medium text-text-secondary">Automation Name</Label>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Inspect Uncommitted Diffs"
                  className="bg-background-secondary-default focus-visible:bg-background-primary-default"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-caption-1-medium text-text-secondary">Trigger Mode</Label>
                <Select value={trigger} onValueChange={(value) => setTrigger(value as AutomationTrigger)}>
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

            {/* Prompt presets */}
            <div className="mt-4 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-caption-1-medium text-text-secondary">Prompt Instruction</Label>
                <span className="text-caption-2-medium text-text-tertiary">Presets:</span>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-1">
                {PROMPT_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      if (!name) setName(preset.label)
                      setPrompt(preset.prompt)
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-border-button-default bg-background-secondary-default px-2.5 py-1 text-caption-2-medium text-text-secondary hover:border-accent-500/40 hover:bg-background-secondary-hover hover:text-text-primary transition-all"
                  >
                    <RiSparklingLine className="size-3 text-accent-500" />
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>

              <Textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Enter prompt instructions for the agent to execute on trigger..."
                className="min-h-28 rounded-xl border-border-button-default bg-background-secondary-default text-body-medium focus-visible:bg-background-primary-default"
              />
            </div>

            <div className="mt-4 flex items-center justify-end gap-2 border-t border-separator-border/60 pt-3">
              <Button type="button" size="sm" variant="ghost" onClick={resetDraft}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!name.trim()} className="gap-1 shadow-xs">
                <RiCheckLine className="size-4" />
                <span>{editingId ? "Save changes" : "Create automation"}</span>
              </Button>
            </div>
          </form>
        ) : null}

        {/* Empty State */}
        {visibleAutomations.length === 0 && !draftOpen ? (
          <div className="flex min-h-[22rem] flex-col items-center justify-center rounded-2xl border border-dashed border-border-button-default bg-background-secondary-default/50 px-6 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-accent-500/10 text-accent-500 shadow-xs">
              <RiRobot2Line className="size-6" />
            </div>
            <h3 className="mt-4 text-headline-medium font-semibold text-text-primary">
              {automations.length === 0 ? "No automations configured" : "No matching automations"}
            </h3>
            <p className="mt-1.5 max-w-md text-body-medium text-text-secondary">
              {automations.length === 0
                ? "Create automated agent jobs to rerun prompt workflows on command or whenever files are saved in your workspace."
                : "Try adjusting your search query or filter to find what you're looking for."}
            </p>
            {automations.length === 0 ? (
              <Button
                size="sm"
                onClick={() => setDraftOpen(true)}
                className="mt-5 gap-1.5 shadow-xs"
              >
                <RiAddLine className="size-4" />
                <span>Create first automation</span>
              </Button>
            ) : null}
          </div>
        ) : null}

        {/* Automations List / Bento Cards */}
        {visibleAutomations.length > 0 ? (
          <div className="grid gap-3.5">
            {visibleAutomations.map((automation) => (
              <article
                key={automation.id}
                className={cx(
                  "group relative flex flex-col justify-between rounded-2xl border p-4.5 transition-all shadow-xs",
                  automation.enabled
                    ? "border-border-button-default bg-background-primary-default hover:border-accent-500/40 hover:shadow-md"
                    : "border-border-button-default/60 bg-background-secondary-default/40 opacity-75"
                )}
              >
                {/* Card Top: Title, Trigger badge, Toggle switch, Actions */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={cx(
                        "flex size-9 shrink-0 items-center justify-center rounded-xl border shadow-xs",
                        automation.trigger === "on_save"
                          ? "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "border-accent-500/20 bg-accent-500/10 text-accent-600 dark:text-accent-400"
                      )}
                    >
                      {automation.trigger === "on_save" ? (
                        <RiSaveLine className="size-4.5" />
                      ) : (
                        <RiPlayCircleLine className="size-4.5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="truncate text-body-medium font-semibold text-text-primary">
                          {automation.name}
                        </h4>
                        <TriggerBadge trigger={automation.trigger} />
                        {!automation.enabled ? (
                          <span className="rounded-md bg-background-tertiary-default px-1.5 py-0.5 text-[11px] font-medium text-text-tertiary">
                            Disabled
                          </span>
                        ) : null}
                      </div>
                      <span className="text-[11px] font-mono text-text-tertiary">
                        ID: {automation.id.slice(0, 12)}...
                      </span>
                    </div>
                  </div>

                  {/* Actions right */}
                  <div className="flex shrink-0 items-center gap-1.5">
                    <div className="flex items-center gap-1.5 mr-2">
                      <span className="text-caption-2-medium text-text-secondary">
                        {automation.enabled ? "Active" : "Off"}
                      </span>
                      <Switch
                        checked={automation.enabled}
                        onCheckedChange={(checked) => void toggleEnabled(automation, checked)}
                        aria-label={automation.enabled ? "Disable automation" : "Enable automation"}
                      />
                    </div>

                    <Button
                      size="icon-sm"
                      variant="ghost"
                      title="Edit automation"
                      onClick={() => startEdit(automation)}
                    >
                      <RiEditLine className="size-4" />
                    </Button>

                    <Button
                      size="icon-sm"
                      variant="ghost"
                      title="Delete automation"
                      className="text-text-tertiary hover:text-rose-500"
                      onClick={() => void removeAutomation(automation.id)}
                    >
                      <RiDeleteBinLine className="size-4" />
                    </Button>
                  </div>
                </div>

                {/* Card Prompt Box */}
                <div className="mt-3 relative rounded-xl border border-separator-border/70 bg-background-secondary-default p-3">
                  <p className="font-mono text-caption-1-medium text-text-secondary leading-relaxed line-clamp-3">
                    {automation.prompt || "No prompt instruction specified."}
                  </p>

                  {automation.prompt ? (
                    <button
                      type="button"
                      title="Copy prompt"
                      onClick={() => handleCopyPrompt(automation.id, automation.prompt)}
                      className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md border border-border-button-default bg-background-primary-default px-2 py-1 text-[11px] text-text-secondary hover:text-text-primary shadow-xs transition-colors"
                    >
                      {copiedId === automation.id ? (
                        <>
                          <RiCheckLine className="size-3 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <RiClipboardLine className="size-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </SecondaryPageShell>
  )
}

function TriggerBadge({ trigger }: { trigger: AutomationTrigger }) {
  if (trigger === "on_save") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
        <RiFlashlightLine className="size-3" />
        On Save
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-accent-500/20 bg-accent-500/10 px-2 py-0.5 text-[11px] font-medium text-accent-600 dark:text-accent-400">
      <RiCursorLine className="size-3" />
      Manual
    </span>
  )
}

