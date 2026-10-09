/**
 * Dock / 审批卡来源句。只写自动化名与是否补跑。
 */
export function AutomationSourceLine({ text }: { text: string | null }) {
  if (!text) return null
  return (
    <p className="mt-1 text-caption-2-regular text-text-tertiary" data-testid="approval-automation-source">
      {text}
    </p>
  )
}
