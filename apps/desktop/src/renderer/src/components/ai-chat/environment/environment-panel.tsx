/**
 * 对话旁 Environment 卡片：改动 / 分支 / 提交 / 用量 / Recap。
 * 点行打开已有审查栏，不假装远端 PR 或并行工作副本。
 */
import {
  RiCodeLine,
  RiFolder6Line,
  RiGitBranchLine,
  RiGitCommitLine,
  RiGitRepositoryLine,
  RiPushpin2Line
} from "@remixicon/react"
import { expandInspector } from "@renderer/components/ai-chat/right-pane/open-pane"
import { useT } from "@renderer/i18n"
import { AgentBrandIcon } from "@renderer/components/ai-chat/agent-picker/agent-brand-icon"
import {
  EnvironmentCollapsible,
  EnvironmentDivider,
  EnvironmentRow,
  EnvironmentSectionLabel
} from "./environment-row"
import { formatTokens } from "../agent-limits/format-tokens"
import { useEnvironmentPanel } from "./use-environment-panel"

export function EnvironmentPanel({ open }: { open: boolean }) {
  const t = useT()
  const data = useEnvironmentPanel(open)
  if (!open) return null

  const changeTrail =
    data.additions > 0 || data.deletions > 0 ? (
      <span className="font-mono tabular-nums">
        {data.additions > 0 ? <span className="text-state-success-text">+{data.additions}</span> : null}
        {data.additions > 0 && data.deletions > 0 ? " " : null}
        {data.deletions > 0 ? <span className="text-text-error-primary">-{data.deletions}</span> : null}
      </span>
    ) : null

  return (
    <aside
      data-testid="environment-panel"
      className="pointer-events-none absolute top-2 right-2 z-20 hidden w-72 min-[900px]:block"
    >
      <div className="pointer-events-auto max-h-[min(32rem,calc(100vh-16rem))] overflow-y-auto rounded-2xl border border-border-button-default bg-background-primary-default/95 py-1 shadow-card backdrop-blur-md">
        <div className="flex items-center justify-between px-3 pt-1.5 pb-1">
          <p className="text-caption-2-regular text-text-secondary">{t("chat.environmentTitle")}</p>
          <RiPushpin2Line className="size-3.5 text-text-secondary" aria-hidden />
        </div>
        <div className="px-1.5 pb-1.5">
          <EnvironmentRow
            icon={<RiGitCommitLine className="size-4" />}
            label={t("chat.environmentChanges")}
            trailing={changeTrail}
            onClick={() => expandInspector("review")}
          />
          <EnvironmentRow
            icon={<RiFolder6Line className="size-4" />}
            label={data.workspaceRootLabel || t("chat.environmentLocal")}
            trailing={t("chat.environmentLocal")}
            onClick={() => expandInspector("files")}
          />
          <EnvironmentRow
            icon={<RiGitBranchLine className="size-4" />}
            label={data.branch || t("chat.environmentNoBranch")}
            onClick={() => expandInspector("review")}
          />
          <EnvironmentRow
            icon={<RiGitCommitLine className="size-4" />}
            label={t("chat.environmentCommitPush")}
            onClick={() => expandInspector("review")}
          />
          <EnvironmentDivider />
          <EnvironmentSectionLabel>{t("chat.environmentUsage")}</EnvironmentSectionLabel>
          <EnvironmentRow
            icon={<AgentBrandIcon id={data.runtimeId} size={14} />}
            label={data.modelLabel || data.runtimeId}
            trailing={
              data.quotaPercent != null
                ? `${data.quotaPercent}%`
                : data.usedTokens > 0
                  ? formatTokens(data.usedTokens)
                  : undefined
            }
            onClick={() => expandInspector("context")}
          />
          <EnvironmentDivider />
          <EnvironmentSectionLabel>{t("chat.environmentRepository")}</EnvironmentSectionLabel>
          <EnvironmentRow
            icon={<RiGitRepositoryLine className="size-4" />}
            label={data.workspaceName}
            onClick={() => expandInspector("files")}
          />
          <EnvironmentDivider />
          <EnvironmentSectionLabel>{t("chat.environmentEditor")}</EnvironmentSectionLabel>
          <EnvironmentRow
            icon={<RiCodeLine className="size-4" />}
            label={t("chat.environmentEditorView")}
            onClick={() => expandInspector("files")}
          />
          {data.recap ? (
            <>
              <EnvironmentDivider />
              <EnvironmentCollapsible label={t("chat.environmentRecap")}>
                <p className="line-clamp-4 px-2 pb-1.5 text-caption-2-regular text-text-secondary">
                  {data.recap}
                </p>
              </EnvironmentCollapsible>
            </>
          ) : null}
        </div>
      </div>
    </aside>
  )
}
