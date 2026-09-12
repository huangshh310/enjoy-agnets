/**
 * 通用权限卡顶栏：从智能体发现条进来后，原路返回。
 */
import { useNavigate } from "@tanstack/react-router"
import { useT } from "@renderer/i18n"
import { agentReturnSearch, type ApprovalDiscoverOrigin } from "./approval-discover-nav"

export function ApprovalDiscoverReturn({ origin }: { origin: ApprovalDiscoverOrigin }) {
  const t = useT()
  const navigate = useNavigate()

  return (
    <div
      data-approval-discover="return"
      className="flex items-center justify-between border-b border-separator-border pb-2"
    >
      <button
        type="button"
        onClick={() =>
          void navigate({
            to: "/settings/$section",
            params: { section: "agent" },
            search: agentReturnSearch(origin)
          })
        }
        className="text-caption-2-medium text-accent-600 outline-none hover:text-accent-500 focus-visible:ring-2 focus-visible:ring-border-focus-ring"
      >
        {t("settings.approvalDiscover.back")}
      </button>
    </div>
  )
}
