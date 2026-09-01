/**
 * 多 Agent 项目规则 (Project Rules & Guidelines) 管理视图：
 * 采用专业桌面 IDE 风格，自动扫描发现 Enjoy AGENTS.md, Claude CLAUDE.md, 
 * Cursor MDC (.cursor/rules/*.mdc), GitHub Copilot, Windsurf 等多 Agent 生态规则，
 * 支持在文件管理器中定位、查看源码、一键写入项目及新建规则。
 */
import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  RiAddLine,
  RiBookOpenLine,
  RiCheckLine,
  RiClipboardLine,
  RiDeleteBinLine,
  RiEyeLine,
  RiFolderOpenLine,
  RiLoader4Line,
  RiRefreshLine,
  RiSearchLine,
  RiSparklingLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cx } from "@/utils/cx"
import type { AgentRuleKind, ProjectRuleItem } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"
import { PROJECT_RULES } from "../constants/customize-presets"

const AGENT_KIND_FILTERS: Array<{ id: string; label: string }> = [
  { id: "all", label: "全部规则" },
  { id: "cursor_mdc", label: "Cursor MDC" },
  { id: "agents_md", label: "AGENTS.md" },
  { id: "claude_md", label: "Claude Code" },
  { id: "copilot", label: "GitHub Copilot" },
  { id: "windsurf", label: "Windsurf" }
]

