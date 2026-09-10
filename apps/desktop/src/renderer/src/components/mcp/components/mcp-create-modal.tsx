/**
 * MCP Server 注册与编辑弹窗：校验后 upsert。
 */
import { useEffect, useState } from "react"
import { RiCheckLine, RiLoader4Line } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import type { McpServer, McpTransport } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { getIde } from "@renderer/lib/ide"
import { getFeaturedMcpPresets } from "../constants/mcp-presets"
import { McpCreateFormBody, type McpEnvPair } from "./mcp-create-form-body"

export function McpCreateModal(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialServer?: McpServer | null
  onChanged: () => Promise<void>
}) {
  const { open, onOpenChange, initialServer, onChanged } = props
  const t = useT()

  const [name, setName] = useState("local-server")
  const [transport, setTransport] = useState<McpTransport>("stdio")
  const [command, setCommand] = useState("npx -y @modelcontextprotocol/server-everything")
  const [url, setUrl] = useState("https://mcp.example.com/sse")
  const [trusted, setTrusted] = useState(false)
  const [allowedResourceUrisText, setAllowedResourceUrisText] = useState("")
  const [envPairs, setEnvPairs] = useState<McpEnvPair[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (initialServer) {
      setName(initialServer.name)
      setTransport(initialServer.transport)
      setCommand(initialServer.command ?? "")
      setUrl(initialServer.url ?? "")
      setTrusted(initialServer.trusted)
      setAllowedResourceUrisText((initialServer.allowedResourceUris ?? []).join(", "))
      if (initialServer.envRef) {
        try {
          const parsed = JSON.parse(initialServer.envRef) as Record<string, string>
          setEnvPairs(Object.entries(parsed).map(([key, value]) => ({ key, value })))
        } catch {
          setEnvPairs([])
        }
      } else {
        setEnvPairs([])
      }
    } else {
      setName("local-server")
      setTransport("stdio")
      setCommand("npx -y @modelcontextprotocol/server-everything")
      setUrl("https://mcp.example.com/sse")
      setTrusted(false)
      setAllowedResourceUrisText("")
      setEnvPairs([])
    }
    setErrorMsg(null)
  }, [initialServer, open])

  function handleSelectPreset(presetId: string) {
    const p = getFeaturedMcpPresets(t).find((item) => item.id === presetId)
    if (!p) return
    setName(p.id)
    setTransport(p.transport)
    if (p.command) setCommand(p.command)
    if (p.url) setUrl(p.url)
    if (p.envTemplates) {
      setEnvPairs(p.envTemplates.map((item) => ({ key: item.key, value: "" })))
    } else {
      setEnvPairs([])
    }
  }

  function handleAddEnv() {
    setEnvPairs((prev) => [...prev, { key: "", value: "" }])
  }

  function handleRemoveEnv(index: number) {
    setEnvPairs((prev) => prev.filter((_, i) => i !== index))
  }

  function handleEnvChange(index: number, field: "key" | "value", val: string) {
    setEnvPairs((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: val }
      return next
    })
  }

  async function handleSave() {
    if (!name.trim()) {
      setErrorMsg(t("pages.mcp.needIdentifier"))
      return
    }
    if (transport === "stdio" && !command.trim()) {
      setErrorMsg(t("pages.mcp.needCommand"))
      return
    }
    if ((transport === "sse" || transport === "http") && !url.trim()) {
      setErrorMsg(t("pages.mcp.needUrl"))
      return
    }

    setIsSaving(true)
    setErrorMsg(null)
    try {
      let envRef: string | undefined
      const validEnv = envPairs.filter((p) => p.key.trim() !== "")
      if (validEnv.length > 0) {
        const envObj: Record<string, string> = {}
        for (const pair of validEnv) {
          envObj[pair.key.trim()] = pair.value
        }
        envRef = JSON.stringify(envObj)
      }

      const allowedResourceUris = allowedResourceUrisText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)

      await getIde().mcp.upsert({
        id: initialServer?.id,
        name: name.trim(),
        transport,
        command: transport === "stdio" ? command.trim() : undefined,
        url: transport === "stdio" ? undefined : url.trim(),
        envRef,
        allowedResourceUris,
        modelVisibleTools: initialServer?.modelVisibleTools ?? [],
        appOnlyTools: initialServer?.appOnlyTools ?? [],
        trusted
      })

      await onChanged()
      onOpenChange(false)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : t("pages.mcp.saveFailed"))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden rounded-xl border border-separator-border/80 bg-background-primary-default shadow-xl">
        <div className="border-b border-separator-border/70 px-5 py-3.5 flex flex-col gap-0.5">
          <DialogTitle className="text-body-medium font-semibold text-text-primary">
            {initialServer ? t("pages.mcp.editTitle") : t("pages.mcp.createTitle")}
          </DialogTitle>
          <p className="text-[11.5px] text-text-tertiary">
            {t("pages.mcp.createHint")}
          </p>
        </div>

        <McpCreateFormBody
          initialServer={initialServer}
          name={name}
          onNameChange={setName}
          transport={transport}
          onTransportChange={setTransport}
          command={command}
          onCommandChange={setCommand}
          url={url}
          onUrlChange={setUrl}
          trusted={trusted}
          onTrustedChange={setTrusted}
          allowedResourceUrisText={allowedResourceUrisText}
          onAllowedResourceUrisChange={setAllowedResourceUrisText}
          envPairs={envPairs}
          onSelectPreset={handleSelectPreset}
          onAddEnv={handleAddEnv}
          onRemoveEnv={handleRemoveEnv}
          onEnvChange={handleEnvChange}
          errorMsg={errorMsg}
        />

        <div className="flex items-center justify-end gap-2 border-t border-separator-border/70 px-5 py-3 bg-background-secondary-default/30">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="h-8 text-caption-2-medium"
          >
            {t("common.cancel")}
          </Button>
          <Button
            size="sm"
            data-testid="mcp-save-server"
            disabled={isSaving}
            onClick={() => void handleSave()}
            className="gap-1.5 h-8 text-caption-2-medium shadow-xs"
          >
            {isSaving ? (
              <RiLoader4Line className="size-3 animate-spin" />
            ) : (
              <RiCheckLine className="size-3" />
            )}
            <span>{initialServer ? t("pages.mcp.saveUpdate") : t("pages.mcp.registerServer")}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
