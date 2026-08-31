import { useEffect, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate, useParams } from "@tanstack/react-router"
import {
  RiBookOpenLine,
  RiCheckLine,
  RiClipboardLine,
  RiCodeSSlashLine,
  RiFileTextLine,
  RiFlashlightLine,
  RiFolderLine,
  RiInformationLine,
  RiLoader4Line,
  RiSaveLine,
  RiShieldCheckLine,
  RiSparklingLine,
  RiTerminalBoxLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cx } from "@/utils/cx"
import type { SettingsSnapshot } from "@enjoy-agents/ipc-contract"
import { SecondaryPageShell } from "@renderer/components/app-pages/secondary-page-shell"
import { getIde, hasIde } from "@renderer/lib/ide"

const CUSTOMIZE_SECTIONS = ["instructions", "skills", "rules"] as const
export type CustomizeSectionId = (typeof CUSTOMIZE_SECTIONS)[number]

const CUSTOMIZE_NAV = [
  {
    id: "agent",
    label: "Agent Customization",
    items: [
      {
        id: "instructions",
        label: "Instructions",
        icon: RiFileTextLine,
        keywords: ["prompt", "system", "persona", "global"]
      },
      {
        id: "skills",
        label: "Skills Hub",
        icon: RiSparklingLine,
        keywords: ["skill", "agents", "markdown", "tools"]
      },
      {
        id: "rules",
        label: "Project Rules",
        icon: RiBookOpenLine,
        keywords: ["cursor", "project", "conventions", "agents.md"]
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
      searchPlaceholder="Search customization..."
      groups={CUSTOMIZE_NAV}
      selectedId={section}
      onSelect={(id) => void navigate({ to: "/customize/$section", params: { section: id } })}
      contentWidth="wide"
    >
      {section === "instructions" ? <InstructionsSection /> : null}
      {section === "skills" ? <SkillsSection /> : null}
      {section === "rules" ? <RulesSection /> : null}
    </SecondaryPageShell>
  )
}

// ---------------------------------------------------------------------------
// 1. Instructions Section
// ---------------------------------------------------------------------------

const INSTRUCTION_PRESETS = [
  {
    id: "minimal-diffs",
    label: "⚡ Minimal Diffs & Concise",
    text: "Focus strictly on minimal edits. Prefer small surgical diffs over large rewrites. Do not add comments that restate the code. Always run verification before declaring completion."
  },
  {
    id: "tdd-first",
    label: "🧪 TDD & Test-Driven",
    text: "Always inspect or write test suites before modifying business logic. Proactively run tests and verify zero regressions. Document test coverage in output."
  },
  {
    id: "clean-arch",
    label: "📐 Clean Architecture",
    text: "Maintain strict modular boundaries. Keep single files under 300 lines. Enforce Zod validation at IPC and API boundaries. Reject any untyped 'any' variables."
  },
  {
    id: "senior-pm-ux",
    label: "🎨 Senior PM & UI/UX Perspective",
    text: "Act from the perspective of a Senior AI Product Manager and Senior UI/UX Designer. Prioritize user-friendly flows, visual hierarchy, polished empty states, and semantic design tokens."
  }
]

function InstructionsSection() {
  const queryClient = useQueryClient()
  const [isSaving, setIsSaving] = useState(false)
  const [copiedPreset, setCopiedPreset] = useState<string | null>(null)

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    enabled: hasIde(),
    queryFn: () => getIde().settings.get() as Promise<SettingsSnapshot>
  })
  const saved = settingsQuery.data?.preferences.customInstructions ?? ""
  const [draft, setDraft] = useQuerySyncedDraft(saved)

  const isModified = draft !== saved
  const characterCount = draft.length
  const lineCount = draft.trim() ? draft.split("\n").length : 0

  async function save() {
    if (!hasIde() || isSaving) return
    setIsSaving(true)
    try {
      await getIde().settings.setPreferences({ customInstructions: draft })
      await queryClient.invalidateQueries({ queryKey: ["settings"] })
    } finally {
      setIsSaving(false)
    }
  }

  function applyPreset(preset: (typeof INSTRUCTION_PRESETS)[number]) {
    setDraft((prev) => (prev.trim() ? `${prev.trim()}\n\n${preset.text}` : preset.text))
    setCopiedPreset(preset.id)
    setTimeout(() => setCopiedPreset(null), 1500)
  }

  return (
    <div className="flex flex-col gap-7">
      {/* Header */}
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-accent-500/10 text-accent-500 shadow-xs ring-1 ring-accent-500/20">
            <RiFileTextLine className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-title-3-semibold text-text-primary">
                Global System Instructions
              </h1>
              <span className="rounded-full border border-accent-500/20 bg-accent-500/10 px-2 py-0.5 text-[10px] font-semibold text-accent-600 dark:text-accent-400">
                Always Injected
              </span>
            </div>
            <p className="mt-0.5 text-caption-1-medium text-text-secondary">
              Permanent persona rules and coding guidelines prepended to every Agent session on this device. Kept locally in SQLite preferences.
            </p>
          </div>
        </div>
      </header>

      {/* Preset Quick Chips */}
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-caption-1-medium font-semibold text-text-primary">
            Quick Persona & Behavior Presets · 常用指令快捷注入
          </span>
          <span className="text-caption-2-medium text-text-tertiary">Click to append</span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {INSTRUCTION_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              className="group flex flex-col justify-between rounded-xl border border-border-button-default bg-background-primary-default p-3 text-left shadow-xs transition-all hover:border-accent-500/40 hover:bg-background-secondary-hover/60 hover:shadow-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-caption-1-medium font-semibold text-text-primary group-hover:text-accent-500 transition-colors">
                  {preset.label}
                </span>
                {copiedPreset === preset.id ? (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    <RiCheckLine className="size-3" /> Appended
                  </span>
                ) : (
                  <span className="text-[11px] text-text-tertiary group-hover:text-text-secondary">
                    + Append
                  </span>
                )}
              </div>
              <p className="mt-1 text-[11px] text-text-secondary line-clamp-2 leading-relaxed">
                {preset.text}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Main Instructions Editor Card */}
      <section className="overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-separator-border/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-lg bg-accent-500/10 text-accent-500">
              <RiSaveLine className="size-3.5" />
            </div>
            <h3 className="text-body-medium font-semibold text-text-primary">
              Custom Prompt Instructions
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-text-tertiary">
              {characterCount} chars · {lineCount} lines
            </span>
            {isModified ? (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                Unsaved Changes
              </span>
            ) : (
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                Saved
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3.5">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="e.g. Prefer minimal surgical diffs. Do not add comments that restate the code. Always verify typecheck and unit tests before completing tasks."
            className="min-h-56 rounded-xl border-border-button-default bg-background-secondary-default font-mono text-caption-1-medium text-text-primary leading-relaxed focus-visible:bg-background-primary-default"
          />

          <div className="flex items-center justify-between border-t border-separator-border/40 pt-3">
            <div className="flex items-center gap-2 text-caption-2-medium text-text-tertiary">
              <RiInformationLine className="size-4 text-accent-500" />
              <span>Injected into the system prompt context at the start of every LLM conversation turn.</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                disabled={!isModified || isSaving}
                onClick={() => setDraft(saved)}
              >
                Reset
              </Button>
              <Button
                size="sm"
                disabled={!isModified || isSaving}
                onClick={() => void save()}
                className="gap-1.5 shadow-xs"
              >
                {isSaving ? (
                  <RiLoader4Line className="size-4 animate-spin" />
                ) : (
                  <RiCheckLine className="size-4" />
                )}
                <span>Save Instructions</span>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Best Practices Guide Card */}
      <section className="grid gap-3.5 sm:grid-cols-3">
        <div className="rounded-2xl border border-border-button-default bg-background-secondary-default/50 p-4">
          <div className="flex items-center gap-2 text-text-primary">
            <RiShieldCheckLine className="size-4 text-emerald-500" />
            <h4 className="text-caption-1-medium font-semibold">Negative Constraints</h4>
          </div>
          <p className="mt-1.5 text-[12px] text-text-secondary leading-relaxed">
            Tell the model what NOT to do (e.g. &quot;Do not mock production data&quot;, &quot;Do not run destructive rm -rf commands&quot;).
          </p>
        </div>

        <div className="rounded-2xl border border-border-button-default bg-background-secondary-default/50 p-4">
          <div className="flex items-center gap-2 text-text-primary">
            <RiCodeSSlashLine className="size-4 text-blue-500" />
            <h4 className="text-caption-1-medium font-semibold">Surgical Precision</h4>
          </div>
          <p className="mt-1.5 text-[12px] text-text-secondary leading-relaxed">
            Instruct the Agent to prefer target line replacements over rewriting entire files to minimize merge conflicts.
          </p>
        </div>

        <div className="rounded-2xl border border-border-button-default bg-background-secondary-default/50 p-4">
          <div className="flex items-center gap-2 text-text-primary">
            <RiTerminalBoxLine className="size-4 text-purple-500" />
            <h4 className="text-caption-1-medium font-semibold">Verification Gates</h4>
          </div>
          <p className="mt-1.5 text-[12px] text-text-secondary leading-relaxed">
            Require automated validation commands like <code className="font-mono text-[10px]">pnpm test</code> before declaring a task finished.
          </p>
        </div>
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 2. Skills Section (Agent Skills & Extensibility Hub)
// ---------------------------------------------------------------------------

const CURATED_SKILLS = [
  {
    id: "web-search-researcher",
    name: "Web Search & Fact Synthesis",
    category: "Research & Citations",
    badge: "Autonomous Toolchain",
    icon: RiSparklingLine,
    colorClass: "bg-blue-500/10 text-blue-500",
    description: "Performs multi-query search retrieval, deep URL content extraction, and synthesizes structured markdown reports with verifiable citations.",
    slashCommand: "/research <topic>",
    templateMarkdown: `---
name: web-search-researcher
description: Multi-step web search, deep page scraping, and citation synthesis
---
# Web Search & Fact Synthesis Skill
When user asks for external information or library docs:
1. Formulate 2-3 precise search queries using search_web tool.
2. Read primary URL documentation with read_url_content.
3. Synthesize findings with clickable markdown links.`
  },
  {
    id: "generative-ui-designer",
    name: "Generative UI & Rich Widgets",
    category: "Frontend & Visualization",
    badge: "Interactive UI",
    icon: RiCodeSSlashLine,
    colorClass: "bg-purple-500/10 text-purple-500",
    description: "Generates rich interactive React/HTML widgets, visual dashboard charts, SVG diagrams, and responsive forms directly in conversation streams.",
    slashCommand: "/chart or /ui <spec>",
    templateMarkdown: `---
name: generative-ui-designer
description: Renders interactive charts and widgets inline
---
# Generative UI Skill
When rendering data visualization or interactive elements:
1. Prefer semantic BoardUI tokens for colors.
2. Emit standalone interactive HTML/SVG components.
3. Support responsive viewport adjustments.`
  },
  {
    id: "tdd-test-synthesizer",
    name: "TDD & Test Suite Synthesizer",
    category: "Quality Assurance",
    badge: "Automated Testing",
    icon: RiShieldCheckLine,
    colorClass: "bg-emerald-500/10 text-emerald-500",
    description: "Analyzes edge cases and synthesizes unit tests, property assertions, and regression test suites with Vitest, Jest, or Node test runner.",
    slashCommand: "/test <file>",
    templateMarkdown: `---
name: tdd-test-synthesizer
description: Generates comprehensive test suites and edge cases
---
# TDD Test Synthesizer Skill
When tasked with writing tests:
1. Inspect target function signatures and corner cases.
2. Generate modular test blocks (happy path, boundary values, error throws).
3. Run test runner via run_command to verify 100% passing.`
  },
  {
    id: "security-audit-scanner",
    name: "Security Audit & SAST Scanner",
    category: "Security & Compliance",
    badge: "Vulnerability Hunter",
    icon: RiTerminalBoxLine,
    colorClass: "bg-amber-500/10 text-amber-500",
    description: "Scans repository for OWASP Top 10 vulnerabilities, leaked API tokens, unsafe shell command interpolations, and dependency CVEs.",
    slashCommand: "/audit <path>",
    templateMarkdown: `---
name: security-audit-scanner
description: Codebase security inspection and patch recommendations
---
# Security Audit Scanner Skill
When auditing code:
1. Scan for hardcoded credentials, unvalidated inputs, and shell injection.
2. Generate structured risk severity matrix (High / Med / Low).
3. Provide ready-to-apply secure refactoring diffs.`
  }
]

function SkillsSection() {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function handleCopyTemplate(id: string, markdown: string) {
    void navigator.clipboard.writeText(markdown)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="flex flex-col gap-7">
      {/* Header */}
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-accent-500/10 text-accent-500 shadow-xs ring-1 ring-accent-500/20">
            <RiSparklingLine className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-title-3-semibold text-text-primary">
                Agent Skills Hub & Capability Packs
              </h1>
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                Modular SKILL.md
              </span>
            </div>
            <p className="mt-0.5 text-caption-1-medium text-text-secondary">
              Teach your Agent specialized domain workflows, automated CLI scripts, and toolchain instructions via modular <code className="font-mono text-[11px]">SKILL.md</code> packages.
            </p>
          </div>
        </div>
      </header>

      {/* Directory Structure & Discovery Guide */}
      <section className="grid gap-3.5 sm:grid-cols-2">
        <div className="flex flex-col justify-between rounded-2xl border border-border-button-default bg-background-primary-default p-4.5 shadow-xs">
          <div>
            <div className="flex items-center gap-2 text-text-primary">
              <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                <RiFolderLine className="size-4" />
              </div>
              <div>
                <h4 className="text-caption-1-medium font-semibold">User Global Skills</h4>
                <span className="text-[10px] font-mono text-text-tertiary">~/.enjoy-agents/skills/</span>
              </div>
            </div>
            <p className="mt-2 text-[12px] text-text-secondary leading-relaxed">
              Global skills accessible across all your projects. Ideal for general-purpose research, code formatting, and generative UI widgets.
            </p>
          </div>
          <div className="mt-3 rounded-xl bg-background-secondary-default p-2 font-mono text-[11px] text-text-tertiary">
            ~/.enjoy-agents/skills/&lt;skill-name&gt;/SKILL.md
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-border-button-default bg-background-primary-default p-4.5 shadow-xs">
          <div>
            <div className="flex items-center gap-2 text-text-primary">
              <div className="flex size-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
                <RiCodeSSlashLine className="size-4" />
              </div>
              <div>
                <h4 className="text-caption-1-medium font-semibold">Workspace Project Skills</h4>
                <span className="text-[10px] font-mono text-text-tertiary">.agents/skills/</span>
              </div>
            </div>
            <p className="mt-2 text-[12px] text-text-secondary leading-relaxed">
              Project-specific domain skills committed to Git. Ideal for proprietary SDKs, internal APIs, deployment checklists, and testing standards.
            </p>
          </div>
          <div className="mt-3 rounded-xl bg-background-secondary-default p-2 font-mono text-[11px] text-text-tertiary">
            &lt;project-root&gt;/.agents/skills/&lt;skill-name&gt;/SKILL.md
          </div>
        </div>
      </section>

      {/* Featured Skills Showcase Cards */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-5 items-center justify-center rounded-md bg-accent-500/10 text-accent-500">
              <RiSparklingLine className="size-3.5" />
            </div>
            <h3 className="text-body-medium font-semibold text-text-primary">
              Featured Skill Templates · 精选技能模版库
            </h3>
          </div>
          <span className="text-caption-2-medium text-text-tertiary">
            Click to inspect & copy template
          </span>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          {CURATED_SKILLS.map((skill) => {
            const Icon = skill.icon
            const isExpanded = expandedId === skill.id
            return (
              <div
                key={skill.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-border-button-default bg-background-primary-default p-4.5 shadow-xs transition-all hover:border-accent-500/40 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className={cx("flex size-9 shrink-0 items-center justify-center rounded-xl shadow-xs", skill.colorClass)}>
                        <Icon className="size-4.5" />
                      </div>
                      <div>
                        <h4 className="text-caption-1-medium font-semibold text-text-primary group-hover:text-accent-500 transition-colors">
                          {skill.name}
                        </h4>
                        <span className="text-[10px] font-mono uppercase text-text-tertiary">
                          {skill.category}
                        </span>
                      </div>
                    </div>

                    <span className="rounded-full border border-border-button-default bg-background-secondary-default px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                      {skill.badge}
                    </span>
                  </div>

                  <p className="mt-2.5 text-[12px] text-text-secondary leading-relaxed">
                    {skill.description}
                  </p>

                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[11px] text-text-tertiary">Trigger:</span>
                    <code className="rounded-md border border-border-button-default bg-background-secondary-default px-2 py-0.5 font-mono text-[10px] font-medium text-text-primary">
                      {skill.slashCommand}
                    </code>
                  </div>

                  {/* Expanded Template Preview */}
                  {isExpanded ? (
                    <div className="mt-3 rounded-xl border border-separator-border/60 bg-background-secondary-default p-3">
                      <pre className="font-mono text-[11px] text-text-secondary whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-48">
                        {skill.templateMarkdown}
                      </pre>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-separator-border/60 pt-3">
                  <button
                    type="button"
                    onClick={() => setExpandedId((cur) => (cur === skill.id ? null : skill.id))}
                    className="text-[11px] font-medium text-text-tertiary hover:text-text-primary transition-colors"
                  >
                    {isExpanded ? "Collapse Anatomy" : "View SKILL.md Spec"}
                  </button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyTemplate(skill.id, skill.templateMarkdown)}
                    className="gap-1 h-7 px-2.5 text-caption-2-medium shrink-0 shadow-xs"
                  >
                    {copiedId === skill.id ? (
                      <>
                        <RiCheckLine className="size-3 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <RiClipboardLine className="size-3" />
                        <span>Copy SKILL.md</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Anatomy Guide Card */}
      <section className="overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs">
        <div className="flex items-center gap-2 border-b border-separator-border/60 pb-3">
          <div className="flex size-6 items-center justify-center rounded-lg bg-accent-500/10 text-accent-500">
            <RiCodeSSlashLine className="size-3.5" />
          </div>
          <h3 className="text-body-medium font-semibold text-text-primary">
            Skill Directory Anatomy & Specification · 技能包规范
          </h3>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-[16rem_minmax(0,1fr)]">
          <div className="rounded-xl border border-separator-border/60 bg-background-secondary-default p-3 font-mono text-[11px] text-text-secondary leading-relaxed">
            <div>📂 my-custom-skill/</div>
            <div className="pl-4 text-accent-600 dark:text-accent-400">├── 📄 SKILL.md</div>
            <div className="pl-4">├── 📁 scripts/</div>
            <div className="pl-8 text-text-tertiary">└── 📜 helper.js</div>
            <div className="pl-4">└── 📁 references/</div>
            <div className="pl-8 text-text-tertiary">└── 📄 api-spec.md</div>
          </div>

          <div className="flex flex-col justify-center gap-2 text-caption-1-medium text-text-secondary">
            <p>
              Every skill package is a standalone directory containing a mandatory <code className="font-mono text-accent-600 dark:text-accent-400 font-semibold">SKILL.md</code> file with YAML frontmatter (<code className="font-mono text-[11px]">name</code>, <code className="font-mono text-[11px]">description</code>).
            </p>
            <p className="text-[12px] text-text-tertiary leading-relaxed">
              When loaded by the Agent Runtime, the skill automatically registers slash commands, subagents, and domain instructions into context on demand.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 3. Rules Section (Project Guidelines & AGENTS.md / Cursor Rules)
// ---------------------------------------------------------------------------

const PROJECT_RULES = [
  {
    id: "clean-diffs",
    title: "Clean Code & Surgical Diffs",
    targetFile: "AGENTS.md / .cursor/rules/clean-code.mdc",
    category: "Diff Hygiene",
    badge: "High Priority",
    description: "Enforces small atomic modifications, zero dead code, self-documenting identifiers, and keeping files under 300 lines.",
    content: `# Clean Code & Surgical Diffs Rule
- Make single, focused contiguous edits rather than rewriting full files.
- Keep file lengths strictly under 300 lines; extract helper modules if exceeded.
- Preserve existing comments and docstrings unless explicitly asked.
- Avoid introducing unformatted lines or redundant logging statements.`
  },
  {
    id: "strict-ts-zod",
    title: "Strict TypeScript & Zod Schemas",
    targetFile: ".cursor/rules/typescript.mdc",
    category: "Type Safety",
    badge: "Contract Invariant",
    description: "Rejects 'any' casts, mandates strict null checks, and enforces Zod runtime schema parsing across all IPC boundaries.",
    content: `# Strict TypeScript & Zod Rule
- Never use 'any' or untyped casts; define explicit TypeScript types.
- All IPC input parameters and return payloads must pass Zod schema validation.
- Group types and constants into *.types.ts and constants.ts rather than component bodies.`
  },
  {
    id: "boardui-tokens",
    title: "BoardUI Semantic Design Tokens",
    targetFile: ".cursor/rules/ui-tokens.mdc",
    category: "Visual System",
    badge: "UI Standard",
    description: "Strictly disallows raw hex color codes and arbitrary gray scales. Requires BoardUI semantic tokens and Remixicon chrome icons.",
    content: `# BoardUI Semantic Design Tokens Rule
- Never use raw hex colors or arbitrary Tailwind gray scales (e.g. gray-500).
- Always use BoardUI tokens: bg-background-primary-default, bg-background-secondary-default, text-text-primary, accent-500.
- Chrome icons must strictly import from '@remixicon/react'.`
  },
  {
    id: "tdd-verification",
    title: "Test-First Verification Gate",
    targetFile: "AGENTS.md / .cursor/rules/testing.mdc",
    category: "QA & Verification",
    badge: "Quality Gate",
    description: "Mandates running 'pnpm test' and 'pnpm typecheck' before declaring tasks complete to prevent regressions.",
    content: `# Test-First Verification Gate Rule
- Before reporting completion, run 'pnpm typecheck' and relevant test suites.
- Any regression or type mismatch must be diagnosed and resolved immediately.
- Summarize verification results clearly in the final walkthrough report.`
  }
]

function RulesSection() {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  function handleCopyRule(id: string, text: string) {
    void navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="flex flex-col gap-7">
      {/* Header */}
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-accent-500/10 text-accent-500 shadow-xs ring-1 ring-accent-500/20">
            <RiBookOpenLine className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-title-3-semibold text-text-primary">
                Project Rules & Guidelines
              </h1>
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                Context Invariants
              </span>
            </div>
            <p className="mt-0.5 text-caption-1-medium text-text-secondary">
              Workspace coding conventions, architectural invariants, and style guides read directly from <code className="font-mono text-[11px]">AGENTS.md</code> and <code className="font-mono text-[11px]">.cursor/rules/*.mdc</code>.
            </p>
          </div>
        </div>
      </header>

      {/* Rules Hierarchy & Cascade Cascade Order */}
      <section className="overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs">
        <div className="flex items-center gap-2 border-b border-separator-border/60 pb-3">
          <div className="flex size-6 items-center justify-center rounded-lg bg-accent-500/10 text-accent-500">
            <RiFlashlightLine className="size-3.5" />
          </div>
          <h3 className="text-body-medium font-semibold text-text-primary">
            Rule Resolution Cascade · 规则注入优先级层级
          </h3>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col rounded-xl border border-border-button-default bg-background-secondary-default/50 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase text-accent-600 dark:text-accent-400">
                Layer 1 · Global
              </span>
              <span className="rounded-full bg-accent-500/10 px-1.5 py-0.2 text-[9px] font-medium text-accent-600 dark:text-accent-400">
                User Device
              </span>
            </div>
            <h4 className="mt-1 text-caption-1-medium font-semibold text-text-primary">
              Global Instructions
            </h4>
            <p className="mt-1 text-[11px] text-text-secondary leading-relaxed">
              Stored in local SQLite preferences. Prepended across every project.
            </p>
          </div>

          <div className="flex flex-col rounded-xl border border-accent-500/30 bg-accent-500/5 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase text-accent-600 dark:text-accent-400">
                Layer 2 · Workspace
              </span>
              <span className="rounded-full bg-accent-500/15 px-1.5 py-0.2 text-[9px] font-semibold text-accent-600 dark:text-accent-400">
                Repository
              </span>
            </div>
            <h4 className="mt-1 text-caption-1-medium font-semibold text-text-primary">
              AGENTS.md / CLAUDE.md
            </h4>
            <p className="mt-1 text-[11px] text-text-secondary leading-relaxed">
              Root repository contract defining team architecture and guidelines.
            </p>
          </div>

          <div className="flex flex-col rounded-xl border border-border-button-default bg-background-secondary-default/50 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase text-accent-600 dark:text-accent-400">
                Layer 3 · Contextual
              </span>
              <span className="rounded-full bg-background-secondary-default px-1.5 py-0.2 text-[9px] font-medium text-text-secondary">
                File Paths
              </span>
            </div>
            <h4 className="mt-1 text-caption-1-medium font-semibold text-text-primary">
              .cursor/rules/*.mdc
            </h4>
            <p className="mt-1 text-[11px] text-text-secondary leading-relaxed">
              Glob-matched rules triggered dynamically when editing specific file paths.
            </p>
          </div>
        </div>
      </section>

      {/* Popular Project Rule Templates */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-5 items-center justify-center rounded-md bg-accent-500/10 text-accent-500">
              <RiBookOpenLine className="size-3.5" />
            </div>
            <h3 className="text-body-medium font-semibold text-text-primary">
              Popular Project Rule Templates · 常用规范模版
            </h3>
          </div>
          <span className="text-caption-2-medium text-text-tertiary">
            1-click copy into your repository
          </span>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          {PROJECT_RULES.map((rule) => (
            <div
              key={rule.id}
              className="group relative flex flex-col justify-between rounded-2xl border border-border-button-default bg-background-primary-default p-4.5 shadow-xs transition-all hover:border-accent-500/40 hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-caption-1-medium font-semibold text-text-primary group-hover:text-accent-500 transition-colors">
                      {rule.title}
                    </h4>
                    <span className="text-[10px] font-mono text-text-tertiary">
                      Target: {rule.targetFile}
                    </span>
                  </div>

                  <span className="rounded-full border border-border-button-default bg-background-secondary-default px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                    {rule.badge}
                  </span>
                </div>

                <p className="mt-2 text-[12px] text-text-secondary leading-relaxed">
                  {rule.description}
                </p>

                {/* Code Snippet Box */}
                <div className="mt-3 rounded-xl border border-separator-border/60 bg-background-secondary-default p-3">
                  <pre className="font-mono text-[11px] text-text-secondary whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                    {rule.content}
                  </pre>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-separator-border/60 pt-3">
                <span className="text-[11px] text-text-tertiary">
                  Ready to paste into workspace
                </span>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopyRule(rule.id, rule.content)}
                  className="gap-1 h-7 px-2.5 text-caption-2-medium shrink-0 shadow-xs"
                >
                  {copiedId === rule.id ? (
                    <>
                      <RiCheckLine className="size-3 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <RiClipboardLine className="size-3" />
                      <span>Copy Rule Markdown</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function useQuerySyncedDraft(saved: string) {
  const [draft, setDraft] = useState(saved)
  useEffect(() => {
    setDraft(saved)
  }, [saved])
  return [draft, setDraft] as const
}

