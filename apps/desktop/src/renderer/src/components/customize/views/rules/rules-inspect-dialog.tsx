/**
 * 查看规则正文弹层。
 */
import { RiCheckLine, RiClipboardLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import type { ProjectRuleItem } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"

export function RulesInspectDialog(props: {
  rule: ProjectRuleItem | null
  copiedId: string | null
  onClose: () => void
  onCopy: (id: string, text: string) => void
}) {
  const t = useT()
  const rule = props.rule
  return (
    <Dialog open={Boolean(rule)} onOpenChange={(open) => !open && props.onClose()}>
      {rule ? (
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden rounded-xl border border-separator-border/80 bg-background-primary-default shadow-xl">
          <div className="border-b border-separator-border/70 px-5 py-3.5 flex items-center justify-between">
            <div>
              <DialogTitle className="text-body-medium font-semibold text-text-primary">{rule.name}</DialogTitle>
              <p className="text-[11.5px] text-text-tertiary font-mono">{rule.filePath}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => props.onCopy(rule.id, rule.content ?? "")}
              className="gap-1 h-7 text-caption-2-medium"
            >
              {props.copiedId === rule.id ? (
                <>
                  <RiCheckLine className="size-3 text-emerald-500" />
                  <span>{t("common.copied")}</span>
                </>
              ) : (
                <>
                  <RiClipboardLine className="size-3" />
                  <span>{t("studio.rules.copyContent")}</span>
                </>
              )}
            </Button>
          </div>
          <div className="p-4 max-h-[60vh] overflow-y-auto bg-background-secondary-default/30">
            <pre className="font-mono text-[11.5px] text-text-primary whitespace-pre-wrap leading-relaxed">
              {rule.content}
            </pre>
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  )
}
