/**
 * AskUserQuestions 表面：抄 Fluid 步进问答，皮走 BoardUI。
 * 不引入 registry 的 Base UI / framer-motion / Lucide。
 */
import { useT } from "@renderer/i18n"
import { AskUserEmpty } from "./ask-user-empty"
import { AskUserHeader } from "./ask-user-header"
import { AskUserNav } from "./ask-user-nav"
import { AskUserOptions } from "./ask-user-options"
import { useAskUserFlow } from "./use-ask-user-flow"
import type { AskUserCardProps } from "./ask-user.types"

/** 组合标题、选项、步进；空问卷走 Skip=deny。 */
export function AskUserCard({ args, onComplete, onSkipAll }: AskUserCardProps) {
  const t = useT()
  const flow = useAskUserFlow(args, onComplete)
  if (flow.questions.length === 0) return <AskUserEmpty onSkipAll={onSkipAll} />
  if (!flow.question) return null
  const question = flow.question
  return (
    <article className="flex flex-col gap-3 overflow-hidden rounded-2xl border border-separator-border/80 bg-background-primary-default p-3 shadow-card">
      <AskUserHeader />
      <p className="text-body-medium text-text-primary">{question.title}</p>
      <AskUserOptions
        question={question}
        selectedIds={flow.current?.selectedIds ?? []}
        otherText={flow.otherText}
        otherPlaceholder={t("chat.askUserOther")}
        otherRef={flow.otherRef}
        onToggle={flow.applyToggle}
        onOtherChange={flow.setOtherText}
        onSubmitOther={flow.submitOther}
      />
      <AskUserNav
        step={flow.safe}
        total={flow.questions.length}
        showSkip={question.skippable}
        showContinue={question.multiSelect || question.freeText || flow.questions.length === 1}
        continueDisabled={!flow.canContinue}
        onBack={flow.back}
        onNext={flow.next}
        onSkip={flow.skip}
        onContinue={flow.continueFlow}
      />
    </article>
  )
}