export function RulesSection() {
  const queryClient = useQueryClient()
  const [selectedKind, setSelectedKind] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [inspectRule, setInspectRule] = useState<ProjectRuleItem | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [isWriting, setIsWriting] = useState<string | null>(null)

  // 新建规则表单状态
  const [newRuleKind, setNewRuleKind] = useState<AgentRuleKind>("cursor_mdc")
  const [newRuleName, setNewRuleName] = useState("")
  const [newRuleGlobs, setNewRuleGlobs] = useState("*.ts,*.tsx")
  const [newRuleDesc, setNewRuleDesc] = useState("")
  const [newRuleContent, setNewRuleContent] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  // 自动扫描查询多 Agent 规则列表
  const rulesQuery = useQuery({
    queryKey: ["rules"],
    enabled: hasIde(),
    queryFn: () => getIde().rules.list() as Promise<ProjectRuleItem[]>
  })
  const discoveredRules = rulesQuery.data ?? []
  const isRefreshing = rulesQuery.isFetching

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["rules"] })
  }

  // 过滤规则列表
  const filteredRules = useMemo(() => {
    return discoveredRules.filter((r) => {
      const matchKind = selectedKind === "all" || r.agentKind === selectedKind
      const matchSearch =
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        (r.description && r.description.toLowerCase().includes(search.toLowerCase())) ||
        r.filePath.toLowerCase().includes(search.toLowerCase())
      return matchKind && matchSearch
    })
  }, [discoveredRules, selectedKind, search])

  // 一键将模版写入指定 Agent 规范
  async function handleWritePreset(
    preset: (typeof PROJECT_RULES)[number],
    targetKind: AgentRuleKind
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

  // 创建自定义新规则
  async function handleCreateRule() {
    if (!newRuleName.trim() || isCreating) return
    setIsCreating(true)
    try {
      await getIde().rules.create({
        targetKind: newRuleKind,
        name: newRuleName.trim(),
        description: newRuleDesc.trim() || undefined,
        globs: newRuleKind === "cursor_mdc" ? newRuleGlobs.trim() || undefined : undefined,
        content: newRuleContent.trim() || `# ${newRuleName}\n- Rule instructions here.`
      })
      await refresh()
      setCreateModalOpen(false)
      setNewRuleName("")
      setNewRuleDesc("")
      setNewRuleContent("")
    } finally {
      setIsCreating(false)
    }
  }

  // 删除规则
  async function handleDeleteRule(rule: ProjectRuleItem) {
    if (!hasIde()) return
    await getIde().rules.delete(rule.filePath)
    await refresh()
    if (inspectRule?.id === rule.id) {
      setInspectRule(null)
    }
  }

  // 在文件管理器中打开
  function handleRevealRule(filePath: string) {
    if (hasIde()) {
      void getIde().rules.reveal(filePath)
    }
  }

  function handleCopyText(id: string, text: string) {
    void navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 顶部标题与操作栏 */}
      <div className="flex flex-col gap-3 pb-2 border-b border-separator-border/70">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-title-3-semibold text-text-primary tracking-tight">
                Project Rules & Guidelines
              </h2>
              <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-blue-600 dark:text-blue-400">
                <span className="size-1.5 rounded-full bg-blue-500" />
                Multi-Agent Standards
              </span>
            </div>
            <p className="text-caption-2-medium text-text-tertiary">
              统一扫描并管理 AGENTS.md, CLAUDE.md, Cursor MDC, GitHub Copilot 与 Windsurf 规则。
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <div className="hidden lg:flex items-center gap-2 rounded-lg border border-separator-border/60 bg-background-secondary-default/40 px-2.5 py-1 text-[11px] text-text-secondary font-mono mr-1">
              <span>{discoveredRules.length} 条已生效规则</span>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => void refresh()}
              disabled={isRefreshing}
              className="gap-1.5 h-8 text-caption-2-medium"
            >
              <RiRefreshLine className={cx("size-3.5", isRefreshing && "animate-spin")} />
              <span>扫描刷新</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setCreateModalOpen(true)}
              className="gap-1.5 h-8 text-caption-2-medium shadow-xs"
            >
              <RiAddLine className="size-3.5" />
              <span>新建规则</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 模块 1: 已发现与生效规则列表 (多 Agent 自动扫描) */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          {/* Agent 规范分类胶囊 */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {AGENT_KIND_FILTERS.map((cat) => {
              const isSelected = selectedKind === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedKind(cat.id)}
                  className={cx(
                    "rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-all shrink-0",
                    isSelected
                      ? "bg-background-secondary-default text-text-primary shadow-2xs font-semibold"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  {cat.label}
                </button>
              )
            })}
          </div>

          {/* 搜索框 */}
          <div className="relative w-full sm:w-56 shrink-0">
            <RiSearchLine className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-tertiary" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索规则或文件..."
              className="pl-8 h-7.5 text-caption-2-medium bg-background-primary-default"
            />
          </div>
        </div>

        {discoveredRules.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-separator-border/80 bg-background-secondary-default/20 p-8 text-center">
            <div className="flex size-9 items-center justify-center rounded-lg bg-background-secondary-default text-text-tertiary mb-2.5">
              <RiBookOpenLine className="size-4.5" />
            </div>
            <h3 className="text-caption-1-medium font-semibold text-text-primary">
              未扫描到任何 Agent 规范规则文件
            </h3>
            <p className="mt-1 max-w-sm text-caption-2-medium text-text-tertiary leading-relaxed">
              当前工作区未检测到 <code>AGENTS.md</code>、<code>.cursor/rules/*.mdc</code> 或 <code>CLAUDE.md</code>。可从下方模版库一键写入。
            </p>
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="py-8 text-center text-caption-2-medium text-text-tertiary">
            未搜索到匹配的规则
          </div>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {filteredRules.map((rule) => (
              <div
                key={rule.id}
                className="flex flex-col justify-between rounded-xl border border-separator-border/70 bg-background-primary-default p-3.5 shadow-2xs transition-all hover:border-separator-border"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={cx(
                          "flex size-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold font-mono",
                          rule.agentKind === "cursor_mdc"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            : rule.agentKind === "claude_md"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : rule.agentKind === "copilot"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                        )}
                      >
                        {rule.agentKind === "cursor_mdc"
                          ? "MDC"
                          : rule.agentKind === "claude_md"
                            ? "CLD"
                            : rule.agentKind === "copilot"
                              ? "COP"
                              : "AGT"}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-caption-1-medium font-semibold text-text-primary truncate">
                          {rule.name}
                        </h4>
                        <span className="text-[10px] font-mono text-text-tertiary truncate block">
                          {rule.filePath}
                        </span>
                      </div>
                    </div>

                    <span className="rounded bg-background-secondary-default px-1.5 py-0.5 text-[9.5px] font-mono uppercase text-text-secondary shrink-0">
                      {rule.agentKindLabel}
                    </span>
                  </div>

                  <p className="mt-2 text-[11.5px] text-text-secondary leading-relaxed line-clamp-2">
                    {rule.description}
                  </p>

                  {rule.globs ? (
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="text-[10.5px] text-text-tertiary">匹配:</span>
                      <code className="rounded bg-background-secondary-default px-1.5 py-0.5 font-mono text-[10px] text-accent-600 dark:text-accent-400">
                        {rule.globs}
                      </code>
                    </div>
                  ) : null}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-separator-border/40 pt-2 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleRevealRule(rule.filePath)}
                      className="inline-flex items-center gap-1 text-text-tertiary hover:text-text-primary transition-colors"
                      title="在文件管理器中定位"
                    >
                      <RiFolderOpenLine className="size-3.5" />
                      <span>定位文件</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setInspectRule(rule)}
                      className="inline-flex items-center gap-1 text-text-tertiary hover:text-accent-500 transition-colors ml-2"
                      title="查看规则详情"
                    >
                      <RiEyeLine className="size-3.5" />
                      <span>查看内容</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleDeleteRule(rule)}
                    className="p-1 text-text-tertiary hover:text-rose-500 transition-colors"
                    title="删除规则文件"
                  >
                    <RiDeleteBinLine className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 模块 2: 常用规范模版库 (支持一键写入对应 Agent 规范) */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-caption-1-medium font-semibold text-text-primary">
            <RiSparklingLine className="size-3.5 text-accent-500" />
            <span>常用规范模版 · 一键写入项目 (Popular Rule Templates)</span>
          </div>
          <span className="text-[10.5px] text-text-tertiary">
            点击可一键写入 .cursor/rules 或 AGENTS.md
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {PROJECT_RULES.map((preset) => {
            const isWritingMdc = isWriting === `${preset.id}:cursor_mdc`
            const isWritingAgents = isWriting === `${preset.id}:agents_md`

            return (
              <div
                key={preset.id}
                className="flex flex-col justify-between rounded-xl border border-separator-border/70 bg-background-primary-default p-3.5 shadow-2xs transition-all hover:border-separator-border"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-caption-1-medium font-semibold text-text-primary">
                        {preset.title}
                      </h4>
                      <span className="text-[10px] font-mono text-text-tertiary">
                        {preset.category}
                      </span>
                    </div>

                    <span className="rounded bg-background-secondary-default px-1.5 py-0.5 text-[9.5px] font-mono text-text-secondary">
                      {preset.badge}
                    </span>
                  </div>

                  <p className="mt-2 text-[11.5px] text-text-secondary leading-relaxed line-clamp-2">
                    {preset.description}
                  </p>

                  <div className="mt-2 rounded bg-background-secondary-default/60 p-2 font-mono text-[10.5px] text-text-secondary whitespace-pre-wrap leading-relaxed max-h-24 overflow-y-auto">
                    {preset.content}
                  </div>
                </div>

                <div className="mt-3.5 flex items-center justify-between border-t border-separator-border/40 pt-2.5 gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCopyText(preset.id, preset.content)}
                    className="h-6.5 px-2 text-[11px] text-text-secondary"
                  >
                    {copiedId === preset.id ? (
                      <>
                        <RiCheckLine className="size-3 text-emerald-500" />
                        <span>已复制</span>
                      </>
                    ) : (
                      <>
                        <RiClipboardLine className="size-3" />
                        <span>复制代码</span>
                      </>
                    )}
                  </Button>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={Boolean(isWriting)}
                      onClick={() => void handleWritePreset(preset, "cursor_mdc")}
                      className="gap-1 h-6.5 px-2 text-[10.5px]"
                    >
                      {isWritingMdc ? (
                        <RiLoader4Line className="size-3 animate-spin" />
                      ) : (
                        <RiAddLine className="size-3" />
                      )}
                      <span>写入 Cursor MDC</span>
                    </Button>

                    <Button
                      size="sm"
                      disabled={Boolean(isWriting)}
                      onClick={() => void handleWritePreset(preset, "agents_md")}
                      className="gap-1 h-6.5 px-2 text-[10.5px] shadow-xs"
                    >
                      {isWritingAgents ? (
                        <RiLoader4Line className="size-3 animate-spin" />
                      ) : (
                        <RiCheckLine className="size-3" />
                      )}
                      <span>写入 AGENTS.md</span>
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 规则详情弹窗 */}
      {inspectRule ? (
        <Dialog open={Boolean(inspectRule)} onOpenChange={(open) => !open && setInspectRule(null)}>
          <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden rounded-xl border border-separator-border/80 bg-background-primary-default shadow-xl">
            <div className="border-b border-separator-border/70 px-5 py-3.5 flex items-center justify-between">
              <div>
                <DialogTitle className="text-body-medium font-semibold text-text-primary">
                  {inspectRule.name}
                </DialogTitle>
                <p className="text-[11.5px] text-text-tertiary font-mono">
                  {inspectRule.filePath}
                </p>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopyText(inspectRule.id, inspectRule.content ?? "")}
                className="gap-1 h-7 text-caption-2-medium"
              >
                {copiedId === inspectRule.id ? (
                  <>
                    <RiCheckLine className="size-3 text-emerald-500" />
                    <span>已复制</span>
                  </>
                ) : (
                  <>
                    <RiClipboardLine className="size-3" />
                    <span>复制内容</span>
                  </>
                )}
              </Button>
            </div>

            <div className="p-4 max-h-[60vh] overflow-y-auto bg-background-secondary-default/30">
              <pre className="font-mono text-[11.5px] text-text-primary whitespace-pre-wrap leading-relaxed">
                {inspectRule.content}
              </pre>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      {/* 新建规则弹窗 */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md p-0 gap-0 overflow-hidden rounded-xl border border-separator-border/80 bg-background-primary-default shadow-xl">
          <div className="border-b border-separator-border/70 px-5 py-3.5 flex flex-col gap-0.5">
            <DialogTitle className="text-body-medium font-semibold text-text-primary">
              新建 Agent 规则文件
            </DialogTitle>
            <p className="text-[11.5px] text-text-tertiary">
              写入指定 Agent 规范，Agent 在编写代码时将严格遵守。
            </p>
          </div>

          <div className="flex flex-col gap-3.5 p-5">
            <div className="flex flex-col gap-1">
              <Label className="text-[11.5px] font-medium text-text-secondary">目标 Agent 规范</Label>
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-background-secondary-default/60 p-0.5">
                {(["cursor_mdc", "agents_md", "claude_md", "copilot", "windsurf", "global"] as const).map(
                  (kind) => (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => setNewRuleKind(kind)}
                      className={cx(
                        "rounded py-1 text-[10.5px] font-mono transition-all flex items-center justify-center font-medium",
                        newRuleKind === kind
                          ? "bg-background-primary-default text-text-primary shadow-2xs font-semibold"
                          : "text-text-secondary hover:text-text-primary"
                      )}
                    >
                      {kind === "cursor_mdc"
                        ? "Cursor MDC"
                        : kind === "agents_md"
                          ? "AGENTS.md"
                          : kind === "claude_md"
                            ? "Claude"
                            : kind === "copilot"
                              ? "Copilot"
                              : kind === "windsurf"
                                ? "Windsurf"
                                : "Global"}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-[11.5px] font-medium text-text-secondary">规则标识 (Name)</Label>
              <Input
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
                placeholder="例如: clean-diffs, test-coverage"
                className="font-mono text-caption-2-medium h-8 bg-background-secondary-default/40"
              />
            </div>

            {newRuleKind === "cursor_mdc" ? (
              <div className="flex flex-col gap-1">
                <Label className="text-[11.5px] font-medium text-text-secondary">匹配路径 Globs</Label>
                <Input
                  value={newRuleGlobs}
                  onChange={(e) => setNewRuleGlobs(e.target.value)}
                  placeholder="例如: *.ts,*.tsx 或 src/**/*.py"
                  className="font-mono text-caption-2-medium h-8 bg-background-secondary-default/40"
                />
              </div>
            ) : null}

            <div className="flex flex-col gap-1">
              <Label className="text-[11.5px] font-medium text-text-secondary">简要说明 (Description)</Label>
              <Input
                value={newRuleDesc}
                onChange={(e) => setNewRuleDesc(e.target.value)}
                placeholder="例如: 代码修改与原子化提交规范"
                className="text-caption-2-medium h-8 bg-background-secondary-default/40"
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-[11.5px] font-medium text-text-secondary">规则正文 (Markdown)</Label>
              <textarea
                value={newRuleContent}
                onChange={(e) => setNewRuleContent(e.target.value)}
                rows={4}
                placeholder="- 优先采用局部精准修改，避免重写完整文件。"
                className="w-full font-mono text-[11.5px] rounded-lg border border-separator-border/80 bg-background-secondary-default/40 p-2.5 text-text-primary focus-visible:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-separator-border/70 px-5 py-3 bg-background-secondary-default/30">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateModalOpen(false)}
              disabled={isCreating}
              className="h-8 text-caption-2-medium"
            >
              取消
            </Button>

            <Button
              size="sm"
              disabled={!newRuleName.trim() || isCreating}
              onClick={() => void handleCreateRule()}
              className="gap-1.5 h-8 text-caption-2-medium shadow-xs"
            >
              {isCreating ? (
                <RiLoader4Line className="size-3 animate-spin" />
              ) : (
                <RiCheckLine className="size-3" />
              )}
              <span>写入规则</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
