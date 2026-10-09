/**
 * Global System Instructions 设置视图：
 * 采用专业桌面 IDE 风格，管理全局注入给 Agent 的系统级 Persona 与行为指令。
 */
import { useEffect, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  RiBookOpenLine,
  RiCheckLine,
  RiFileTextLine,
  RiInformationLine,
  RiLoader4Line,
  RiSparklingLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import type { SettingsSnapshot } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { getIde, hasIde } from "@renderer/lib/ide"
import { getInstructionPresets, type InstructionPreset } from "../constants/customize-presets"
import { RulesSection } from "./rules/rules-section"

export function InstructionsSection(props: { defaultTab?: "instructions" | "rules" }) {
  const t = useT()
  const [activeTab, setActiveTab] = useState<"instructions" | "rules">(props.defaultTab ?? "instructions")
  const queryClient = useQueryClient()
  const [isSaving, setIsSaving] = useState(false)
  const [copiedPreset, setCopiedPreset] = useState<string | null>(null)
  const presets = getInstructionPresets(t)

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    enabled: hasIde(),
    queryFn: () => getIde().settings.get() as Promise<SettingsSnapshot>
  })
  const saved = settingsQuery.data?.preferences.customInstructions ?? ""
  const [draft, setDraft] = useState(saved)

  useEffect(() => {
    setDraft(saved)
  }, [saved])

  const isModified = draft !== saved
  const characterCount = draft.length
  const lineCount = draft.trim() ? draft.split("\n").length : 0

  async function handleSave() {
    if (!hasIde() || isSaving) return
    setIsSaving(true)
    try {
      await getIde().settings.setPreferences({ customInstructions: draft })
      await queryClient.invalidateQueries({ queryKey: ["settings"] })
    } finally {
      setIsSaving(false)
    }
  }

  function handleApplyPreset(preset: InstructionPreset) {
    setDraft((prev) => (prev.trim() ? `${prev.trim()}\n\n${preset.text}` : preset.text))
    setCopiedPreset(preset.id)
    setTimeout(() => setCopiedPreset(null), 1500)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between pb-3 border-b border-separator-border/70 flex-wrap gap-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-title-3-semibold text-text-primary tracking-tight">
              {activeTab === "instructions" ? t("studio.instructions.title") : t("studio.customize.projectRules")}
            </h2>
            <span className="rounded bg-accent-500/10 px-1.5 py-0.5 text-caption-2-medium font-mono font-medium text-accent-600 dark:text-accent-400">
              {activeTab === "instructions" ? t("studio.instructions.badge") : "Rules"}
            </span>
          </div>
          <p className="text-caption-2-medium text-text-tertiary">
            {activeTab === "instructions"
              ? t("studio.instructions.desc")
              : "项目规范与工作区指令（如 .cursorrules、.enjoyrules、AGENTS.md）。"}
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-separator-border/80 bg-background-secondary-default/50 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("instructions")}
            className={cx(
              "flex items-center gap-1.5 rounded-lg px-3 py-1 text-caption-1-medium transition-all cursor-pointer",
              activeTab === "instructions"
                ? "bg-background-primary-default text-text-primary font-semibold shadow-xs"
                : "text-text-tertiary hover:text-text-primary"
            )}
          >
            <RiFileTextLine className="size-3.5" />
            <span>{t("studio.customize.instructions")}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rules")}
            className={cx(
              "flex items-center gap-1.5 rounded-lg px-3 py-1 text-caption-1-medium transition-all cursor-pointer",
              activeTab === "rules"
                ? "bg-background-primary-default text-text-primary font-semibold shadow-xs"
                : "text-text-tertiary hover:text-text-primary"
            )}
          >
            <RiBookOpenLine className="size-3.5" />
            <span>{t("studio.customize.projectRules")}</span>
          </button>
        </div>
      </div>

      {activeTab === "rules" ? (
        <RulesSection />
      ) : (
        <>

      <div className="flex flex-col gap-2 rounded-xl border border-separator-border/60 bg-background-secondary-default/30 p-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-caption-2-medium font-medium text-text-secondary">
            <RiSparklingLine className="size-3 text-accent-500" />
            <span>{t("studio.instructions.presetsHint")}</span>
          </div>
          <span className="text-caption-2-regular text-text-tertiary">{t("studio.instructions.clickToAppend")}</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-separator-border/80 bg-background-primary-default px-2.5 py-1 text-caption-2-regular text-text-secondary hover:text-text-primary hover:border-separator-border transition-all shadow-2xs"
            >
              <span className="font-medium text-text-primary">{preset.tag}</span>
              <span className="text-caption-2-regular text-text-tertiary">{preset.label}</span>
              {copiedPreset === preset.id ? (
                <RiCheckLine className="size-3 text-state-success-text ml-0.5" />
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-caption-2-medium px-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-caption-2-regular text-text-tertiary">
              {t("studio.instructions.stats", { chars: characterCount, lines: lineCount })}
            </span>
            {isModified ? (
              <span className="rounded px-1.5 py-0.2 text-caption-2-medium font-medium bg-status-yellow-background/10 text-status-yellow-text dark:text-status-yellow-text">
                {t("studio.instructions.unsaved")}
              </span>
            ) : (
              <span className="rounded px-1.5 py-0.2 text-caption-2-medium font-medium bg-state-success-text/10 text-state-success-text dark:text-state-success-text">
                {t("studio.instructions.synced")}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={!isModified || isSaving}
              onClick={() => setDraft(saved)}
              className="h-7 text-caption-2-medium text-text-secondary"
            >
              {t("studio.instructions.discard")}
            </Button>
            <Button
              size="sm"
              disabled={!isModified || isSaving}
              onClick={() => void handleSave()}
              className="gap-1.5 h-7 text-caption-2-medium shadow-xs"
            >
              {isSaving ? (
                <RiLoader4Line className="size-3 animate-spin" />
              ) : (
                <RiCheckLine className="size-3" />
              )}
              <span>{t("studio.instructions.save")}</span>
            </Button>
          </div>
        </div>

        <div className="relative flex rounded-xl border border-separator-border/80 bg-background-secondary-default/40 overflow-hidden font-mono text-caption-1-regular leading-relaxed shadow-xs">
          <div className="select-none border-r border-separator-border/50 bg-background-secondary-default/70 px-2.5 py-3 text-right text-caption-2-regular text-text-tertiary font-mono">
            {Array.from({ length: Math.max(lineCount, 14) }).map((_, i) => (
              <div key={i} className="leading-relaxed">
                {i + 1}
              </div>
            ))}
          </div>

          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
            placeholder={t("studio.instructions.placeholder")}
            className="flex-1 resize-none bg-transparent p-3 text-text-primary focus-visible:outline-none min-h-[380px] leading-relaxed"
          />
        </div>

        <div className="flex items-center gap-1.5 text-caption-2-regular text-text-tertiary px-1">
          <RiInformationLine className="size-3.5 shrink-0" />
          <span>{t("studio.instructions.helper")}</span>
        </div>
      </div>
    </>
  )}
</div>
  )
}
