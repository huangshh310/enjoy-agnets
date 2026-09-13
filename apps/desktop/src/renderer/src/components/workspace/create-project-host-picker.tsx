/**
 * 创建项目远程步：选择已存主机或新主机。
 */
import { RiAddLine, RiServerLine } from "@remixicon/react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useT } from "@renderer/i18n"
import type { SshHost } from "@enjoy-agents/ipc-contract"

export function CreateProjectHostPicker({
  hosts,
  hostId,
  onChange
}: {
  hosts: SshHost[]
  hostId: string
  onChange: (id: string) => void
}) {
  const t = useT()

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-caption-1-medium font-medium text-text-secondary">
        {t("settings.workspace.sshConnections")}
      </Label>
      <Select
        value={hostId || undefined}
        onValueChange={(val) => onChange(val === "__none__" ? "" : val)}
      >
        <SelectTrigger className="h-10 w-full rounded-xl border border-border-button-default bg-background-primary-default px-3 text-caption-1-medium shadow-2xs cursor-pointer">
          <SelectValue placeholder={t("pages.workspaces.createProject.pickHost")} />
        </SelectTrigger>
        <SelectContent className="rounded-xl border border-border-button-default bg-background-primary-default shadow-card">
          {hosts.length === 0 ? (
            <div className="py-3 px-3 text-center text-caption-2-regular text-text-tertiary">
              {t("settings.workspace.sshNoHosts")}
            </div>
          ) : (
            hosts.map((host) => (
              <SelectItem
                key={host.id}
                value={host.id}
                className="cursor-pointer text-caption-1-regular py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <RiServerLine className="size-4 text-accent-500 shrink-0" />
                  <span className="font-medium text-text-primary truncate">{host.alias}</span>
                  <span className="font-mono text-caption-2-regular text-text-tertiary truncate">
                    ({host.user}@{host.host}:{host.port})
                  </span>
                </div>
              </SelectItem>
            ))
          )}
          {hosts.length > 0 ? <SelectSeparator /> : null}
          <SelectItem
            value="__new__"
            className="cursor-pointer text-caption-1-medium text-accent-600 dark:text-accent-400 py-2"
          >
            <div className="flex items-center gap-2">
              <RiAddLine className="size-4" />
              <span>{t("pages.workspaces.createProject.newHost")}</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

