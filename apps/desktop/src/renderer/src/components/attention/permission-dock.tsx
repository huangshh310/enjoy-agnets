/**
 * L0：唯一决策面。贴在 Composer 顶边，位于会话内容之下、输入簇之上。
 * 禁止钉在 Conversation 顶部，禁止写进 ConversationContent。
 */
import { decidePendingApproval } from "@renderer/hooks/use-agent-session"
import { ApprovalCard } from "@renderer/components/ai-chat/thread/approval/approval-card"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"

export function PermissionDock() {
  const t = useT()
  const pending = useChatStore((state) => state.pendingApproval)
  if (!pending) return null

  return (
    <div className="relative z-20 w-full min-w-0 shrink-0 px-6 pt-1">
      <p className="mb-1.5 px-1 text-caption-2-medium text-text-tertiary">{t("attention.dockLabel")}</p>
      <ApprovalCard
        pending={pending}
        onApprove={(answers) => void decidePendingApproval("allow", answers)}
        onDeny={() => void decidePendingApproval("deny")}
        onAllowSession={() => void decidePendingApproval("allow_session")}
      />
    </div>
  )
}
