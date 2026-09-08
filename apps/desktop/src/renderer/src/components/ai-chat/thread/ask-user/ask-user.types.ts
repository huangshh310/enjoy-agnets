/**
 * AskUserQuestions 表面的入参与步进状态。
 */
import type { RefObject } from "react"
import type { AskUserAnswer, AskUserAnswers, NormalizedAskQuestion } from "@enjoy-agents/ipc-contract"

export type AskUserQuestion = NormalizedAskQuestion

export type AskUserCardProps = {
  args: unknown
  onComplete: (answers: AskUserAnswers) => void
  onSkipAll: () => void
}

export type AskUserEmptyProps = {
  onSkipAll: () => void
}

/** useAskUserFlow 暴露给卡片的步进视图。 */
export type AskUserFlow = {
  questions: AskUserQuestion[]
  question: AskUserQuestion | undefined
  safe: number
  last: number
  current: AskUserAnswer | undefined
  otherText: string
  otherRef: RefObject<HTMLTextAreaElement | null>
  canContinue: boolean
  applyToggle: (id: string) => void
  setOtherText: (text: string) => void
  submitOther: () => void
  skip: () => void
  continueFlow: () => void
  back: () => void
  next: () => void
}

export type AskUserNavProps = {
  step: number
  total: number
  showSkip: boolean
  showContinue: boolean
  continueDisabled: boolean
  onBack: () => void
  onNext: () => void
  onSkip: () => void
  onContinue: () => void
}

export type AskUserOptionsProps = {
  question: AskUserQuestion
  selectedIds: string[]
  otherText: string
  otherPlaceholder: string
  otherRef?: { current: HTMLTextAreaElement | null }
  onToggle: (optionId: string) => void
  onOtherChange: (text: string) => void
  onSubmitOther: () => void
}

export type AskUserChipProps = {
  letter: string
  selected: boolean
}

export type { AskUserAnswer, AskUserAnswers }
