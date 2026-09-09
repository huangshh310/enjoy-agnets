/**
 * 企业集成：没有假「已连接」。第三方走本机 MCP。
 */
import { useNavigate } from "@tanstack/react-router"
import { RiExternalLinkLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"
import { LocalOnlyNotice } from "@renderer/components/settings/local-only-notice"

export function CompanyIntegrationsSection() {
  const t = useT()
  const navigate = useNavigate()
  return (
    <LocalOnlyNotice
      title={t("settings.localIntegrations.title")}
      body={t("settings.localIntegrations.body")}
      action={
        <Button
          variant="outline"
          className="h-8 gap-1.5 text-caption-1-medium"
          onClick={() => void navigate({ to: "/mcp" })}
        >
          <span>{t("settings.localIntegrations.openMcp")}</span>
          <RiExternalLinkLine className="size-3.5" />
        </Button>
      }
    />
  )
}
