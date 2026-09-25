/**
 * questions 表面：字母选项。选项用 id 决策，不拿译文做相等判断。
 */
import { cx } from "@/utils/cx"
import type { ApprovalQuestion } from "./approval.types"

export function ApprovalQuestionsBody({
  questions,
  answers,
  onSelect,
  payload,
  thumbnail
}: {
  questions: ApprovalQuestion[]
  answers: Record<string, string>
  onSelect: (questionId: string, optionId: string) => void
  payload?: string
  thumbnail?: string
}) {
  const question = questions[0]
  if (!question) return null
  return (
    <div className="flex flex-col gap-2">
      <p className="pl-0.5 text-caption-1-medium text-text-primary">{question.prompt}</p>
      {thumbnail ? <img src={thumbnail} alt="" className="max-h-28 w-full rounded-lg object-contain" /> : null}
      {payload ? (
        <pre className="m-0 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-background-secondary-default px-3 py-2 font-mono text-caption-2-regular text-text-secondary">
          {payload}
        </pre>
      ) : null}
      <div
        role="radiogroup"
        aria-label={question.prompt}
        className="flex flex-col gap-1 rounded-lg bg-background-secondary-default p-1.5"
      >
        {question.options.map((option, index) => (
          <QuestionOption
            key={option.id}
            letter={String.fromCharCode(65 + index)}
            label={option.label}
            selected={answers[question.id] === option.id}
            onSelect={() => onSelect(question.id, option.id)}
          />
        ))}
      </div>
    </div>
  )
}

function QuestionOption({
  letter,
  label,
  selected,
  onSelect
}: {
  letter: string
  label: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cx(
        "flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-caption-1-regular transition-colors active:scale-[0.98]",
        selected
          ? "border-transparent bg-background-primary-default text-text-primary shadow-2xs"
          : "border-separator-border/80 text-text-primary hover:bg-background-secondary-hover"
      )}
    >
      <span
        className={cx(
          "inline-flex size-4.5 shrink-0 items-center justify-center rounded-sm font-mono text-caption-2-medium",
          selected ? "bg-text-primary text-text-white" : "bg-background-secondary-default text-text-tertiary"
        )}
      >
        {letter}
      </span>
      {label}
    </button>
  )
}
