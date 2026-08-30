import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  RiAddLine,
  RiCursorLine,
  RiDeleteBinLine,
  RiPlayLine,
  RiSaveLine,
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

export function AutomationsPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<AutomationFilter>("all")
  const [query, setQuery] = useState("")
  const [draftOpen, setDraftOpen] = useState(false)
  const [name, setName] = useState("")
  const [prompt, setPrompt] = useState("")
  const [trigger, setTrigger] = useState<AutomationTrigger>("manual")

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
            label: "All",
            icon: RiStackLine,
            keywords: ["job", "library"],
            meta: String(automations.length)
          },
          {
            id: "manual",
            label: "Manual",
            icon: RiCursorLine,
            keywords: ["run", "prompt"],
            meta: String(manualCount)
          },
          {
            id: "on_save",
            label: "On save",
            icon: RiSaveLine,
            keywords: ["file", "watch", "hook"],
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
    setName("")
    setPrompt("")
    setTrigger("manual")
    setDraftOpen(false)
  }

  async function createAutomation() {
    if (!name.trim() || !hasIde()) return
    await getIde().automations.upsert({
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

  const emptyCopy =
    automations.length === 0
      ? {
          title: "No automations",
          body: "Create a job to rerun a prompt without opening a new chat each time. Manual jobs wait for you. On save waits for the file watcher."
        }
      : {
          title: "Nothing in this view",
          body: "No jobs match the current filter or search."
        }

  return (
    <SecondaryPageShell
      searchPlaceholder="Search jobs..."
      groups={groups}
      selectedId={filter}
      onSelect={(id) => setFilter(id as AutomationFilter)}
      contentWidth="stage"
      filterNav={false}
      searchValue={query}
      onSearchChange={setQuery}
    >
      <header className="flex shrink-0 items-start gap-3">
        <div className="min-w-0 flex-1 pt-0.5">
          <h1 className="text-title-3-semibold text-text-primary">Automations</h1>
          <p className="mt-0.5 text-caption-1-medium text-text-tertiary">
            {automations.length === 0
              ? "Repeatable agent jobs on this machine"
              : `${visibleAutomations.length} of ${automations.length} jobs`}
          </p>
        </div>
        <Button size="sm" onClick={() => setDraftOpen(true)}>
          <RiAddLine className="size-4" aria-hidden />
          New
        </Button>
      </header>

      <div className="mt-5 flex min-h-0 flex-1 flex-col gap-3">
        {draftOpen ? (
          <form
            className="rounded-[28px] bg-background-tertiary-default p-4"
            onSubmit={(event) => {
              event.preventDefault()
              void createAutomation()
            }}
          >
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
              <div className="flex flex-col gap-1.5">
                <Label className="text-caption-1-medium text-text-secondary">Name</Label>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Review diffs"
                  className="bg-background-primary-default"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-caption-1-medium text-text-secondary">Trigger</Label>
                <Select value={trigger} onValueChange={(value) => setTrigger(value as AutomationTrigger)}>
                  <SelectTrigger className="h-9 w-full rounded-2lg bg-background-primary-default">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="on_save">On save</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-1.5">
              <Label className="text-caption-1-medium text-text-secondary">Prompt</Label>
              <Textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Inspect the latest uncommitted changes and summarize risk."
                className="min-h-24 rounded-2xl border-transparent bg-background-primary-default text-body-medium shadow-none"
              />
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={resetDraft}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!name.trim()}>
                Save job
              </Button>
            </div>
          </form>
        ) : null}

        {visibleAutomations.length === 0 && !draftOpen ? (
          <div className="flex min-h-[22rem] flex-col justify-start rounded-[28px] bg-background-secondary-default px-6 py-8">
            <p className="text-headline-medium text-text-primary">{emptyCopy.title}</p>
            <p className="mt-2 max-w-md text-body-medium text-text-secondary">{emptyCopy.body}</p>
          </div>
        ) : null}

        {visibleAutomations.length > 0 ? (
          <div className="overflow-hidden rounded-[28px] bg-background-secondary-default p-1.5">
            {visibleAutomations.map((automation) => (
              <article
                key={automation.id}
                className={cx(
                  "flex items-start gap-3 rounded-2xl px-3.5 py-3",
                  "hover:bg-background-primary-hover"
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-body-medium text-text-primary">{automation.name}</p>
                    <TriggerChip trigger={automation.trigger} />
                    {automation.enabled ? null : (
                      <span className="text-caption-1-medium text-text-tertiary">Off</span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-caption-1-medium text-text-secondary">
                    {automation.prompt || "No prompt yet."}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Switch
                    checked={automation.enabled}
                    onCheckedChange={(checked) => void toggleEnabled(automation, checked)}
                    aria-label={automation.enabled ? "Disable automation" : "Enable automation"}
                  />
                  <Button size="icon-sm" variant="ghost" aria-label="Run" disabled title="Run is not wired yet">
                    <RiPlayLine className="size-4" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Delete"
                    onClick={() => void removeAutomation(automation.id)}
                  >
                    <RiDeleteBinLine className="size-4" />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </SecondaryPageShell>
  )
}

function TriggerChip({ trigger }: { trigger: AutomationTrigger }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-background-tertiary-default px-2 py-0.5 text-caption-1-medium text-text-secondary">
      {trigger === "manual" ? "Manual" : "On save"}
    </span>
  )
}
