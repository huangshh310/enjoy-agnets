/**
 * 启动引导窗口。关掉或走完都会记下完成时间。
 */
import { useEffect, useRef, useState, type ReactNode } from "react"
import { cx } from "@/utils/cx"
import { useQueryClient } from "@tanstack/react-query"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { AppearanceChoice } from "./appearance-choice"
import { CapabilityCards } from "./capability-cards"
import { ConnectModelStep } from "./connect-model-step"
import {
  editProviderSearch,
  officialProviderSearch,
  pauseGuideForProviderForm,
  SETUP_GUIDE_FROM
} from "./open-provider-form"
import { useNavigate } from "@tanstack/react-router"
import { EngineInstallList } from "./engine-install-list"
import { IntroPoints } from "./intro-points"
import { markSetupGuideComplete } from "./mark-setup-guide-complete"
import { readyGuidePrimaryAction, readyMarkKind, readyGuidePrimaryKey, readyGuideTitleKey } from "./ready-face"
import { fillKeyHolderText, guideKeyStatus } from "@renderer/lib/credential/key-status"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { ReadyShortcuts, ReadySummary } from "./ready-summary"
import { useChatReadiness } from "@renderer/hooks/use-chat-readiness"
import { useT } from "@renderer/i18n"
import { GUIDE_INSET_CLASS } from "./setup-guide-frame"
import {
  isSetupGuideChoiceStep,
  nextSetupGuideStep,
  previousSetupGuideStep,
  SETUP_GUIDE_FACE,
  type SetupGuideStep
} from "./setup-guide-gate"
import { SetupGuideFooter } from "./setup-guide-footer"
import { SetupGuideHeader } from "./setup-guide-header"
import { shouldFinishGuideOnDismiss, useSetupGuideStore } from "./setup-guide-store"
import { WorkspaceChoice } from "./workspace-choice"
import { useOpenGeneration } from "./dialog-open-generation"

