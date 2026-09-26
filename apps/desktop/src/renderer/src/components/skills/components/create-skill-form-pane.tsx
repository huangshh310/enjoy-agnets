/**
 * 新建技能工坊左栏：模版、标识、作用域与 Markdown 规则编辑。
 */
import { Input } from "@/components/ui/input"
import { cx } from "@/utils/cx"
import type { SkillScope } from "@enjoy-agents/ipc-contract"
import { CREATE_SKILL_PRESETS } from "../constants/create-skill-presets"

export function CreateSkillFormPane({
  selectedPresetId,
  name,
  trigger,
  description,
  body,
  scope,
  hasWorkspace,
  error,
  onSelectPreset,
  onNameChange,
  onTriggerChange,
  onDescriptionChange,
  onBodyChange,
  onScopeChange
}: {
  selectedPresetId: string
  name: string
  trigger: string
  description: string
  body: string
  scope: SkillScope
  hasWorkspace: boolean
  error: string | null
  onSelectPreset: (id: string) => void
  onNameChange: (value: string) => void
  onTriggerChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onBodyChange: (value: string) => void
  onScopeChange: (value: SkillScope) => void
}) {
  return (
    <div className="md:col-span-7 flex flex-col gap-4 p-6 overflow-y-auto border-r border-separator-border/60">
      {error ? (
        <div className="rounded-xl border border-border-error-default/30 bg-background-tertiary-error/10 px-4 py-2.5 text-caption-2-medium text-text-error-primary dark:text-text-error-primary">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <span className="text-caption-2-medium font-semibold text-text-primary">
          选用经典工程模版 (Scaffold Presets)
        </span>
        <div className="flex flex-wrap gap-2">
          {CREATE_SKILL_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset.id)}
              className={cx(
                "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-caption-2-medium transition-all cursor-pointer border",
                selectedPresetId === preset.id
                  ? "border-accent-500/50 bg-accent-500/10 text-accent-700 dark:text-accent-300 font-semibold shadow-2xs"
                  : "border-separator-border/60 bg-background-secondary-default/50 text-text-secondary hover:border-separator-border hover:text-text-primary"
              )}
            >
              <span>{preset.title}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-caption-2-medium font-semibold text-text-primary">
            技能英文标识 (Slug)
          </span>
          <Input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="如: api-doc-writer"
            className="h-8.5 text-caption-2-medium font-mono"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-caption-2-medium font-semibold text-text-primary">
            触发指令 (Command)
          </span>
          <Input
            value={trigger}
            onChange={(e) => onTriggerChange(e.target.value)}
            placeholder="如: /api-doc"
            className="h-8.5 text-caption-2-medium font-mono"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-caption-2-medium font-semibold text-text-primary">
          功能描述 (Description)
        </span>
        <Input
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="概述此能力在何种场景被 Agent 调度使用…"
          className="h-8.5 text-caption-2-medium"
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-caption-2-medium font-semibold text-text-primary">
          生效目标作用域 (Target Scope)
        </span>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onScopeChange("global")}
            className={cx(
              "flex flex-col rounded-2xl border p-2.5 text-left transition-all cursor-pointer",
              scope === "global"
                ? "border-accent-500/50 bg-accent-500/5 shadow-2xs"
                : "border-separator-border/60 bg-background-secondary-default/30 hover:border-separator-border text-text-tertiary"
            )}
          >
            <span className="text-caption-2-medium font-semibold text-text-primary">
              全局所有 Agent 生效
            </span>
            <span className="text-caption-2-regular font-mono text-text-tertiary">
              ~/.enjoy-agents/skills/
            </span>
          </button>
          <button
            type="button"
            disabled={!hasWorkspace}
            onClick={() => onScopeChange("workspace")}
            className={cx(
              "flex flex-col rounded-2xl border p-2.5 text-left transition-all cursor-pointer",
              !hasWorkspace && "opacity-50 cursor-not-allowed",
              scope === "workspace"
                ? "border-chart-5/50 bg-chart-5/5 shadow-2xs"
                : "border-separator-border/60 bg-background-secondary-default/30 hover:border-separator-border text-text-tertiary"
            )}
          >
            <span className="text-caption-2-medium font-semibold text-text-primary">
              仅当前工作区生效
            </span>
            <span className="text-caption-2-regular font-mono text-text-tertiary">
              {hasWorkspace ? ".agents/skills/" : "需先打开项目工作区"}
            </span>
          </button>
        </div>
      </div>

      <label className="flex flex-col gap-1.5 flex-1 min-h-[160px]">
        <span className="text-caption-2-medium font-semibold text-text-primary">
          执行步骤与约束规则 (Markdown Body)
        </span>
        <textarea
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          placeholder="撰写此技能的具体执行指引、约束与输出规范..."
          className="w-full flex-1 rounded-2xl border border-separator-border/70 bg-background-secondary-default/30 p-3.5 font-mono text-caption-2-regular leading-relaxed text-text-primary focus:border-accent-500 focus:outline-none resize-none"
        />
      </label>
    </div>
  )
}
