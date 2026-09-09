/**
 * 交接卡文件证据：默认收成「N 个文件」，展开后才列名。
 */
import { useState } from "react"
import { useT } from "@renderer/i18n"

export function HandoffFileList({ files }: { files: string[] }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  if (files.length === 0) return null

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="text-caption-2-medium text-text-secondary outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring"
        aria-expanded={open}
      >
        {t("chat.handoff.fileCount", { count: files.length })}
      </button>
      {open ? (
        <ul className="mt-1 flex flex-col gap-0.5 pl-1">
          {files.map((file) => (
            <li key={file} className="truncate font-mono text-caption-2-medium text-text-tertiary" title={file}>
              {file}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
