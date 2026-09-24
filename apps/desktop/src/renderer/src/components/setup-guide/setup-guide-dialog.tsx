/**
 * 启动引导窗口。关掉或走完都会记下完成时间。
 */
import { useEffect, useRef, useState, type ReactNode } from "react"
import { cx } from "@/utils/cx"
import { useQueryClient } from "@tanstack/react-query"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { AppearanceChoice } from "./appearance-choice"
import { CapabilityCards } from "./capability-cards"
import { EngineInstallList } from "./engine-install-list"
import { IntroPoints } from "./intro-points"
import { markSetupGuideComplete } from "./mark-setup-guide-complete"
import { ReadyShortcuts, ReadySummary } from "./ready-summary"
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
import { useSetupGuideStore } from "./setup-guide-store"
import { WorkspaceChoice } from "./workspace-choice"

export function SetupGuideDialog() {
  const open = useSetupGuideStore((state) => state.open)
  const hide = useSetupGuideStore((state) => state.hide)
  const markEngaged = useSetupGuideStore((state) => state.markEngaged)
  const [step, setStep] = useState<SetupGuideStep>("intro")
  const [workspaceName, setWorkspaceName] = useState("")
  const finishing = useRef(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!open) return
    setStep("intro")
    setWorkspaceName("")
  }, [open])
  useEffect(() => {
    if (isSetupGuideChoiceStep(step)) markEngaged()
  }, [markEngaged, step])

  const finish = () => {
    void finishSetupGuide(finishing, hide, () => queryClient.invalidateQueries({ queryKey: ["settings"] }))
  }
  const onNext = () => {
    if (SETUP_GUIDE_FACE[step].finishes) finish()
    else setStep(nextSetupGuideStep(step))
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) finish() }}>
      <DialogContent
        className="grid h-[min(540px,calc(100vh-4rem))] w-[min(800px,calc(100vw-2rem))] max-w-none grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-none"
        onInteractOutside={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <SetupGuideHeader
          step={step}
          summary={step === "ready" ? <ReadySummary workspaceName={workspaceName} /> : undefined}
        />
        <div className={cx("flex min-h-0 flex-col overflow-hidden pt-6", GUIDE_INSET_CLASS, SETUP_GUIDE_FACE[step].mark === "ready" && "justify-center overflow-y-auto pb-6")}>
          <SetupGuideBody step={step} workspaceName={workspaceName} onOpened={setWorkspaceName} />
        </div>
        <SetupGuideFooter
          step={step}
          hasWorkspace={Boolean(workspaceName)}
          onBack={() => setStep(previousSetupGuideStep(step))}
          onNext={onNext}
          onSkip={finish}
        />
      </DialogContent>
    </Dialog>
  )
}

function SetupGuideBody({
  step,
  workspaceName,
  onOpened
}: {
  step: SetupGuideStep
  workspaceName: string
  onOpened: (name: string) => void
}) {
  return STEP_BODY[step]({ workspaceName, onOpened })
}

const STEP_BODY: Record<SetupGuideStep, (props: { workspaceName: string; onOpened: (name: string) => void }) => ReactNode> = {
  intro: () => <IntroPoints />,
  capabilities: () => <CapabilityCards />,
  engines: () => <EngineInstallList />,
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
