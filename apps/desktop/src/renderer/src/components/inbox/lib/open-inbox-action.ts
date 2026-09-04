/**
 * 把收件箱 actionKey 映射到 Hash 路由。设置 / 团队走 $section，不要把整段路径塞进 `to`。
 */
import type { useNavigate } from "@tanstack/react-router"
import type { InboxActionKey } from "../inbox.types"

type InboxNavigate = ReturnType<typeof useNavigate>

export function openInboxAction(navigate: InboxNavigate, actionKey: InboxActionKey): void {
  switch (actionKey) {
    case "openSession":
      void navigate({ to: "/" })
      return
    case "openSandbox":
      void navigate({ to: "/settings/$section", params: { section: "sandbox" } })
      return
    case "openKnowledge":
      void navigate({ to: "/knowledge" })
      return
    case "openProviders":
      void navigate({ to: "/settings/$section", params: { section: "providers" } })
      return
    case "openTeam":
      void navigate({ to: "/settings/$section", params: { section: "team" } })
  }
}
