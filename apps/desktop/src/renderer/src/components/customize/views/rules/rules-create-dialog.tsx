/**
 * 新建规则弹层：目标种类、名称、globs、正文。
 */
import { RiCheckLine, RiLoader4Line } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cx } from "@/utils/cx"
import type { AgentRuleKind } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { CREATE_RULE_KINDS, createKindLabel } from "./rules-kind"

export function RulesCreateDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: AgentRuleKind
  onKind: (kind: AgentRuleKind) => void
  name: string
  onName: (value: string) => void
  globs: string
  onGlobs: (value: string) => void
  description: string
  onDescription: (value: string) => void
  content: string
  onContent: (value: string) => void
  isCreating: boolean
  onSubmit: () => void
}) {
  const t = useT()
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden rounded-xl border border-separator-border/80 bg-background-primary-default shadow-xl">
        <div className="border-b border-separator-border/70 px-5 py-3.5 flex flex-col gap-0.5">
          <DialogTitle className="text-body-medium font-semibold text-text-primary">
            {t("studio.rules.createTitle")}
          </DialogTitle>
          <p className="text-caption-2-regular text-text-tertiary">{t("studio.rules.createDesc")}</p>
        </div>
        <CreateRuleFields {...props} />
        <div className="flex items-center justify-end gap-2 border-t border-separator-border/70 px-5 py-3 bg-background-secondary-default/30">
          <Button
            variant="outline"
            size="sm"
            onClick={() => props.onOpenChange(false)}
            disabled={props.isCreating}
            className="h-8 text-caption-2-medium"
          >
            {t("common.cancel")}
          </Button>
          <Button
            size="sm"
            disabled={!props.name.trim() || props.isCreating}
            onClick={props.onSubmit}
            className="gap-1.5 h-8 text-caption-2-medium shadow-xs"
          >
            {props.isCreating ? <RiLoader4Line className="size-3 animate-spin" /> : <RiCheckLine className="size-3" />}
            <span>{t("studio.rules.writeRule")}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CreateRuleFields(props: {
  kind: AgentRuleKind
  onKind: (kind: AgentRuleKind) => void
  name: string
  onName: (value: string) => void
  globs: string
  onGlobs: (value: string) => void
  description: string
  onDescription: (value: string) => void
  content: string
  onContent: (value: string) => void
}) {
  const t = useT()
  return (
    <div className="flex flex-col gap-3.5 p-5">
      <div className="flex flex-col gap-1">
        <Label className="text-caption-2-medium font-medium text-text-secondary">{t("studio.rules.targetKind")}</Label>
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-background-secondary-default/60 p-0.5">
          {CREATE_RULE_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => props.onKind(kind)}
              className={cx(
                "rounded py-1 text-caption-2-medium font-mono transition-all flex items-center justify-center font-medium",
                props.kind === kind
                  ? "bg-background-primary-default text-text-primary shadow-2xs font-semibold"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              {createKindLabel(kind)}
            </button>
          ))}
        </div>
      </div>
      <LabeledInput
        label={t("studio.rules.nameLabel")}
        value={props.name}
        onChange={props.onName}
        placeholder={t("studio.rules.namePlaceholder")}
        mono
      />
      {props.kind === "cursor_mdc" ? (
        <LabeledInput
          label={t("studio.rules.globsLabel")}
          value={props.globs}
          onChange={props.onGlobs}
          placeholder={t("studio.rules.globsPlaceholder")}
          mono
        />
      ) : null}
      <LabeledInput
        label={t("studio.rules.descLabel")}
        value={props.description}
        onChange={props.onDescription}
        placeholder={t("studio.rules.descPlaceholder")}
      />
      <div className="flex flex-col gap-1">
        <Label className="text-caption-2-medium font-medium text-text-secondary">{t("studio.rules.bodyLabel")}</Label>
        <textarea
          value={props.content}
          onChange={(e) => props.onContent(e.target.value)}
          rows={4}
          placeholder={t("studio.rules.bodyPlaceholder")}
          className="w-full font-mono text-caption-2-regular rounded-lg border border-separator-border/80 bg-background-secondary-default/40 p-2.5 text-text-primary focus-visible:outline-none"
        />
      </div>
    </div>
  )
}

function LabeledInput(props: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  mono?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-caption-2-medium font-medium text-text-secondary">{props.label}</Label>
      <Input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        className={
          props.mono
            ? "font-mono text-caption-2-medium h-8 bg-background-secondary-default/40"
            : "text-caption-2-medium h-8 bg-background-secondary-default/40"
        }
      />
    </div>
  )
}
