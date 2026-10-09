/**
 * 次行人话说明：可键盘聚焦 / 点按打开，不只靠 hover。
 */
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export function LastRunExplain({
  text,
  tip,
  testId
}: {
  text: string
  tip?: string
  testId: string
}) {
  const tipId = `${testId}-tip`
  if (!tip) {
    return (
      <p className="mt-0.5 text-caption-1-medium text-text-tertiary" data-testid={testId}>
        {text}
      </p>
    )
  }
  return (
    <div className="mt-0.5">
      <p id={tipId} className="sr-only">
        {tip}
      </p>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="text-left text-caption-1-medium text-text-tertiary"
            data-testid={testId}
            aria-describedby={tipId}
          >
            {text}
          </button>
        </PopoverTrigger>
        <PopoverContent
          role="tooltip"
          className="w-56 px-2.5 py-2 text-caption-2-regular text-text-primary"
        >
          {tip}
        </PopoverContent>
      </Popover>
    </div>
  )
}
