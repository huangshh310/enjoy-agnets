/**
 * MCP Server 详情与工具探索 / 权限管理抽屉
 */
import { useEffect, useState } from "react"
import {
  RiLoader4Line,
  RiPlayLine,
  RiSearchLine,
  RiToolsLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cx } from "@/utils/cx"
import type { McpServer } from "@enjoy-agents/ipc-contract"
import { getIde } from "@renderer/lib/ide"

export function McpServerToolsModal(props: {
  server: McpServer | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged: () => Promise<void>
}) {
  const { server, open, onOpenChange, onChanged } = props
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

  if (!server) return null

  const filteredTools = tools.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase()))
  )

  const activeToolObj = tools.find((t) => t.name === selectedTool)

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
      setCallError(err instanceof Error ? err.message : "Tool call failed")
    } finally {
      setIsCalling(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden rounded-3xl border-border-button-default bg-background-primary-default shadow-2xl">
        {/* 顶部 Header */}
        <div className="flex items-center justify-between border-b border-separator-border/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500">
              <RiToolsLine className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-body-medium font-semibold text-text-primary">
                {server.name} · Tools 探索与权限配置
              </DialogTitle>
              <p className="text-[12px] text-text-secondary">
                共发现 {tools.length} 个工具。配置模型可见性与按工具执行审批策略。
              </p>
            </div>
          </div>
        </div>

        {/* 主体两栏布局：左侧工具列表，右侧工具详情与测试 */}
        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[440px] max-h-[70vh]">
          {/* 左侧列表 */}
          <div className="md:col-span-5 border-r border-separator-border/80 p-4 flex flex-col gap-3 bg-background-secondary-default/30">
            <div className="relative">
              <RiSearchLine className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-tertiary" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索工具名称或描述..."
                className="pl-8 h-8 text-caption-2-medium bg-background-primary-default"
              />
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1">
              {filteredTools.length === 0 ? (
                <div className="py-12 text-center text-caption-2-medium text-text-tertiary">
                  未找到匹配的 Tools
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
                        "flex flex-col gap-1 rounded-xl p-3 text-left transition-all border",
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
                        {tool.description || "无详细描述"}
                      </p>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* 右侧工具详情与试调用 */}
          <div className="md:col-span-7 p-5 flex flex-col justify-between overflow-y-auto">
            {activeToolObj ? (
              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-mono text-body-medium font-bold text-text-primary">
                      {activeToolObj.name}
                    </h3>
                  </div>
                  <p className="mt-1 text-caption-1-medium text-text-secondary leading-relaxed">
                    {activeToolObj.description || "暂无工具描述文档。"}
                  </p>
                </div>

                {/* 权限级别控制 */}
                <div className="flex flex-col gap-2 rounded-2xl border border-separator-border/80 bg-background-secondary-default/50 p-3.5">
                  <div className="text-caption-2-medium font-semibold text-text-primary">
                    执行权限审批策略 (Permission Policy)
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
                            "flex flex-col items-center justify-center rounded-xl p-2 text-center text-[11px] font-medium border transition-all",
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
                              ? "总是允许"
                              : level === "ask"
                                ? "询问审批"
                                : "禁止调用"}
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
                      测试入参 (JSON Arguments)
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
                      <span>{server.connected ? "执行测试" : "未连接无法测试"}</span>
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
                    <div className="font-semibold mb-0.5">执行错误:</div>
                    <div className="font-mono">{callError}</div>
                  </div>
                ) : null}

                {testOutput ? (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-[11px] text-text-primary">
                    <div className="font-semibold text-emerald-600 dark:text-emerald-400 mb-0.5">
                      返回结果:
                    </div>
                    <pre className="font-mono text-[11px] max-h-36 overflow-auto whitespace-pre-wrap">
                      {testOutput}
                    </pre>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-caption-2-medium text-text-tertiary">
                请在左侧选择一个工具查看详情与测试
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
