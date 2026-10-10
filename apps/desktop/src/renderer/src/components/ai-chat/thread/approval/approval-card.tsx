/**
 * 审批入口：按 command / plan / questions 换表面，抄 AICSS 交互、皮走 BoardUI。
 * 禁止 plan 倒计时自动放行。
 */
import { useEffect, useState } from "react"
import { ASK_USER_QUESTIONS_TOOL, type AskUserAnswers, type StreamEvent } from "@enjoy-agents/ipc-contract"
import { asRecord } from "@renderer/lib/record"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { getIde, hasIde } from "@renderer/lib/ide"
import { ApprovalChrome } from "./approval-chrome"
import { ApprovalCommandBody } from "./approval-command-body"
import { ApprovalPlanBody } from "./approval-plan-body"
import { ApprovalQuestionsBody } from "./approval-questions-body"
import { AskUserCard } from "../ask-user/ask-user-card"
import { classifyApproval, commandCwdOf, commandTextOf, payloadPreview } from "./classify-approval"
import { sessionAllowCardState } from "./session-allow-hint"
import { AutomationSourceLine } from "@renderer/components/automations/components/automation-source-line"
import { automationSourceCopy } from "@renderer/components/automations/lib/missed-copy"
import { DesktopApprovalCard } from "./desktop-approval-card"
import { planFromPending } from "./plan-from-pending"
import type { ApprovalDecide } from "./approval.types"

const OPTION_ONCE = "allow_once"
const OPTION_SESSION = "allow_session"

export function ApprovalCard({
  pending,
  onApprove,
  onDeny,
  onAllowSession,
  onAllowAlways
}: {
  pending: StreamEvent & { type: "approval.required" }
  onApprove: (answers?: AskUserAnswers) => void
  onDeny: () => void
  onAllowSession: () => void
  onAllowAlways?: () => void
}) {
  const t = useT()
  const workspaceName = useChatStore((state) => state.workspaceName)
  const workspaceRoot = useWorkspaceRootPath()
  const args = asRecord(pending.args)
  const variant = classifyApproval(pending.name, args)
  const decide: ApprovalDecide = { onApprove: () => onApprove(), onDeny, onAllowSession, onAllowAlways }
  const sourceLine = automationSourceCopy(pending.automationSource, t)
  const untitled = t("chat.untitledWorkspace")
  if (pending.name === ASK_USER_QUESTIONS_TOOL) {
    return <AskUserCard args={args} onComplete={(answers) => onApprove(answers)} onSkipAll={onDeny} />
  }
  if (variant === "command") {
    return (
      <CommandApproval
        name={pending.name}
        cwd={commandCwdOf(args, workspaceRoot || untitled)}
        command={commandTextOf(pending.name, args)}
        sourceLine={sourceLine}
        decide={decide}
      />
    )
  }
  if (variant === "plan") {
    return (
      <PlanApproval
        name={pending.name}
        args={args}
        workspaceName={workspaceName || untitled}
        sourceLine={sourceLine}
        decide={decide}
      />
    )
  }
  if (variant === "desktop") {
    return <DesktopApprovalCard args={args} decide={decide} sourceLine={sourceLine} />
  }
  return (
    <QuestionsApproval
      name={pending.name}
      payload={payloadPreview(args)}
      thumbnailPath={typeof args.thumbnailPath === "string" ? args.thumbnailPath : ""}
      sourceLine={sourceLine}
      decide={decide}
    />
  )
}

