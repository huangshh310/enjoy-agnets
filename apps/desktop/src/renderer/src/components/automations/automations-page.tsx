/**
 * Automations 页：模版、草稿表单、已配置列表。
 */
import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { RiAddLine, RiCursorLine, RiFlashlightLine, RiSaveLine, RiStackLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import type { Automation, AutomationTrigger } from "@enjoy-agents/ipc-contract"
import { SecondaryPageShell } from "@renderer/components/app-pages/secondary-page-shell"
import { getIde, hasIde } from "@renderer/lib/ide"
import { AutomationList } from "./components/automation-list"
import { AutomationDraftForm } from "./components/draft-form"
import { AutomationTemplatesGrid } from "./components/templates-grid"
import { type AutomationFilter, type AutomationTemplate } from "./constants"

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

  async function enableTemplate(tpl: AutomationTemplate) {
    if (!hasIde()) return
    await getIde().automations.upsert({
      name: tpl.name,
      prompt: tpl.prompt,
      trigger: tpl.trigger,
      enabled: true
    })
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
    await getIde().automations.remove({ id })
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
      <div className="flex flex-col gap-7">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-accent-500/10 text-accent-500 shadow-xs ring-1 ring-accent-500/20">
                <RiFlashlightLine className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-title-3-semibold text-text-primary">Automations & Smart Triggers</h1>
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Background Hooks
                  </span>
                </div>
                <p className="mt-0.5 text-caption-1-medium text-text-secondary">
                  Repeatable AI tasks triggered automatically on file save or manually with quick commands.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!draftOpen ? (
              <Button size="sm" onClick={() => setDraftOpen(true)} className="gap-1.5 shadow-xs">
                <RiAddLine className="size-4" />
                <span>New Automation</span>
              </Button>
            ) : null}
          </div>
        </header>
        <AutomationTemplatesGrid automations={automations} onEnable={(tpl) => void enableTemplate(tpl)} />
        {draftOpen ? (
          <AutomationDraftForm
            editingId={editingId}
            name={name}
            prompt={prompt}
            trigger={trigger}
            onNameChange={setName}
            onPromptChange={setPrompt}
            onTriggerChange={setTrigger}
            onCancel={resetDraft}
            onSubmit={() => void saveAutomation()}
          />
        ) : null}
        <AutomationList
          automations={visibleAutomations}
          totalCount={automations.length}
          draftOpen={draftOpen}
          copiedId={copiedId}
          onToggle={(item, enabled) => void toggleEnabled(item, enabled)}
          onEdit={(item) => {
            setEditingId(item.id)
            setName(item.name)
            setPrompt(item.prompt)
            setTrigger(item.trigger)
            setDraftOpen(true)
          }}
          onRemove={(id) => void removeAutomation(id)}
          onCopyPrompt={handleCopyPrompt}
        />
      </div>
    </SecondaryPageShell>
  )
}
