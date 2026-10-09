/**
 * 规则模板：复制正文，或写入 Cursor MDC / AGENTS.md。
 */
import { RiAddLine, RiCheckLine, RiClipboardLine, RiLoader4Line, RiSparklingLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import type { AgentRuleKind } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { getProjectRules, type ProjectRulePreset } from "../../constants/customize-presets"

export function RulesTemplates(props: {
  copiedId: string | null
  isWriting: string | null
  onCopy: (id: string, text: string) => void
  onWrite: (preset: ProjectRulePreset, kind: AgentRuleKind) => void
}) {
  const t = useT()
  const presets = getProjectRules(t)
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-caption-1-medium font-semibold text-text-primary">
          <RiSparklingLine className="size-3.5 text-accent-500" />
          <span>{t("studio.rules.templatesTitle")}</span>
        </div>
        <span className="text-caption-2-regular text-text-tertiary">{t("studio.rules.templatesHint")}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {presets.map((preset) => (
          <RuleTemplateCard
            key={preset.id}
            preset={preset}
            copiedId={props.copiedId}
            isWriting={props.isWriting}
            onCopy={props.onCopy}
            onWrite={props.onWrite}
          />
        ))}
      </div>
    </section>
  )
}

function RuleTemplateCard(props: {
  preset: ProjectRulePreset
  copiedId: string | null
  isWriting: string | null
  onCopy: (id: string, text: string) => void
  onWrite: (preset: ProjectRulePreset, kind: AgentRuleKind) => void
}) {
  const { preset } = props
  const writingMdc = props.isWriting === `${preset.id}:cursor_mdc`
  const writingAgents = props.isWriting === `${preset.id}:agents_md`
  return (
    <div className="flex flex-col justify-between rounded-xl border border-separator-border/70 bg-background-primary-default p-3.5 shadow-2xs transition-all hover:border-separator-border">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="text-caption-1-medium font-semibold text-text-primary">{preset.title}</h4>
            <span className="text-caption-2-regular font-mono text-text-tertiary">{preset.category}</span>
          </div>
          <span className="rounded bg-background-secondary-default px-1.5 py-0.5 text-caption-2-regular font-mono text-text-secondary">
            {preset.badge}
          </span>
        </div>
        <p className="mt-2 text-caption-2-regular text-text-secondary leading-relaxed line-clamp-2">{preset.description}</p>
        <div className="mt-2 rounded bg-background-secondary-default/60 p-2 font-mono text-caption-2-regular text-text-secondary whitespace-pre-wrap leading-relaxed max-h-24 overflow-y-auto">
          {preset.content}
        </div>
      </div>
      <RuleTemplateActions
        preset={preset}
        copiedId={props.copiedId}
        isWriting={props.isWriting}
        writingMdc={writingMdc}
        writingAgents={writingAgents}
        onCopy={props.onCopy}
        onWrite={props.onWrite}
      />
    </div>
  )
}

function RuleTemplateActions(props: {
  preset: ProjectRulePreset
  copiedId: string | null
  isWriting: string | null
  writingMdc: boolean
  writingAgents: boolean
  onCopy: (id: string, text: string) => void
  onWrite: (preset: ProjectRulePreset, kind: AgentRuleKind) => void
}) {
  const t = useT()
  const { preset } = props
  return (
    <div className="mt-3.5 flex items-center justify-between border-t border-separator-border/40 pt-2.5 gap-2">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => props.onCopy(preset.id, preset.content)}
        className="h-6.5 px-2 text-caption-2-regular text-text-secondary"
      >
        {props.copiedId === preset.id ? (
          <>
            <RiCheckLine className="size-3 text-state-success-text" />
            <span>{t("common.copied")}</span>
          </>
        ) : (
          <>
            <RiClipboardLine className="size-3" />
            <span>{t("studio.copyCode")}</span>
          </>
        )}
      </Button>
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          disabled={Boolean(props.isWriting)}
          onClick={() => props.onWrite(preset, "cursor_mdc")}
          className="gap-1 h-6.5 px-2 text-caption-2-regular"
        >
          {props.writingMdc ? <RiLoader4Line className="size-3 animate-spin" /> : <RiAddLine className="size-3" />}
          <span>{t("studio.rules.writeMdc")}</span>
        </Button>
        <Button
          size="sm"
          disabled={Boolean(props.isWriting)}
          onClick={() => props.onWrite(preset, "agents_md")}
          className="gap-1 h-6.5 px-2 text-caption-2-regular shadow-xs"
        >
          {props.writingAgents ? <RiLoader4Line className="size-3 animate-spin" /> : <RiCheckLine className="size-3" />}
          <span>{t("studio.rules.writeAgents")}</span>
        </Button>
      </div>
    </div>
  )
}
