/**
 * 空会话可选拉取条：有已配置 Git 技能源才出现，用户点了才 pull。
 */
import { RiRefreshLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { useNavigate } from "@tanstack/react-router"
import { useT, type TranslateFn } from "@renderer/i18n"
import { useSkillSourcePull } from "@renderer/components/skills/hooks/use-skill-source-pull"
import { summarizePullResult } from "@renderer/components/skills/lib/git-skill-sources"
import { cx } from "@/utils/cx"

export function SkillSourcePullStrip() {
  const t = useT()
  const navigate = useNavigate()
  const pullState = useSkillSourcePull()

  if (!pullState.offerOnSession && !pullState.lastResult && !pullState.error) return null

  const status = pullState.lastResult ? summarizePullResult(pullState.lastResult) : null

  return (
    <div
      className={cx(
        "mb-3 flex w-full items-center gap-2 rounded-2xl border border-border-button-default",
        "bg-background-secondary-default px-3 py-2"
      )}
    >
      <RiRefreshLine
        className={cx("size-3.5 shrink-0 text-foreground-icon-tertiary", pullState.busy && "animate-spin")}
      />
      <div className="min-w-0 flex-1">
        <p className="text-caption-1-medium text-text-primary">{stripTitle(t, pullState, status)}</p>
        <p className="text-caption-2-regular text-text-tertiary">{stripHint(t, pullState, status)}</p>
      </div>
      {pullState.lastResult || pullState.error ? (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-caption-2-medium"
          onClick={() => void navigate({ to: "/skills" })}
        >
          {t("chat.skillSourcePull.openSkills")}
        </Button>
      ) : (
        <>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-caption-2-medium"
            disabled={pullState.busy}
            onClick={() => void pullState.pull()}
          >
            {pullState.busy ? t("chat.skillSourcePull.pulling") : t("chat.skillSourcePull.pull")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-caption-2-medium text-text-tertiary"
            disabled={pullState.busy}
            onClick={pullState.dismiss}
          >
            {t("chat.skillSourcePull.skip")}
          </Button>
        </>
      )}
    </div>
  )
}

function stripTitle(
  t: TranslateFn,
  pullState: ReturnType<typeof useSkillSourcePull>,
  status: ReturnType<typeof summarizePullResult> | null
): string {
  if (pullState.error) return t("chat.skillSourcePull.failed")
  if (status === "ok") return t("chat.skillSourcePull.done", { count: pullState.lastResult!.updatedCount })
  if (status === "partial") return t("chat.skillSourcePull.partial")
  if (status === "empty") return t("chat.skillSourcePull.empty")
  return t("chat.skillSourcePull.title", { count: pullState.gitCount })
}

function stripHint(
  t: TranslateFn,
  pullState: ReturnType<typeof useSkillSourcePull>,
  status: ReturnType<typeof summarizePullResult> | null
): string {
  if (pullState.error) return pullState.error
  if (status === "partial") return pullState.lastResult?.errors[0] ?? t("chat.skillSourcePull.partialHint")
  if (status === "ok" || status === "empty") return t("chat.skillSourcePull.doneHint")
  return t("chat.skillSourcePull.hint")
}
