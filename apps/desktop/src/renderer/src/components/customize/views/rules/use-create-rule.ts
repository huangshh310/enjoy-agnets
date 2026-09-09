/**
 * 新建规则弹层：表单状态与写入。
 */
import { useState } from "react"
import type { AgentRuleKind } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { getIde, hasIde } from "@renderer/lib/ide"
import type { ProjectRulePreset } from "../../constants/customize-presets"

export function useCreateRule(refresh: () => Promise<unknown>) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<AgentRuleKind>("cursor_mdc")
  const [name, setName] = useState("")
  const [globs, setGlobs] = useState("*.ts,*.tsx")
  const [description, setDescription] = useState("")
  const [content, setContent] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isWriting, setIsWriting] = useState<string | null>(null)
  const form = { kind, name, globs, description, content }

  return {
    open,
    setOpen,
    kind,
    setKind,
    name,
    setName,
    globs,
    setGlobs,
    description,
    setDescription,
    content,
    setContent,
    isCreating,
    isWriting,
    writePreset: (preset: ProjectRulePreset, targetKind: AgentRuleKind) =>
      writePresetRule(preset, targetKind, refresh, setIsWriting),
    createRule: () => {
      if (isCreating) return
      return createNamedRule(form, t("studio.rules.defaultContent", { name }), refresh, {
        setIsCreating,
        setOpen,
        setName,
        setDescription,
        setContent
      })
    }
  }
}

async function writePresetRule(
  preset: ProjectRulePreset,
  targetKind: AgentRuleKind,
  refresh: () => Promise<unknown>,
  setIsWriting: (id: string | null) => void
) {
  if (!hasIde()) return
  setIsWriting(`${preset.id}:${targetKind}`)
  try {
    await getIde().rules.create({
      targetKind,
      name: preset.id,
      description: preset.description,
      globs: targetKind === "cursor_mdc" ? "*.ts,*.tsx" : undefined,
      content: preset.content
    })
    await refresh()
  } finally {
    setIsWriting(null)
  }
}

async function createNamedRule(
  form: { kind: AgentRuleKind; name: string; globs: string; description: string; content: string },
  defaultContent: string,
  refresh: () => Promise<unknown>,
  reset: {
    setIsCreating: (v: boolean) => void
    setOpen: (v: boolean) => void
    setName: (v: string) => void
    setDescription: (v: string) => void
    setContent: (v: string) => void
  }
) {
  if (!form.name.trim() || !hasIde()) return
  reset.setIsCreating(true)
  try {
    await getIde().rules.create({
      targetKind: form.kind,
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      globs: form.kind === "cursor_mdc" ? form.globs.trim() || undefined : undefined,
      content: form.content.trim() || defaultContent
    })
    await refresh()
    reset.setOpen(false)
    reset.setName("")
    reset.setDescription("")
    reset.setContent("")
  } finally {
    reset.setIsCreating(false)
  }
}
