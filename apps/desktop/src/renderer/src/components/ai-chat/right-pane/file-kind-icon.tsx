/**
 * 文件树图标：文件夹开合 + Seti 风格的类型色标。
 */
import { RiFolder2Fill, RiFolderOpenFill } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { fileGlyphFor } from "./file-kind"

export function FileKindIcon({
  name,
  kind,
  open = false
}: {
  name: string
  kind: "file" | "directory"
  open?: boolean
}) {
  const glyph = fileGlyphFor(name, kind)
  if (glyph === "folder") {
    const Icon = open ? RiFolderOpenFill : RiFolder2Fill
    return <Icon className="size-4 shrink-0 text-accent-500" aria-hidden />
  }
  return (
    <span
      aria-hidden
      title={name}
      className={cx(
        "inline-flex size-4 shrink-0 items-center justify-center font-mono text-caption-2-bold",
        glyph.tone
      )}
    >
      {glyph.mark}
    </span>
  )
}
