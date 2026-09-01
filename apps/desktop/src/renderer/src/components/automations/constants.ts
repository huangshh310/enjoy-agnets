/**
 * Automations 模版与筛选类型。
 */
import type { AutomationTrigger } from "@enjoy-agents/ipc-contract"

export type AutomationFilter = "all" | "manual" | "on_save"

export type AutomationTemplate = {
  id: string
  name: string
  trigger: AutomationTrigger
  category: string
  prompt: string
  badge: string
}

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    id: "tpl-diffs",
    name: "Review Git Diffs on Save",
    trigger: "on_save",
    category: "Code Quality",
    prompt:
      "Inspect the latest uncommitted changes in the workspace whenever files are saved and summarize risk, security concerns, and potential regressions.",
    badge: "Continuous Review"
  },
  {
    id: "tpl-todos",
    name: "Scan TODOs & Security Smells",
    trigger: "on_save",
    category: "Debt Tracker",
    prompt:
      "Scan recently edited files for TODO, FIXME, or HACK comments and security anti-patterns, generating an actionable summary.",
    badge: "Auto Audit"
  },
  {
    id: "tpl-typecheck",
    name: "Typecheck & Linter Fixer",
    trigger: "manual",
    category: "Diagnostics",
    prompt:
      "Run project typecheck, identify all type mismatches or syntax anomalies, and provide ready-to-apply patch diffs.",
    badge: "One-Click Diagnostic"
  },
  {
    id: "tpl-commit-notes",
    name: "Conventional Commit Notes",
    trigger: "manual",
    category: "VCS & Release",
    prompt:
      "Summarize recent uncommitted changes into structured Conventional Commits notes formatted for changelogs.",
    badge: "Smart Changelog"
  }
]
