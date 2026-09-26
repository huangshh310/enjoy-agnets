/**
 * 新建技能工坊右栏：SKILL.md 实时预览与复制。
 */
import { RiCheckLine, RiClipboardLine, RiFileCodeLine } from "@remixicon/react"
import { useT } from "@renderer/i18n"

export function CreateSkillPreviewPane({
  markdown,
  copied,
  onCopy
}: {
  markdown: string
  copied: boolean
  onCopy: () => void
}) {
  const t = useT()

  return (
    <div className="md:col-span-5 flex flex-col bg-background-secondary-default/20 p-6 overflow-hidden">
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-separator-border/50 text-caption-2-regular text-text-tertiary shrink-0">
        <div className="flex items-center gap-1.5 font-mono text-text-primary font-medium">
          <RiFileCodeLine className="size-4 text-accent-500" />
          <span>{t("pages.skills.previewPane.title")}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-state-success-text dark:text-state-success-text font-medium">{t("pages.skills.previewPane.liveCompile")}</span>
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-text-tertiary hover:bg-background-secondary-default hover:text-text-primary transition-colors cursor-pointer"
            title={t("pages.skills.previewPane.copyTitle")}
          >
            {copied ? (
              <RiCheckLine className="size-3 text-state-success-text" />
            ) : (
              <RiClipboardLine className="size-3" />
            )}
            <span>{copied ? t("pages.skills.previewPane.copied") : t("pages.skills.previewPane.copy")}</span>
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto rounded-2xl border border-separator-border/60 bg-background-primary-default p-4 font-mono text-caption-2-regular leading-relaxed select-text shadow-2xs">
        <pre className="text-text-primary whitespace-pre-wrap">{markdown}</pre>
      </div>
    </div>
  )
}
