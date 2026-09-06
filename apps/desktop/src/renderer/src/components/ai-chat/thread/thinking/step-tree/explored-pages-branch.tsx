/**
 * Explored N pages 折叠子清单。本地 path 打开审查；http 走浏览器。
 */
import { useState } from "react"
import { RiArrowDownSLine, RiArrowRightSLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { openBrowserUrl } from "@renderer/components/ai-chat/right-pane/open-pane"
import { openChangedFile } from "@renderer/hooks/use-agent-session"
import { parseHttpUrl } from "@renderer/lib/http-url"
import type { SubPageItem } from "../agent-step-tree.types"

export function ExploredPagesBranch({
  title,
  pages
}: {
  title: string
  pages: SubPageItem[]
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="flex flex-col gap-1 pt-0.5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex w-fit cursor-pointer items-center gap-1 text-caption-2-medium text-text-secondary hover:text-text-primary"
      >
        <span className="font-semibold">{title}</span>
        {open ? (
          <RiArrowDownSLine className="size-3 text-text-tertiary" />
        ) : (
          <RiArrowRightSLine className="size-3 text-text-tertiary" />
        )}
      </button>
      {open ? (
        <div className="flex flex-col gap-1 border-l border-border-button-default/70 py-0.5 pl-2.5 font-mono text-caption-2-regular text-text-tertiary">
          {pages.map((page) => (
            <ExploredPageRow key={page.id} page={page} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ExploredPageRow({ page }: { page: SubPageItem }) {
  const href = parseHttpUrl(page.path) ?? parseHttpUrl(page.title)
  const localPath = href ? undefined : page.path
  const clickable = Boolean(href || localPath)
  return (
    <button
      type="button"
      onClick={() => {
        if (href) openBrowserUrl(href)
        else if (localPath) void openChangedFile(localPath)
      }}
      className={cx(
        "max-w-md truncate text-left transition-colors hover:text-text-primary",
        clickable && "cursor-pointer"
      )}
    >
      {page.title}
    </button>
  )
}