export function SetupGuideDialog() {
  const open = useSetupGuideStore((state) => state.open)
  const hide = useSetupGuideStore((state) => state.hide)
  const markEngaged = useSetupGuideStore((state) => state.markEngaged)
  const [step, setStep] = useState<SetupGuideStep>("intro")
  const [workspaceName, setWorkspaceName] = useState("")
  const [connectPick, setConnectPick] = useState<string | null>(null)
  const navigate = useNavigate()
  const finishing = useRef(false)
  const queryClient = useQueryClient()
  const t = useT()
  const readiness = useChatReadiness().data
  const chatReady = readiness?.ready === true
  const providers = useSettingsSnapshot().data?.providers
  const keyStatus = guideKeyStatus(readiness, providers ?? [])
  // 暂停去改密钥后马上恢复：旧内容还在退场时不能复用，否则新遮罩会压在内容上（见 dialog-open-generation.ts）。
  const openGeneration = useOpenGeneration(open)

  useEffect(() => {
    if (!open) return
    const resume = useSetupGuideStore.getState().takeResumeStep()
    setStep(resume ?? "intro")
    if (!resume) {
      setWorkspaceName("")
      setConnectPick(null)
    }
  }, [open])
  useEffect(() => {
    if (isSetupGuideChoiceStep(step)) markEngaged()
  }, [markEngaged, step])

  const finish = () => {
    void finishSetupGuide(finishing, hide, () => queryClient.invalidateQueries({ queryKey: ["settings"] }))
  }
  const openAddKey = () => {
    pauseGuideForProviderForm("connect-model")
    void navigate({
      to: "/settings/$section",
      params: { section: "providers" },
      search: officialProviderSearch(SETUP_GUIDE_FROM)
    })
  }
  /** 被拒的密钥：直接打开那份档案改密钥，存完回第 4 步看校验结果。 */
  const openFixKey = (profileId: string | undefined) => {
    if (!profileId) {
      openAddKey()
      return
    }
    pauseGuideForProviderForm("connect-model")
    void navigate({
      to: "/settings/$section",
      params: { section: "providers" },
      search: editProviderSearch(profileId, SETUP_GUIDE_FROM)
    })
  }
  const onNext = () => {
    if (step === "connect-model") {
      if (connectPick === "api_key" && (readiness?.apiKeys.length ?? 0) === 0) {
        openAddKey()
        return
      }
      setStep(nextSetupGuideStep(step))
      return
    }
    if (step === "ready") {
      const action = readyGuidePrimaryAction(chatReady, keyStatus?.status)
      if (action === "fix-key") {
        openFixKey(keyStatus?.profileId)
        return
      }
      if (action === "connect") {
        setStep("connect-model")
        return
      }
    }
    if (SETUP_GUIDE_FACE[step].finishes) finish()
    else setStep(nextSetupGuideStep(step))
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // pauseAt 会把 open 设成 false；Dialog 回调不得当成关掉向导。
        if (!next && shouldFinishGuideOnDismiss()) finish()
      }}
    >
      <DialogContent
        key={openGeneration}
        className="grid h-[min(540px,calc(100vh-4rem))] w-[min(800px,calc(100vw-2rem))] max-w-none grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-none"
        onInteractOutside={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <SetupGuideHeader
          step={step}
          titleKey={step === "ready" ? readyGuideTitleKey(chatReady, readiness?.credentialCheck?.state, keyStatus?.status) : undefined}
          title={
            step === "ready" && keyStatus
              ? fillKeyHolderText(
                  t as Parameters<typeof fillKeyHolderText>[0],
                  readyGuideTitleKey(chatReady, readiness?.credentialCheck?.state, keyStatus.status),
                  keyStatus.providerName
                )
              : undefined
          }
          readyMark={step === "ready" ? readyMarkKind(chatReady, readiness?.credentialCheck?.state) : undefined}
          summary={step === "ready" ? <ReadySummary workspaceName={workspaceName} keyStatus={keyStatus} /> : undefined}
        />
        <div className={cx("flex min-h-0 flex-col overflow-hidden pt-6", GUIDE_INSET_CLASS, SETUP_GUIDE_FACE[step].mark === "ready" && "justify-center overflow-y-auto pb-6")}>
          <SetupGuideBody
            step={step}
            workspaceName={workspaceName}
            onOpened={setWorkspaceName}
            connectPick={connectPick}
            onConnectPick={setConnectPick}
            onAddKey={openAddKey}
            onFixKey={openFixKey}
          />
        </div>
        <SetupGuideFooter
          step={step}
          hasWorkspace={Boolean(workspaceName)}
          primaryKey={step === "ready" ? readyGuidePrimaryKey(chatReady, keyStatus?.status) : undefined}
          secondaryKey={step === "ready" && !chatReady ? "settings.setupGuide.browseFirst" : undefined}
          autoFocusPrimary={step === "intro"}
          onBack={() => setStep(previousSetupGuideStep(step))}
          onNext={onNext}
          onSkip={finish}
          onSecondary={finish}
        />
      </DialogContent>
    </Dialog>
  )
}

function SetupGuideBody({
  step,
  workspaceName,
  onOpened,
  connectPick,
  onConnectPick,
  onAddKey,
  onFixKey
}: {
  step: SetupGuideStep
  workspaceName: string
  onOpened: (name: string) => void
  connectPick: string | null
  onConnectPick: (id: string) => void
  onAddKey: () => void
  onFixKey: (profileId: string | undefined) => void
}) {
  return STEP_BODY[step]({ workspaceName, onOpened, connectPick, onConnectPick, onAddKey, onFixKey })
}

const STEP_BODY: Record<
  SetupGuideStep,
  (props: {
    workspaceName: string
    onOpened: (name: string) => void
    connectPick: string | null
    onConnectPick: (id: string) => void
    onAddKey: () => void
    onFixKey: (profileId: string | undefined) => void
  }) => ReactNode
> = {
  intro: () => <IntroPoints />,
  capabilities: () => <CapabilityCards />,
  engines: () => <EngineInstallList />,
  "connect-model": ({ connectPick, onConnectPick, onAddKey, onFixKey }) => (
    <ConnectModelStep picked={connectPick} onPick={onConnectPick} onAddKey={onAddKey} onFixKey={onFixKey} />
  ),
  appearance: () => <AppearanceChoice />,
  workspace: ({ workspaceName, onOpened }) => <WorkspaceChoice name={workspaceName} onOpened={onOpened} />,
  ready: () => <ReadyShortcuts />
}

async function finishSetupGuide(
  finishing: { current: boolean },
  hide: () => void,
  refresh: () => Promise<unknown>
): Promise<void> {
  if (finishing.current) return
  finishing.current = true
  try {
    await markSetupGuideComplete(refresh)
    hide()
  } finally {
    finishing.current = false
  }
}
