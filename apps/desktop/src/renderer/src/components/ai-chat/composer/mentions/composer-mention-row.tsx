/**
 * @ 发现一行：文件 / 文档 / 技能 / MCP / 网页 muted；斜杠是强调色 /名。
 */
import { RiBookOpenLine, RiCompass3Line, RiSparklingLine, RiTerminalBoxLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import type { MentionItem } from "./mention-items.ts"
import { DesktopMentionRow } from "./desktop/desktop-mention-row.tsx"
import { FileKindMark } from "@renderer/components/ai-chat/file-kind-mark"

type DiscoverMentionItem = Extract<MentionItem, { kind: "file" | "doc" | "skill" | "mcp" | "web" | "desktop" }>
type SlashMentionItem = Extract<MentionItem, { kind: "mode" | "command" | "skill" }>

export function ComposerMentionRow({
  item,
  active,
  scopeWorkspace,
  scopePersonal,
  onPick,
  slash
}: {
  item: MentionItem
  active: boolean
  scopeWorkspace: string
  scopePersonal: string
  onPick: () => void
  slash?: boolean
}) {
  const muted = item.kind === "web"
  const isSlash = slash || item.kind === "mode" || item.kind === "command"
  return (
    <button
      type="button"
      data-testid="composer-mention-item"
      data-active={active ? "true" : "false"}
      data-kind={item.kind}
      disabled={muted}
      onMouseDown={(event) => event.preventDefault()}
      onClick={muted ? undefined : onPick}
      className={cx(
        "flex w-full items-start gap-2 rounded-xl px-2.5 py-1.5 text-left transition-colors",
        muted
          ? "cursor-default bg-background-tertiary-default/60 text-text-tertiary/50"
          : "cursor-pointer",
        !muted && active ? "bg-accent-500/10" : !muted && "hover:bg-background-secondary-hover"
      )}
    >
      {isSlash && (item.kind === "mode" || item.kind === "command" || item.kind === "skill") ? (
        <SlashRow item={item} scopeWorkspace={scopeWorkspace} scopePersonal={scopePersonal} />
      ) : item.kind === "desktop" ? (
        <DesktopMentionRow item={item} active={active} />
      ) : (
        <DiscoverRow
          item={item as DiscoverMentionItem}
          scopeWorkspace={scopeWorkspace}
          scopePersonal={scopePersonal}
        />
      )}
    </button>
  )
}

function DiscoverRow({
  item,
  scopeWorkspace,
  scopePersonal
}: {
  item: DiscoverMentionItem
  scopeWorkspace: string
  scopePersonal: string
}) {
  const t = useT()
  const kindLabel =
    item.kind === "file"
      ? t("chat.mentionKindFile")
      : item.kind === "doc"
        ? t("chat.mentionKindDoc")
        : item.kind === "skill"
          ? t("chat.mentionKindSkill")
        : item.kind === "mcp"
          ? t("chat.mentionKindMcp")
          : item.kind === "desktop"
            ? t("chat.mentionKindDesktop")
            : t("chat.mentionKindWeb")
  const name = item.kind === "web" ? t("chat.mentionWebMuted") : discoverName(item)
  return (
    <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
      <span className="flex min-w-0 items-center gap-1.5 truncate text-body-2-semibold text-text-primary">
        {item.kind === "file" ? <FileKindMark name={item.name} /> : null}
        <span className="mr-2 text-caption-2-medium text-text-tertiary">{kindLabel}</span>
        {name}
      </span>
      <span className="shrink-0 text-caption-2-medium text-text-tertiary">
        {item.kind === "web"
          ? t("chat.mentionWebDisabled")
          : item.kind === "doc"
            ? t("chat.mentionScopeKnowledge")
            : item.kind === "desktop"
              ? t("chat.desktopChip")
              : item.kind === "mcp"
              ? (item.status ?? t("chat.mentionMcpGroup"))
              : item.kind === "skill" && item.skill.scope !== "workspace"
                ? t("chat.mentionScopeInstalled")
                : discoverScope(item, scopeWorkspace, scopePersonal)}
      </span>
    </span>
  )
}

function discoverName(item: DiscoverMentionItem): string {
  if (item.kind === "file") return item.path || item.name
  if (item.kind === "doc") return item.name
  if (item.kind === "mcp") return item.name
  if (item.kind === "desktop") return item.label
  if (item.kind === "skill") return item.skill.name
  return ""
}

function discoverScope(
  item: DiscoverMentionItem,
  scopeWorkspace: string,
  scopePersonal: string
): string {
  if (item.kind === "file") return scopeWorkspace
  if (item.kind === "doc") return "knowledge"
  if (item.kind === "mcp") return item.status ?? ""
  if (item.kind === "desktop") return ""
  if (item.kind === "skill") return item.skill.scope === "workspace" ? scopeWorkspace : scopePersonal
  return ""
}

function SlashRow({
  item,
  scopeWorkspace,
  scopePersonal
}: {
  item: SlashMentionItem
  scopeWorkspace: string
  scopePersonal: string
}) {
  const name =
    item.kind === "mode" ? item.slash : item.kind === "command" ? item.name : (item.skill.slash ?? item.skill.name)
  const detail =
    item.kind === "mode" ? item.description : item.kind === "command" ? item.description : item.skill.description
  const tag =
    item.kind === "command"
      ? item.tag
      : item.kind === "mode"
        ? (item.tag ?? item.label)
        : item.skill.scope === "workspace"
          ? scopeWorkspace
          : scopePersonal
  return (
    <>
      <SlashGlyph item={item} />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 truncate font-mono text-body-2-semibold text-text-primary">
            <span className="text-accent-500">/</span>
            {name}
          </span>
          <SlashTag label={tag} builtin={item.kind !== "skill"} />
        </span>
        {detail ? (
          <span className="mt-0.5 block truncate text-caption-2-medium text-text-secondary">{detail}</span>
        ) : null}
      </span>
    </>
  )
}

function SlashGlyph({ item }: { item: SlashMentionItem }) {
  const Icon =
    item.kind === "mode"
      ? item.slash === "explore"
        ? RiCompass3Line
        : RiTerminalBoxLine
      : item.kind === "command"
        ? RiSparklingLine
        : RiBookOpenLine
  return (
    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg bg-accent-500/10">
      <Icon className="size-3.5 text-accent-500" aria-hidden />
    </span>
  )
}

function SlashTag({ label, builtin }: { label: string; builtin: boolean }) {
  return (
    <span
      className={cx(
        "shrink-0 rounded-md px-1.5 py-px text-caption-2-semibold",
        builtin ? "bg-accent-500/10 text-accent-600" : "bg-background-secondary-default text-text-secondary"
      )}
    >
      {label}
    </span>
  )
}
