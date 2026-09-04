/**
 * 资料编辑弹窗：昵称 / 邮箱 / 头衔 / 时区 / Blobatar / 四套 Canvas 封面。
 * 下拉必须走 shadcn Select，禁止原生 <select>（系统蓝条会破 Dialog 皮）。
 */
import { useEffect, useState, type ReactNode } from "react"
import { RiPaletteLine } from "@remixicon/react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { BlobatarAvatar } from "../../avatar/blobatar-avatar"
import { BlobatarPickerDialog } from "../../avatar/blobatar-picker-dialog"
import { BLOBATAR_EXPRESSIONS } from "../../avatar/blobatar.types"
import { GLASS_COVER_PRESETS } from "../constants"
import type { ExtendedUserProfile } from "../types/profile.types"

interface ProfileEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: ExtendedUserProfile
  onSave: (updated: ExtendedUserProfile) => void
}

export function ProfileEditDialog({
  open,
  onOpenChange,
  profile,
  onSave
}: ProfileEditDialogProps) {
  const [draft, setDraft] = useState<ExtendedUserProfile>(profile)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    if (open) setDraft(profile)
  }, [open, profile])

  function handleSave() {
    onSave(draft)
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl overflow-hidden border border-separator-border bg-background-primary-default p-0 shadow-card sm:rounded-2xl select-none">
          <DialogHeader className="border-b border-separator-border/60 px-5 pt-5 pb-3">
            <DialogTitle className="text-title-3-semibold text-text-primary">
              编辑个人资料与形象
            </DialogTitle>
          </DialogHeader>

          <div className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto px-5 py-4">
            <div className="flex items-center justify-between rounded-xl border border-separator-border/50 bg-background-secondary-default/40 p-3.5">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-background-primary-default p-1 ring-2 ring-separator-border/70">
                  <BlobatarAvatar config={draft.blobatarConfig} size={58} />
                </div>
                <div className="flex flex-col">
                  <span className="text-caption-1-medium text-text-primary">Blobatar 几何头像</span>
                  <span className="font-mono text-caption-2-medium text-text-tertiary">
                    种子: {draft.blobatarConfig.name} · 表情: {draft.blobatarConfig.expression ?? "idle"}
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPickerOpen(true)}
                className="h-8 gap-1.5 text-caption-2-medium"
              >
                <RiPaletteLine className="size-3.5 text-accent-500" />
                <span>定制头像</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <Field label="用户昵称">
                <Input
                  value={draft.name}
                  onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                  placeholder="例如: Enjoy Engineer"
                />
              </Field>
              <Field label="社交代号 (Handle)">
                <Input
                  value={draft.handle}
                  onChange={(event) => setDraft((current) => ({ ...current, handle: event.target.value }))}
                  placeholder="例如: @enjoy-agents"
                />
              </Field>
              <Field label="职位头衔">
                <Input
                  value={draft.roleTitle}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, roleTitle: event.target.value }))
                  }
                  placeholder="例如: Agent Engineer"
                />
              </Field>
              <Field label="电子邮箱">
                <Input
                  value={draft.email}
                  onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
                  placeholder="name@example.com"
                />
              </Field>
              <Field label="时区">
                <Input
                  value={draft.timezone}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, timezone: event.target.value }))
                  }
                  placeholder="Asia/Shanghai"
                />
              </Field>
              <SelectField
                label="头像表情"
                value={draft.blobatarConfig.expression ?? "idle"}
                onValueChange={(expression) =>
                  setDraft((current) => ({
                    ...current,
                    blobatarConfig: { ...current.blobatarConfig, expression }
                  }))
                }
                items={BLOBATAR_EXPRESSIONS.map((item) => ({
                  value: item.id,
                  label: `${item.label} (${item.id})`
                }))}
              />
              <SelectField
                label="Glass 封面风格"
                value={draft.coverPreset}
                onValueChange={(coverPreset) => setDraft((current) => ({ ...current, coverPreset }))}
                items={GLASS_COVER_PRESETS.map((preset) => ({
                  value: preset.id,
                  label: preset.label
                }))}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-separator-border/60 bg-background-secondary-default/30 px-5 py-3">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button size="sm" onClick={handleSave}>
              保存修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BlobatarPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        value={draft.blobatarConfig}
        onSave={(config) =>
          setDraft((current) => ({
            ...current,
            blobatarConfig: config
          }))
        }
      />
    </>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-caption-2-medium text-text-secondary">{label}</label>
      {children}
    </div>
  )
}

function SelectField<T extends string>({
  label,
  value,
  onValueChange,
  items
}: {
  label: string
  value: T
  onValueChange: (value: T) => void
  items: Array<{ value: T; label: string }>
}) {
  return (
    <Field label={label}>
      <Select value={value} onValueChange={(next) => onValueChange(next as T)}>
        <SelectTrigger className="h-9 w-full rounded-2lg">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="z-[80]">
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}
