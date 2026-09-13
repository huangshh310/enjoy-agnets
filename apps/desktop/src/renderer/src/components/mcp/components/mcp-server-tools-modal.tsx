/**
 * MCP Server 详情与工具探索 / 权限管理抽屉
 */
import { useEffect, useState } from "react"
import {
  RiCloseLine,
  RiLoader4Line,
  RiPlayLine,
  RiSearchLine,
  RiToolsLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cx } from "@/utils/cx"
import type { McpServer } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { getIde } from "@renderer/lib/ide"

export function McpServerToolsModal(props: {
  server: McpServer | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged: () => Promise<void>
}) {
  const { server, open, onOpenChange, onChanged } = props
  const t = useT()
  const [search, setSearch] = useState("")
  const [selectedTool, setSelectedTool] = useState<string | null>(null)
  const [testArgsJson, setTestArgsJson] = useState("{}")
  const [testOutput, setTestOutput] = useState<string | null>(null)
  const [isCalling, setIsCalling] = useState(false)
  const [callError, setCallError] = useState<string | null>(null)
  const [permissions, setPermissions] = useState<Record<string, "allow" | "ask" | "deny">>({})

  const tools = server?.tools ?? []

  useEffect(() => {
    if (server && tools.length > 0 && !selectedTool) {
      setSelectedTool(tools[0]?.name ?? null)
    }
  }, [server, tools, selectedTool])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onOpenChange])

  const filteredTools = tools.filter(
    (tool) =>
      tool.name.toLowerCase().includes(search.toLowerCase()) ||
      (tool.description && tool.description.toLowerCase().includes(search.toLowerCase()))
  )

  const activeToolObj = tools.find((tool) => tool.name === selectedTool)

  async function handleSetPermission(toolName: string, level: "allow" | "ask" | "deny") {
    if (!server) return
    try {
      await getIde().mcp.setPermission({
        serverId: server.id,
        scope: "tool",
        name: toolName,
        level
      })
      setPermissions((prev) => ({ ...prev, [toolName]: level }))
      await onChanged()
    } catch (e) {
      console.error(e)
    }
  }

  async function handleTestCall() {
    if (!server || !selectedTool || isCalling) return
    setIsCalling(true)
    setTestOutput(null)
    setCallError(null)
    try {
      let parsedArgs: unknown = {}
      if (testArgsJson.trim()) {
        parsedArgs = JSON.parse(testArgsJson)
      }
      const result = await getIde().mcp.call({
        id: server.id,
        name: selectedTool,
        args: parsedArgs
      })
      setTestOutput(JSON.stringify(result, null, 2))
    } catch (err: unknown) {
      setCallError(err instanceof Error ? err.message : t("pages.mcp.toolCallFailed"))
    } finally {
      setIsCalling(false)
    }
  }

  if (!open || !server) return null

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
        onClick={() => onOpenChange(false)}
        aria-label={t("common.close") || "Close"}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="mcp-tools-drawer-title"
        className="absolute inset-y-3 right-3 flex w-[min(56rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-card animate-in slide-in-from-right duration-200"
      >
        {/* 顶部 Header */}
        <header className="flex items-center justify-between border-b border-separator-border/80 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500">
              <RiToolsLine className="size-5" />
            </div>
            <div className="min-w-0">
              <h3 id="mcp-tools-drawer-title" className="text-title-3-semibold text-text-primary tracking-tight truncate">
                {t("pages.mcp.toolsModalTitle", { name: server.name })}
              </h3>
              <p className="text-caption-2-regular text-text-tertiary truncate">
                {t("pages.mcp.toolsModalHint", { n: tools.length })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-text-tertiary hover:bg-background-secondary-default hover:text-text-primary cursor-pointer"
            aria-label={t("common.close") || "Close"}
          >
            <RiCloseLine className="size-5" />
          </button>
        </header>

        {/* 主体两栏布局：左侧工具列表，右侧工具详情与测试 */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 min-h-0 overflow-hidden">
          {/* 左侧列表 */}
          <div className="md:col-span-5 border-r border-separator-border/80 p-4 flex flex-col gap-3 bg-background-secondary-default/30 min-h-0 overflow-hidden">
            <div className="relative shrink-0">
              <RiSearchLine className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-tertiary" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("pages.mcp.searchTools")}
                className="pl-8 h-8 text-caption-2-medium bg-background-primary-default"
              />
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1 min-h-0">
              {filteredTools.length === 0 ? (
                <div className="py-12 text-center text-caption-2-medium text-text-tertiary">
                  {t("pages.mcp.noMatchingTools")}
                </div>
              ) : (
                filteredTools.map((tool) => {
                  const isSelected = tool.name === selectedTool
                  const perm = permissions[tool.name] ?? "ask"
                  return (
                    <button
                      key={tool.name}
                      type="button"
                      onClick={() => setSelectedTool(tool.name)}
                      className={cx(
                        "flex flex-col gap-1 rounded-xl p-3 text-left transition-all border cursor-pointer",
                        isSelected
                          ? "border-accent-500/40 bg-accent-500/5 shadow-xs"
                          : "border-transparent bg-background-primary-default hover:border-separator-border"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-caption-1-medium font-semibold text-text-primary truncate">
                          {tool.name}
                        </span>
                        <span
                          className={cx(
                            "rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase",
                            perm === "allow"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : perm === "ask"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          )}
                        >
                          {perm}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-[11px] text-text-secondary">
                        {tool.description || t("pages.mcp.noDetailDesc")}
                      </p>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* 右侧工具详情与试调用 */}
          <div className="md:col-span-7 p-6 flex flex-col justify-between overflow-y-auto min-h-0">
            {activeToolObj ? (
              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-mono text-body-medium font-bold text-text-primary">
                      {activeToolObj.name}
                    </h3>
                  </div>
                  <p className="mt-1 text-caption-1-medium text-text-secondary leading-relaxed">
                    {activeToolObj.description || t("pages.mcp.noToolDocs")}
                  </p>
                </div>

                {/* 权限级别控制 */}
                <div className="flex flex-col gap-2 rounded-2xl border border-separator-border/80 bg-background-secondary-default/50 p-3.5">
                  <div className="text-caption-2-medium font-semibold text-text-primary">
                    {t("pages.mcp.permissionPolicy")}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(["allow", "ask", "deny"] as const).map((level) => {
                      const cur = permissions[activeToolObj.name] ?? "ask"
                      const isActive = cur === level
                      return (
                        <button
                          key={level}
                          type="button"
                          onClick={() => void handleSetPermission(activeToolObj.name, level)}
                          className={cx(
                            "flex flex-col items-center justify-center rounded-xl p-2 text-center text-[11px] font-medium border transition-all cursor-pointer",
                            isActive
                              ? level === "allow"
                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
                                : level === "ask"
                                  ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold"
                                  : "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold"
                              : "border-separator-border/60 bg-background-primary-default text-text-secondary hover:text-text-primary"
                          )}
                        >
                          <span className="capitalize">{level}</span>
                          <span className="text-[9px] text-text-tertiary mt-0.5">
                            {level === "allow"
                              ? t("pages.mcp.alwaysAllow")
                              : level === "ask"
                                ? t("pages.mcp.askApproval")
                                : t("pages.mcp.denyCall")}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 快速测试调用区域 */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-caption-2-medium font-semibold text-text-primary">
                      {t("pages.mcp.testArgs")}
                    </span>
                    <Button
                      size="sm"
                      disabled={isCalling || !server.connected}
                      onClick={() => void handleTestCall()}
                      className="gap-1 h-7 text-caption-2-medium shadow-xs"
                    >
                      {isCalling ? (
                        <RiLoader4Line className="size-3 animate-spin" />
                      ) : (
                        <RiPlayLine className="size-3" />
                      )}
                      <span>{server.connected ? t("pages.mcp.runTest") : t("pages.mcp.cannotTest")}</span>
                    </Button>
                  </div>

                  <textarea
                    value={testArgsJson}
                    onChange={(e) => setTestArgsJson(e.target.value)}
                    rows={4}
                    className="w-full font-mono text-[12px] rounded-xl border border-separator-border/80 bg-background-secondary-default p-2.5 text-text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-500"
                    placeholder='{ "key": "value" }'
                  />
                </div>

                {/* 执行结果或错误回显 */}
                {callError ? (
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-[11px] text-rose-600 dark:text-rose-400">
                    <div className="font-semibold mb-0.5">{t("pages.mcp.callError")}</div>
                    <div className="font-mono">{callError}</div>
                  </div>
                ) : null}

                {testOutput ? (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-[11px] text-text-primary">
                    <div className="font-semibold text-emerald-600 dark:text-emerald-400 mb-0.5">
                      {t("pages.mcp.callResult")}
                    </div>
                    <pre className="font-mono text-[11px] max-h-36 overflow-auto whitespace-pre-wrap">
                      {testOutput}
                    </pre>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-caption-2-medium text-text-tertiary">
                {t("pages.mcp.pickToolHint")}
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}
