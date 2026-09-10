/**
 * @ / 面板一行：文件用类型微标；斜杠是强调色图标 + 深色 /名 + 来源胶囊。
 */
import { RiBookOpenLine, RiSparklingLine } from "@remixicon/react"
import { FileKindIcon } from "../../right-pane/file-kind-icon"
import { MODE_ICONS } from "../../execution-mode-menu"
import { cx } from "@/utils/cx"
import type { MentionItem } from "./mention-items.ts"

export function ComposerMentionRow({
  item,
  active,
  scopeWorkspace,
  scopePersonal,
  onPick
}: {
  item: MentionItem
  active: boolean
  scopeWorkspace: string
  scopePersonal: string
  onPick: () => void
}) {
  return (
    <button
      type="button"
      data-testid="composer-mention-item"
      data-active={active ? "true" : "false"}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onPick}
      className={cx(
        "flex w-full cursor-pointer items-start gap-2 rounded-xl px-2.5 py-1.5 text-left transition-colors",
        active ? "bg-accent-500/10" : "hover:bg-background-secondary-hover"
      )}
    >
      {item.kind === "file" ? <FileRow item={item} /> : <SlashRow item={item} scopeWorkspace={scopeWorkspace} scopePersonal={scopePersonal} />}
    </button>
  )
}

function FileRow({ item }: { item: Extract<MentionItem, { kind: "file" }> }) {
  const dir = fileDir(item.path)
  return (
    <>
      <FileKindIcon name={item.name} kind={item.entryKind} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-2-semibold text-text-primary">{item.name}</span>
        {dir ? <span className="block truncate text-caption-2-medium text-text-secondary">{dir}</span> : null}
      </span>
    </>
  )
}

function SlashRow({
  item,
  scopeWorkspace,
  scopePersonal
}: {
  item: Exclude<MentionItem, { kind: "file" }>
  scopeWorkspace: string
  scopePersonal: string
}) {
  const name =
    item.kind === "mode" ? item.mode : item.kind === "command" ? item.name : (item.skill.slash ?? item.skill.name)
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

function SlashGlyph({ item }: { item: Exclude<MentionItem, { kind: "file" }> }) {
  const Icon = slashMentionIcon(item)
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
        builtin
          ? "bg-accent-500/10 text-accent-600"
          : "bg-background-secondary-default text-text-secondary"
      )}
    >
      {label}
    </span>
  )
}

function slashMentionIcon(item: Exclude<MentionItem, { kind: "file" }>) {
  if (item.kind === "mode") return MODE_ICONS[item.mode]
  if (item.kind === "command") return RiSparklingLine
  return RiBookOpenLine
}

function fileDir(path: string): string {
  const normalized = path.replaceAll("\\", "/")
  const slash = normalized.lastIndexOf("/")
  return slash >= 0 ? normalized.slice(0, slash) : ""
}
