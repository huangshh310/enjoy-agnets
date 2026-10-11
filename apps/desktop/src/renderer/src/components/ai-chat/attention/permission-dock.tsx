/**
 * L0：唯一决策面。钉在 Conversation 与 Composer 之间，贴 Composer 上沿。
 * 禁止写进 ConversationContent，禁止第二套 Allow/Deny。
 */
import { decidePendingApproval } from "@renderer/hooks/decide-pending-approval"
import { ApprovalCard } from "@renderer/components/ai-chat/thread/approval/approval-card"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { PERMISSION_DOCK_ID } from "./attention-anchor"

export function PermissionDock() {
  const t = useT()
  const pending = useChatStore((state) => state.pendingApproval)
  if (!pending) return null

  return (
    <div
      id={PERMISSION_DOCK_ID}
      data-testid="permission-dock"
      tabIndex={-1}
      className="shrink-0 scroll-mt-4 border-t border-separator-border bg-background-primary-default/95 px-5 py-1 outline-none backdrop-blur-sm"
    >
      <p className="mb-0.5 text-caption-2-medium text-text-secondary">{t("attention.dockLabel")}</p>
      <ApprovalCard
        pending={pending}
        onApprove={(answers) => void decidePendingApproval("allow", answers)}
        onDeny={() => void decidePendingApproval("deny")}
        onAllowSession={() => void decidePendingApproval("allow_session")}
        onAllowAlways={() => void decidePendingApproval("allow_always")}
      />
    </div>
  )
}
