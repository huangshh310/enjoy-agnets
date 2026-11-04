/**
 * 未登录诚实卡：「先连接 GitHub」+「去连接」。
 * tip A：引导本机 `gh auth login`（复制命令 / 外链文档）；不做应用内 PAT/OAuth。
 * 禁冒充 Releases / MCP / OMP device = 已交付。
 */
import { useState } from "react"
import { RiCheckboxCircleLine, RiFileCopyLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { SETTINGS_DRAWER_Z_CLASS } from "@renderer/components/settings/settings-overlay"
import { requestOpenExternalQuiet } from "@renderer/lib/open-safe-external"
import { useT } from "@renderer/i18n"
import { cx } from "@/utils/cx"

const GH_AUTH_CMD = "gh auth login"
const GH_AUTH_DOCS = "https://cli.github.com/manual/gh_auth_login"

export function ConnectGithubCard(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useT()
  const [copied, setCopied] = useState(false)

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(GH_AUTH_CMD)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  function openDocs() {
    requestOpenExternalQuiet(GH_AUTH_DOCS)
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        data-testid="connect-github-card"
        showCloseButton={false}
        overlayClassName={cx(SETTINGS_DRAWER_Z_CLASS.modal, "fixed inset-0")}
        className={cx(
          SETTINGS_DRAWER_Z_CLASS.modal,
          "fixed inset-0 left-0 top-0 flex h-full w-full max-w-none translate-x-0 translate-y-0 items-center justify-center border-0 bg-transparent p-0 shadow-none"
        )}
      >
        <div className="w-full max-w-md rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-card">
          <DialogHeader className="mb-3 space-y-1 text-left">
            <DialogTitle className="text-body-medium font-semibold text-text-primary">
              {t("chat.prConnectTitle")}
            </DialogTitle>
            <DialogDescription className="text-caption-1-medium text-text-secondary">
              {t("chat.prConnectBody")}
            </DialogDescription>
          </DialogHeader>

          <div className="mb-3 rounded-lg border border-separator-border bg-background-secondary-default/60 px-3 py-2 font-mono text-caption-1-medium text-text-primary">
            {GH_AUTH_CMD}
          </div>

          <DialogFooter className="flex flex-row flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => props.onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void openDocs()}>
              {t("chat.prConnectDocs")}
            </Button>
            <Button
              type="button"
              size="sm"
              data-testid="connect-github-go"
              onClick={() => void copyCommand()}
              className="gap-1"
            >
              {copied ? <RiCheckboxCircleLine className="size-3.5" /> : <RiFileCopyLine className="size-3.5" />}
              {copied ? t("chat.prConnectCopied") : t("chat.prConnectAction")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
