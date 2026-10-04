/**
 * 审查「更多」里的差异配色：默认 / 易辨认。
 */
import { RiCheckLine, RiPaletteLine } from "@remixicon/react"
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from "@/components/ui/dropdown-menu"
import { useT } from "@renderer/i18n"
import type { DiffPalette } from "../../../../diff/diff-palette"

export function ReviewDiffPaletteMenu(props: {
  palette: DiffPalette
  onPalette: (palette: DiffPalette) => void
}) {
  const t = useT()
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="flex items-center gap-2 py-1.5 px-2 text-caption-1-medium cursor-pointer">
        <RiPaletteLine className="size-4 text-text-tertiary" />
        <span>{t("chat.reviewDiffPalette")}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-40 p-1">
        <PaletteChoice
          active={props.palette === "default"}
          label={t("chat.reviewDiffPaletteDefault")}
          onSelect={() => props.onPalette("default")}
        />
        <PaletteChoice
          active={props.palette === "distinct"}
          label={t("chat.reviewDiffPaletteDistinct")}
          onSelect={() => props.onPalette("distinct")}
        />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}

function PaletteChoice(props: { active: boolean; label: string; onSelect: () => void }) {
  return (
    <DropdownMenuItem
      onClick={props.onSelect}
      className="flex items-center justify-between py-1.5 px-2 text-caption-1-medium cursor-pointer"
    >
      <span>{props.label}</span>
      {props.active ? <RiCheckLine className="size-4 text-accent-500" /> : null}
    </DropdownMenuItem>
  )
}
