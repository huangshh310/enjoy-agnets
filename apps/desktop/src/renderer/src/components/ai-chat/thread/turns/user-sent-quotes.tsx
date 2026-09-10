/**
 * 已发送用户轮的引用 Chip：只展示文件名，不把 Prompt 协议块渲进气泡。
 */
import type { QuotedDisplayChip } from "@enjoy-agents/ipc-contract"
import { FileKindIcon } from "../../right-pane/file-kind-icon"

export function UserSentQuotes({ chips }: { chips: QuotedDisplayChip[] }) {
  if (chips.length === 0) return null
  return (
    <div className="flex max-w-full flex-wrap justify-end gap-1">
      {chips.map((chip, index) => (
        <span
          key={`${chip.kind}:${chip.title}:${index}`}
          className="inline-flex max-w-full items-center gap-1 rounded-full border border-border-button-default bg-background-primary-default px-2 py-0.5 text-caption-2-medium text-text-secondary"
        >
          <FileKindIcon
            name={chip.title.replace(/\/$/, "")}
            kind={chip.kind === "file" && chip.title.endsWith("/") ? "directory" : "file"}
          />
          <span className="truncate">{chip.title}</span>
        </span>
      ))}
    </div>
  )
}