function CommandApproval({
  name,
  cwd,
  command,
  sourceLine,
  decide
}: {
  name: string
  cwd: string
  command: string
  sourceLine: string | null
  decide: ApprovalDecide
}) {
  const t = useT()
  const allow = sessionAllowCardState(name, command)
  const sessionHint = allow.onceOnly
    ? t("chat.alwaysAllowOnceHint")
    : t("chat.alwaysAllowHint", { target: allow.target })
  return (
    <ApprovalChrome
      variant="command"
      title={t("chat.approvalCommand")}
      approveLabel={t("chat.approvalRun")}
      denyLabel={t("chat.deny")}
      showAlways={allow.showSession}
      sessionHint={sessionHint}
      decide={decide}
    >
      <AutomationSourceLine text={sourceLine} />
      <ApprovalCommandBody cwd={cwd} command={command} />
    </ApprovalChrome>
  )
}

function PlanApproval({
  name,
  args,
  workspaceName,
  sourceLine,
  decide
}: {
  name: string
  args: Record<string, unknown>
  workspaceName: string
  sourceLine: string | null
  decide: ApprovalDecide
}) {
  const t = useT()
  const allow = sessionAllowCardState(name, "")
  const sessionHint = t("chat.alwaysAllowHint", { target: allow.target || name })
  const plan = planFromPending(name, args, t("chat.emptyValue"), {
    write: t("chat.verbWrite"),
    edit: t("chat.verbEdit"),
    commit: t("chat.verbGit"),
    push: t("chat.verbPush")
  })
  return (
    <ApprovalChrome
      variant="plan"
      title={t("chat.approvalPlan")}
      approveLabel={t("chat.approvalApprove")}
      denyLabel={t("chat.deny")}
      sessionHint={sessionHint}
      decide={decide}
    >
      <AutomationSourceLine text={sourceLine} />
      <ApprovalPlanBody
        headline={plan.headline}
        summary={workspaceName}
        steps={plan.steps}
        toolName={name}
        args={args}
        showDiff={plan.showDiff}
      />
    </ApprovalChrome>
  )
}

function QuestionsApproval({
  name,
  payload,
  thumbnailPath,
  sourceLine,
  decide
}: {
  name: string
  payload: string
  thumbnailPath?: string
  sourceLine: string | null
  decide: ApprovalDecide
}) {
  const t = useT()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [thumb, setThumb] = useState("")
  const picked = answers.allow
  useEffect(() => {
    if (!thumbnailPath || !hasIde()) return
    void getIde()
      .builtinTools.desktopView()
      .then((view: { thumbnailDataUrl?: string } | null) => setThumb(view?.thumbnailDataUrl ?? ""))
      .catch(() => setThumb(""))
  }, [thumbnailPath])
  return (
    <ApprovalChrome
      variant="questions"
      title={t("chat.approvalQuestions")}
      approveLabel={t("chat.approvalContinue")}
      denyLabel={t("chat.approvalSkip")}
      sessionHint={t("chat.alwaysAllowHint", { target: name })}
      showAlways={false}
      approveDisabled={!picked}
      decide={{
        onDeny: decide.onDeny,
        onAllowSession: decide.onAllowSession,
        onAllowAlways: decide.onAllowAlways,
        onApprove: () => {
          if (picked === OPTION_SESSION) decide.onAllowSession()
          else decide.onApprove()
        }
      }}
    >
      <AutomationSourceLine text={sourceLine} />
      <ApprovalQuestionsBody
        questions={[
          {
            id: "allow",
            prompt: t("chat.approvalToolQuestion"),
            options: [
              { id: OPTION_ONCE, label: t("chat.allowOnce") },
              { id: OPTION_SESSION, label: t("chat.alwaysAllow") }
            ]
          }
        ]}
        answers={answers}
        payload={payload}
        thumbnail={thumb}
        onSelect={(id, optionId) => setAnswers((prev) => ({ ...prev, [id]: optionId }))}
      />
    </ApprovalChrome>
  )
}

function useWorkspaceRootPath(): string {
  const workspaceId = useChatStore((state) => state.workspaceId)
  const repositories = useChatStore((state) => state.repositories)
  const label = useChatStore((state) => state.workspaceRootLabel)
  return repositories.find((node) => node.id === workspaceId)?.rootPath ?? label
}
