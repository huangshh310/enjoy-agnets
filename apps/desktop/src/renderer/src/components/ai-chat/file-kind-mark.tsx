/**
 * 按扩展名给文件一个降饱和的色标。未知类型保持原来的代码文件图标。
 */
import { RiFileCodeLine, RiFileLine, RiImageLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { fileKindForName, type FileKind } from "./file-kind"

const KIND_CLASS: Record<Exclude<FileKind, "generic">, string> = {
  code: "text-accent-500/70",
  script: "text-chart-1/70",
  data: "text-chart-2/70",
  doc: "text-state-success-text/70",
  style: "text-chart-3/70",
  image: "text-docs-command-accent/70",
  config: "text-text-tertiary"
}

export function FileKindMark({ name, className }: { name: string; className?: string }) {
  const kind = fileKindForName(name)
  const iconClass = cx("size-3.5 shrink-0", kind === "generic" ? "text-accent-500/80" : KIND_CLASS[kind], className)
  if (kind === "image") return <RiImageLine className={iconClass} aria-hidden />
  if (kind === "generic") return <RiFileCodeLine className={iconClass} aria-hidden />
  return <RiFileLine className={iconClass} aria-hidden />
}
