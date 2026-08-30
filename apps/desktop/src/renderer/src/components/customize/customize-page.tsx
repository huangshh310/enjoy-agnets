import { useEffect, useState, type ReactNode } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate, useParams } from "@tanstack/react-router"
import { RiBookOpenLine, RiFileTextLine, RiSparklingLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { SettingsSnapshot } from "@enjoy-agents/ipc-contract"
import { SecondaryPageShell } from "@renderer/components/app-pages/secondary-page-shell"
import { SettingsComingSoon } from "@renderer/components/settings/settings-row"
import { getIde, hasIde } from "@renderer/lib/ide"

const CUSTOMIZE_SECTIONS = ["instructions", "skills", "rules"] as const
export type CustomizeSectionId = (typeof CUSTOMIZE_SECTIONS)[number]

const CUSTOMIZE_NAV = [
  {
    id: "agent",
    label: "Agent",
    items: [
      {
        id: "instructions",
        label: "Instructions",
        icon: RiFileTextLine,
        keywords: ["prompt", "system", "persona"]
      },
      {
        id: "skills",
        label: "Skills",
        icon: RiSparklingLine,
        keywords: ["skill", "agents", "markdown"]
      },
      {
        id: "rules",
        label: "Rules",
        icon: RiBookOpenLine,
        keywords: ["cursor", "project", "conventions"]
      }
    ]
  }
]

export function isCustomizeSectionId(value: string): value is CustomizeSectionId {
  return (CUSTOMIZE_SECTIONS as readonly string[]).includes(value)
}

export function CustomizePage() {
  const navigate = useNavigate()
  const params = useParams({ strict: false }) as { section?: string }
  const section: CustomizeSectionId = isCustomizeSectionId(params.section ?? "")
    ? (params.section as CustomizeSectionId)
    : "instructions"

  return (
    <SecondaryPageShell
      searchPlaceholder="Search customize..."
      groups={CUSTOMIZE_NAV}
      selectedId={section}
      onSelect={(id) => void navigate({ to: "/customize/$section", params: { section: id } })}
    >
      {section === "instructions" ? <InstructionsSection /> : null}
      {section === "skills" ? (
        <SectionFrame title="Skills">
          <SettingsComingSoon body="User skills live in the app data folder and project skills in .agents/skills. Listing and enabling them will land with the agent-core skill loader." />
        </SectionFrame>
      ) : null}
      {section === "rules" ? (
        <SectionFrame title="Rules">
          <SettingsComingSoon body="Project rules will read .cursor/rules and .agents files in the open workspace. They stay local and are injected only when a session starts." />
        </SectionFrame>
      ) : null}
    </SecondaryPageShell>
  )
}

function SectionFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-title-3-semibold text-text-primary">{title}</h1>
      {children}
    </div>
  )
}

function InstructionsSection() {
  const queryClient = useQueryClient()
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    enabled: hasIde(),
    queryFn: () => getIde().settings.get() as Promise<SettingsSnapshot>
  })
  const saved = settingsQuery.data?.preferences.customInstructions ?? ""
  const [draft, setDraft] = useQuerySyncedDraft(saved)

  async function save() {
    if (!hasIde()) return
    await getIde().settings.setPreferences({ customInstructions: draft })
    await queryClient.invalidateQueries({ queryKey: ["settings"] })
  }

  return (
    <SectionFrame title="Instructions">
      <p className="max-w-lg text-body-medium text-text-secondary">
        Always-on notes for every agent run on this machine. Kept with other preferences; the renderer never sees API keys.
      </p>
      <Textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Prefer small diffs. Do not add comments that restate the code. Ask before expanding scope."
        className="min-h-48 rounded-2xl border-border-button-default bg-background-secondary-default text-body-medium"
      />
      <div className="flex justify-end">
        <Button size="sm" disabled={draft === saved} onClick={() => void save()}>
          Save
        </Button>
      </div>
    </SectionFrame>
  )
}

function useQuerySyncedDraft(saved: string) {
  const [draft, setDraft] = useState(saved)
  useEffect(() => {
    setDraft(saved)
  }, [saved])
  return [draft, setDraft] as const
}
