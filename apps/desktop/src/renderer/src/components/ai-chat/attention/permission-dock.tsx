/**
 * L0：唯一决策面。钉在 Conversation 与 Composer 之间，贴 Composer 上沿。
 * 禁止写进 ConversationContent，禁止第二套 Allow/Deny。
 */
import { decidePendingApproval } from "@renderer/hooks/use-agent-session"
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
      tabIndex={-1}
      className="max-h-[min(60%,22rem)] shrink-0 overflow-y-auto scroll-mt-4 border-t border-separator-border bg-background-primary-default/95 px-8 py-2 outline-none backdrop-blur-sm"
    >
      <p className="mb-1 text-caption-2-medium text-text-secondary">{t("attention.dockLabel")}</p>
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
