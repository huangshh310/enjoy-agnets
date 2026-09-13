/**
 * Composer @ 文件 / / 内置命令与技能浮层。引擎 ACP available_commands 仍只进 ⌘L。
 */
import type { Ref } from "react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import type { MentionItem } from "./mention-items.ts"
import { ComposerMentionRow } from "./composer-mention-row.tsx"
import { groupMentionItems, type MentionGroupId } from "./mention-groups.ts"

export function ComposerMentionList({
  kind,
  items,
  activeIndex,
  onPick,
  listRef
}: {
  kind: "at" | "slash"
  items: MentionItem[]
  activeIndex: number
  onPick: (item: MentionItem) => void
  listRef?: Ref<HTMLDivElement>
}) {
  const t = useT()
  const groups = groupMentionItems(kind, items)
  let cursor = 0
  return (
    <div
      ref={listRef}
      data-testid="composer-mention-list"
      className="max-h-[min(18rem,42vh)] overflow-y-auto overscroll-contain rounded-2xl border border-border-button-default bg-background-primary-default p-1.5 shadow-dropdown"
    >
      {items.length === 0 ? (
        <div className="px-2.5 py-2">
          <p className="text-caption-1-medium text-text-tertiary">{t("chat.mentionEmpty")}</p>
          {kind === "slash" ? (
            <p className="pt-1 text-caption-2-medium text-text-tertiary">{t("chat.mentionSlashHint")}</p>
          ) : null}
        </div>
      ) : (
        groups.map((group, groupIndex) => {
          const heading = groupLabel(group.id, t)
          const start = cursor
          cursor += group.items.length
          return (
            <section
              key={group.id}
              className={cx("pb-1 last:pb-0", groupIndex > 0 && "mt-1 border-t border-separator-border pt-1")}
            >
              <p className="px-2.5 py-1 text-caption-2-semibold tracking-wide text-text-secondary">{heading}</p>
              {group.items.map((item, offset) => (
                <ComposerMentionRow
                  key={item.id}
                  item={item}
                  active={start + offset === activeIndex}
                  scopeWorkspace={t("chat.mentionScopeWorkspace")}
                  scopePersonal={t("chat.mentionScopePersonal")}
                  onPick={() => onPick(item)}
                />
              ))}
            </section>
          )
        })
      )}
    </div>
  )
}

function groupLabel(id: MentionGroupId, t: (key: string) => string): string {
  if (id === "discover") return t("chat.mentionDiscoverGroup")
  if (id === "files") return t("chat.mentionFilesGroup")
  if (id === "skills") return t("chat.mentionSkillsGroup")
  if (id === "mcp") return t("chat.mentionMcpGroup")
  if (id === "builtin") return t("chat.mentionBuiltinGroup")
  if (id === "workspace") return t("chat.mentionScopeWorkspace")
  return t("chat.mentionScopePersonal")
}
