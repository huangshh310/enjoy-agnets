/**
 * MCP Server 注册与编辑弹窗：校验后 upsert。
 */
import { useEffect, useState } from "react"
import { RiCheckLine, RiCloseLine, RiLoader4Line } from "@remixicon/react"
import { Button } from "@/components/ui/button"
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

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
        onClick={() => onOpenChange(false)}
        aria-label={t("common.cancel")}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="mcp-create-drawer-title"
        className="absolute inset-y-3 right-3 flex w-[min(34rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-card animate-in slide-in-from-right duration-200"
      >
        <header className="flex items-center justify-between border-b border-separator-border/70 px-6 py-4 shrink-0">
          <div className="flex flex-col gap-0.5 min-w-0">
            <h3 id="mcp-create-drawer-title" className="text-title-3-semibold text-text-primary tracking-tight truncate">
              {initialServer ? t("pages.mcp.editTitle") : t("pages.mcp.createTitle")}
            </h3>
            <p className="text-caption-2-regular text-text-tertiary truncate">
              {t("pages.mcp.createHint")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-text-tertiary hover:bg-background-secondary-default hover:text-text-primary cursor-pointer"
            aria-label={t("common.cancel")}
          >
            <RiCloseLine className="size-5" />
          </button>
        </header>

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

        <footer className="flex items-center justify-end gap-2 border-t border-separator-border/70 px-6 py-4 bg-background-secondary-default/30 shrink-0">
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
        </footer>
      </aside>
    </div>
  )
}
