/**
 * Agent Skills Hub 技能中心视图：
 * 采用专业桌面 IDE 风格，自动扫描并管理本机全局与工作区已安装的 SKILL.md 技能包，
 * 支持在文件管理器中定位、查看源码、一键安装精选模版及新建自定义技能。
 */
import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  RiAddLine,
  RiCheckLine,
  RiClipboardLine,
  RiCodeSSlashLine,
  RiDeleteBinLine,
  RiEyeLine,
  RiFolderLine,
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
import type { SkillItem, SkillScope } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"
import { CURATED_SKILLS } from "../constants/customize-presets"

export function SkillsSection() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [inspectSkill, setInspectSkill] = useState<SkillItem | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [isInstalling, setIsInstalling] = useState<string | null>(null)

  // 新建技能表单状态
  const [newSkillName, setNewSkillName] = useState("")
  const [newSkillDesc, setNewSkillDesc] = useState("")
  const [newSkillScope, setNewSkillScope] = useState<SkillScope>("global")
  const [isCreating, setIsCreating] = useState(false)

  // 自动扫描并查询当前电脑已安装技能
  const skillsQuery = useQuery({
    queryKey: ["skills"],
    enabled: hasIde(),
    queryFn: () => getIde().skills.list() as Promise<SkillItem[]>
  })
  const installedSkills = skillsQuery.data ?? []
  const isRefreshing = skillsQuery.isFetching

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["skills"] })
  }

  // 过滤已安装技能
  const filteredInstalled = useMemo(() => {
    return installedSkills.filter(
      (s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(search.toLowerCase())) ||
        s.directoryPath.toLowerCase().includes(search.toLowerCase())
    )
  }, [installedSkills, search])

  const globalCount = installedSkills.filter((s) => s.scope === "global").length
  const workspaceCount = installedSkills.filter((s) => s.scope === "workspace").length

  // 一键安装精选技能模版
  async function handleInstallPreset(preset: (typeof CURATED_SKILLS)[number], scope: SkillScope) {
    if (!hasIde()) return
    setIsInstalling(`${preset.id}:${scope}`)
    try {
      await getIde().skills.create({
        name: preset.id,
        description: preset.description,
        scope,
        content: preset.templateMarkdown
      })
      await refresh()
    } finally {
      setIsInstalling(null)
    }
  }

  // 创建自定义技能
  async function handleCreateCustomSkill() {
    if (!newSkillName.trim() || isCreating) return
    setIsCreating(true)
    try {
      await getIde().skills.create({
        name: newSkillName.trim(),
        description: newSkillDesc.trim() || undefined,
        scope: newSkillScope
      })
      await refresh()
      setCreateModalOpen(false)
      setNewSkillName("")
      setNewSkillDesc("")
    } finally {
      setIsCreating(false)
    }
  }

  // 删除技能
  async function handleDeleteSkill(skill: SkillItem) {
    if (!hasIde()) return
    await getIde().skills.delete(skill.directoryPath)
    await refresh()
    if (inspectSkill?.id === skill.id) {
      setInspectSkill(null)
    }
  }

  // 在系统文件管理器中打开
  function handleRevealSkill(directoryPath: string) {
    if (hasIde()) {
      void getIde().skills.reveal(directoryPath)
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
                Agent Skills Hub & Capability Packs
              </h2>
              <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-emerald-600 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Auto-Discovered
              </span>
            </div>
            <p className="text-caption-2-medium text-text-tertiary">
              自动扫描本机全局 (~/.enjoy-agents/skills) 与工作区目录下的 <code className="font-mono text-[11px]">SKILL.md</code> 技能包。
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <div className="hidden lg:flex items-center gap-2.5 rounded-lg border border-separator-border/60 bg-background-secondary-default/40 px-2.5 py-1 text-[11px] text-text-secondary font-mono mr-1">
              <span>{installedSkills.length} 已安装</span>
              <span className="h-3 w-px bg-separator-border" />
              <span className="text-text-tertiary">{globalCount} 全局 · {workspaceCount} 项目</span>
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
              <span>新建技能</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 模块 1: 已安装技能列表 (自动扫描发现) */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-caption-1-medium font-semibold text-text-primary">
              当前电脑已安装技能 ({filteredInstalled.length})
            </span>
          </div>

          {installedSkills.length > 0 ? (
            <div className="relative w-56">
              <RiSearchLine className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-tertiary" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索技能名称或路径..."
                className="pl-8 h-7.5 text-caption-2-medium bg-background-primary-default"
              />
            </div>
          ) : null}
        </div>

        {installedSkills.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-separator-border/80 bg-background-secondary-default/20 p-8 text-center">
            <div className="flex size-9 items-center justify-center rounded-lg bg-background-secondary-default text-text-tertiary mb-2.5">
              <RiFolderOpenLine className="size-4.5" />
            </div>
            <h3 className="text-caption-1-medium font-semibold text-text-primary">
              未扫描到已安装的技能包
            </h3>
            <p className="mt-1 max-w-sm text-caption-2-medium text-text-tertiary leading-relaxed">
              全局目录 <code>~/.enjoy-agents/skills/</code> 或当前工作区中暂无 <code>SKILL.md</code>。可从下方精选模版中一键安装。
            </p>
          </div>
        ) : filteredInstalled.length === 0 ? (
          <div className="py-8 text-center text-caption-2-medium text-text-tertiary">
            未搜索到匹配的技能
          </div>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {filteredInstalled.map((skill) => (
              <div
                key={skill.id}
                className="flex flex-col justify-between rounded-xl border border-separator-border/70 bg-background-primary-default p-3.5 shadow-2xs transition-all hover:border-separator-border"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent-500/10 text-accent-600 dark:text-accent-400">
                        {skill.scope === "global" ? (
                          <RiFolderLine className="size-3.5" />
                        ) : (
                          <RiCodeSSlashLine className="size-3.5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-caption-1-medium font-semibold text-text-primary truncate">
                          {skill.name}
                        </h4>
                        <span className="text-[10px] font-mono text-text-tertiary truncate block">
                          {skill.directoryPath}
                        </span>
                      </div>
                    </div>

                    <span
                      className={cx(
                        "rounded px-1.5 py-0.5 text-[9.5px] font-mono uppercase shrink-0",
                        skill.scope === "global"
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                      )}
                    >
                      {skill.scope}
                    </span>
                  </div>

                  <p className="mt-2 text-[11.5px] text-text-secondary leading-relaxed line-clamp-2">
                    {skill.description || "包含自动化流程与技能说明"}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-separator-border/40 pt-2 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleRevealSkill(skill.directoryPath)}
                      className="inline-flex items-center gap-1 text-text-tertiary hover:text-text-primary transition-colors"
                      title="在文件资源管理器中打开"
                    >
                      <RiFolderOpenLine className="size-3.5" />
                      <span>打开目录</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setInspectSkill(skill)}
                      className="inline-flex items-center gap-1 text-text-tertiary hover:text-accent-500 transition-colors ml-2"
                      title="查看 SKILL.md 详情"
                    >
                      <RiEyeLine className="size-3.5" />
                      <span>查看 Spec</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleDeleteSkill(skill)}
                    className="p-1 text-text-tertiary hover:text-rose-500 transition-colors"
                    title="删除技能"
                  >
                    <RiDeleteBinLine className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 模块 2: 精选技能模版库 (支持一键安装落地) */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-caption-1-medium font-semibold text-text-primary">
            <RiSparklingLine className="size-3.5 text-accent-500" />
            <span>精选技能模版库 · 一键安装接入 (Featured Templates)</span>
          </div>
          <span className="text-[10.5px] text-text-tertiary">
            点击直接写入本机全局或工作区
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {CURATED_SKILLS.map((preset) => {
            const isInstalled = installedSkills.some((s) => s.name === preset.id)
            const installingGlobal = isInstalling === `${preset.id}:global`
            const installingWorkspace = isInstalling === `${preset.id}:workspace`

            return (
              <div
                key={preset.id}
                className="flex flex-col justify-between rounded-xl border border-separator-border/70 bg-background-primary-default p-3.5 shadow-2xs transition-all hover:border-separator-border"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-caption-1-medium font-semibold text-text-primary">
                        {preset.name}
                      </h4>
                      <span className="text-[10px] font-mono text-text-tertiary">
                        {preset.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {isInstalled ? (
                        <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9.5px] font-medium text-emerald-600 dark:text-emerald-400">
                          已安装
                        </span>
                      ) : null}
                      <span className="rounded bg-background-secondary-default px-1.5 py-0.5 text-[9.5px] font-mono text-text-secondary">
                        {preset.badge}
                      </span>
                    </div>
                  </div>

                  <p className="mt-2 text-[11.5px] text-text-secondary leading-relaxed line-clamp-2">
                    {preset.description}
                  </p>

                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="text-[10.5px] text-text-tertiary">指令:</span>
                    <code className="rounded bg-background-secondary-default px-1.5 py-0.5 font-mono text-[10px] text-text-primary">
                      {preset.slashCommand}
                    </code>
                  </div>
                </div>

                <div className="mt-3.5 flex items-center justify-between border-t border-separator-border/40 pt-2.5 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setInspectSkill({
                        id: preset.id,
                        name: preset.name,
                        description: preset.description,
                        scope: "global",
                        directoryPath: "",
                        skillFilePath: "",
                        content: preset.templateMarkdown
                      })
                    }
                    className="text-[11px] text-text-tertiary hover:text-text-primary transition-colors"
                  >
                    查看模版 Spec
                  </button>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={Boolean(isInstalling)}
                      onClick={() => void handleInstallPreset(preset, "global")}
                      className="gap-1 h-6.5 px-2 text-[10.5px]"
                    >
                      {installingGlobal ? (
                        <RiLoader4Line className="size-3 animate-spin" />
                      ) : (
                        <RiAddLine className="size-3" />
                      )}
                      <span>安装至全局</span>
                    </Button>

                    <Button
                      size="sm"
                      disabled={Boolean(isInstalling)}
                      onClick={() => void handleInstallPreset(preset, "workspace")}
                      className="gap-1 h-6.5 px-2 text-[10.5px] shadow-xs"
                    >
                      {installingWorkspace ? (
                        <RiLoader4Line className="size-3 animate-spin" />
                      ) : (
                        <RiCheckLine className="size-3" />
                      )}
                      <span>安装至项目</span>
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 技能查看/编辑抽屉弹窗 */}
      {inspectSkill ? (
        <Dialog open={Boolean(inspectSkill)} onOpenChange={(open) => !open && setInspectSkill(null)}>
          <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden rounded-xl border border-separator-border/80 bg-background-primary-default shadow-xl">
            <div className="border-b border-separator-border/70 px-5 py-3.5 flex items-center justify-between">
              <div>
                <DialogTitle className="text-body-medium font-semibold text-text-primary">
                  {inspectSkill.name} · SKILL.md
                </DialogTitle>
                <p className="text-[11.5px] text-text-tertiary font-mono">
                  {inspectSkill.skillFilePath || inspectSkill.directoryPath || "模版规范"}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopyText(inspectSkill.id, inspectSkill.content ?? "")}
                  className="gap-1 h-7 text-caption-2-medium"
                >
                  {copiedId === inspectSkill.id ? (
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
              </div>
            </div>

            <div className="p-4 max-h-[60vh] overflow-y-auto bg-background-secondary-default/30">
              <pre className="font-mono text-[11.5px] text-text-primary whitespace-pre-wrap leading-relaxed">
                {inspectSkill.content}
              </pre>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      {/* 新建技能弹窗 */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md p-0 gap-0 overflow-hidden rounded-xl border border-separator-border/80 bg-background-primary-default shadow-xl">
          <div className="border-b border-separator-border/70 px-5 py-3.5 flex flex-col gap-0.5">
            <DialogTitle className="text-body-medium font-semibold text-text-primary">
              新建 Agent 技能包
            </DialogTitle>
            <p className="text-[11.5px] text-text-tertiary">
              在本地生成标准 SKILL.md 脚手架，Agent 将自动读取生效。
            </p>
          </div>

          <div className="flex flex-col gap-3.5 p-5">
            <div className="flex flex-col gap-1">
              <Label className="text-[11.5px] font-medium text-text-secondary">技能标识 (Name)</Label>
              <Input
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                placeholder="例如: api-doc-writer, git-rebase-flow"
                className="font-mono text-caption-2-medium h-8 bg-background-secondary-default/40"
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-[11.5px] font-medium text-text-secondary">简要说明 (Description)</Label>
              <Input
                value={newSkillDesc}
                onChange={(e) => setNewSkillDesc(e.target.value)}
                placeholder="例如: 自动化撰写 API 规范并生成样例"
                className="text-caption-2-medium h-8 bg-background-secondary-default/40"
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-[11.5px] font-medium text-text-secondary">作用域 (Scope)</Label>
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-background-secondary-default/60 p-0.5 h-8">
                <button
                  type="button"
                  onClick={() => setNewSkillScope("global")}
                  className={cx(
                    "rounded text-[11.5px] transition-all flex items-center justify-center font-medium",
                    newSkillScope === "global"
                      ? "bg-background-primary-default text-text-primary shadow-2xs font-semibold"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  Global 全局
                </button>
                <button
                  type="button"
                  onClick={() => setNewSkillScope("workspace")}
                  className={cx(
                    "rounded text-[11.5px] transition-all flex items-center justify-center font-medium",
                    newSkillScope === "workspace"
                      ? "bg-background-primary-default text-text-primary shadow-2xs font-semibold"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  Workspace 项目
                </button>
              </div>
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
              disabled={!newSkillName.trim() || isCreating}
              onClick={() => void handleCreateCustomSkill()}
              className="gap-1.5 h-8 text-caption-2-medium shadow-xs"
            >
              {isCreating ? (
                <RiLoader4Line className="size-3 animate-spin" />
              ) : (
                <RiCheckLine className="size-3" />
              )}
              <span>创建技能包</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
