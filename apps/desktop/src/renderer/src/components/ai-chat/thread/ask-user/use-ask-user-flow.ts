/**
 * 提问卡片状态：当前题、答案、前进/跳过。
 */
import { useRef, useState } from "react"
import { normalizeAskUserQuestions } from "@enjoy-agents/ipc-contract"
import { asRecord } from "@renderer/lib/record"
import { canSubmitQuestion, mergeAnswer, skipAnswer, toggleAnswer } from "./ask-user-answers"
import { useAskUserKeys } from "./use-ask-user-keys"
import type { AskUserAnswers, AskUserFlow, AskUserQuestion } from "./ask-user.types"

/** 规范化入参并挂数字键；答案用 ref 避免连按读到过期闭包。 */
export function useAskUserFlow(args: unknown, onComplete: (answers: AskUserAnswers) => void): AskUserFlow {
  const questions = normalizeAskUserQuestions(asRecord(args))
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<AskUserAnswers>({})
  const answersRef = useRef(answers)
  answersRef.current = answers
  const otherRef = useRef<HTMLTextAreaElement>(null)
  const last = Math.max(questions.length - 1, 0)
  const safe = Math.min(step, last)
  const question = questions[safe]
  const current = question ? answers[question.id] : undefined

  const goNext = (snapshot: AskUserAnswers) => {
    if (safe >= questions.length - 1) onComplete(snapshot)
    else setStep(safe + 1)
  }

  const applyToggle = (id: string) => toggleCurrent(question, answersRef, setAnswers, goNext, id)

  useAskUserKeys({ question, otherRef, onDigit: applyToggle })

  return {
    questions,
    question,
    safe,
    last,
    current,
    otherText: current?.otherText ?? "",
    otherRef,
    canContinue: question ? canSubmitQuestion(question, current) : false,
    applyToggle,
    ...questionActions({ question, current, answers, answersRef, last, setAnswers, setStep, goNext })
  }
}

function toggleCurrent(
  question: AskUserQuestion | undefined,
  answersRef: { current: AskUserAnswers },
  setAnswers: (next: AskUserAnswers) => void,
  goNext: (snapshot: AskUserAnswers) => void,
  id: string
) {
  if (!question) return
  const next = toggleAnswer(answersRef.current, question, id)
  answersRef.current = next
  setAnswers(next)
  if (!question.multiSelect) goNext(next)
}

function questionActions(input: {
  question: AskUserQuestion | undefined
  current: AskUserAnswers[string] | undefined
  answers: AskUserAnswers
  answersRef: { current: AskUserAnswers }
  last: number
  setAnswers: (value: AskUserAnswers | ((prev: AskUserAnswers) => AskUserAnswers)) => void
  setStep: (value: number | ((n: number) => number)) => void
  goNext: (snapshot: AskUserAnswers) => void
}) {
  const { question, current, answers, answersRef, last, setAnswers, setStep, goNext } = input
  return {
    setOtherText: (text: string) => {
      if (!question) return
      setAnswers((prev) => mergeAnswer(prev, question.id, { otherText: text, skipped: false }))
    },
    submitOther: () => {
      if (!current?.otherText?.trim()) return
      goNext(answers)
    },
    skip: () => {
      if (!question) return
      const next = skipAnswer(answers, question.id)
      setAnswers(next)
      goNext(next)
    },
    continueFlow: () => goNext(answersRef.current),
    back: () => setStep((n) => Math.max(0, n - 1)),
    next: () => setStep((n) => Math.min(last, n + 1))
  }
}
