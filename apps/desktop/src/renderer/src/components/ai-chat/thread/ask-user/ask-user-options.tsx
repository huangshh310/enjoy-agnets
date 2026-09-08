/**
 * 当前题的数字选项行，以及其它输入。
 */
import { cx } from "@/utils/cx"
import type { AskUserChipProps, AskUserOptionsProps } from "./ask-user.types"

const CHIP =
  "mt-0.5 inline-flex size-4.5 shrink-0 items-center justify-center rounded-sm font-mono text-caption-2-medium"
const ROW =
  "flex cursor-pointer items-start gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors active:scale-[0.98]"

/** 当前题的数字选项行，以及其它输入。 */
export function AskUserOptions({
  question,
  selectedIds,
  otherText,
  otherPlaceholder,
  otherRef,
  onToggle,
  onOtherChange,
  onSubmitOther
}: AskUserOptionsProps) {
  const showOptions = !question.freeText
  return (
    <div role={question.multiSelect ? "group" : "radiogroup"} className="flex flex-col gap-1">
      {showOptions
        ? question.options.map((option, index) => (
            <AskUserOptionRow
              key={option.id}
              letter={String(index + 1)}
              title={option.title}
              description={option.description}
              selected={selectedIds.includes(option.id)}
              onSelect={() => onToggle(option.id)}
            />
          ))
        : null}
      {question.allowOther || question.freeText ? (
        <AskUserOtherRow
          letter={String((showOptions ? question.options.length : 0) + 1)}
          value={otherText}
          selected={Boolean(otherText.trim())}
          placeholder={otherPlaceholder}
          inputRef={otherRef}
          onChange={onOtherChange}
          onSubmit={onSubmitOther}
        />
      ) : null}
    </div>
  )
}

function AskUserChip({ letter, selected }: AskUserChipProps) {
  return (
    <span className={cx(CHIP, selected ? "bg-text-primary text-text-white" : "bg-background-secondary-default text-text-tertiary")}>
      {letter}
    </span>
  )
}

function AskUserOptionRow({
  letter,
  title,
  description,
  selected,
  onSelect
}: {
  letter: string
  title: string
  description?: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cx(
        ROW,
        selected
          ? "border-transparent bg-background-secondary-default text-text-primary shadow-2xs"
          : "border-separator-border/80 text-text-primary hover:bg-background-secondary-hover"
      )}
    >
      <AskUserChip letter={letter} selected={selected} />
      <span className="min-w-0 flex-1">
        <span className="text-caption-1-medium">{title}</span>
        {description ? <span className="mt-0.5 block text-caption-2-regular text-text-tertiary">{description}</span> : null}
      </span>
    </button>
  )
}

function AskUserOtherRow({
  letter,
  value,
  selected,
  placeholder,
  inputRef,
  onChange,
  onSubmit
}: {
  letter: string
  value: string
  selected: boolean
  placeholder: string
  inputRef?: { current: HTMLTextAreaElement | null }
  onChange: (text: string) => void
  onSubmit: () => void
}) {
  return (
    <label
      className={cx(
        "flex items-start gap-2 rounded-lg border px-2 py-1.5",
        selected ? "border-transparent bg-background-secondary-default shadow-2xs" : "border-separator-border/80"
      )}
    >
      <AskUserChip letter={letter} selected={selected} />
      <textarea
        ref={(node) => {
          if (inputRef) inputRef.current = node
        }}
        value={value}
        placeholder={placeholder}
        rows={2}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault()
            onSubmit()
          }
        }}
        className="min-h-10 w-full resize-none bg-transparent text-caption-1-regular text-text-primary outline-none placeholder:text-text-placeholder"
      />
    </label>
  )
}
