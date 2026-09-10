/**
 * 通知偏好：写入 settings.preferences，主进程按事件弹系统通知。
 */
import { RiNotification3Line } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { usePrefUpdate } from "@renderer/components/settings/settings-pref"

export function AccountNotificationsSection() {
  const { preferences, update } = usePrefUpdate()
  const desktopPush = preferences?.desktopPush ?? true
  const approvalRequiredAlert = preferences?.approvalRequiredAlert ?? true
  const agentCompleteSound = preferences?.agentCompleteSound ?? true

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between rounded-2xl border border-separator-border/80 bg-background-secondary-default/60 p-5 shadow-2xs backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl border border-accent-500/20 bg-accent-500/10 text-accent-500">
            <RiNotification3Line className="size-6" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h2 className="text-title-3-semibold text-text-primary">通知与提醒偏好</h2>
            <p className="text-caption-1-regular text-text-tertiary">
              开关会写入本机偏好。审批停车和任务结束时由主进程弹出系统通知。
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-separator-border/80 bg-background-primary-default p-5 shadow-2xs">
        <h3 className="text-headline-medium text-text-primary">桌面推送与交互提醒</h3>
        <div className="flex flex-col divide-y divide-separator-border/60">
          <NotifyRow
            title="操作系统桌面级通知"
            description="窗口在后台时，任务结束会弹出系统通知。"
            on={desktopPush}
            onToggle={() => void update({ desktopPush: !desktopPush })}
          />
          <NotifyRow
            title="关键工具审批弹窗提示"
            description="写盘或终端审批停车时弹出系统通知。"
            on={approvalRequiredAlert}
            onToggle={() => void update({ approvalRequiredAlert: !approvalRequiredAlert })}
          />
          <NotifyRow
            title="智能体任务完成提示音"
            description="任务结束通知是否带系统提示音。"
            on={agentCompleteSound}
            onToggle={() => void update({ agentCompleteSound: !agentCompleteSound })}
          />
        </div>
      </div>
    </div>
  )
}

function NotifyRow({
  title,
  description,
  on,
  onToggle
}: {
  title: string
  description: string
  on: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center justify-between py-3.5">
      <div className="flex flex-col gap-0.5">
        <p className="text-caption-1-medium text-text-primary">{title}</p>
        <p className="text-caption-2-regular text-text-tertiary">{description}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={cx(
          "cursor-pointer rounded-lg border px-3 py-1 text-caption-1-medium font-medium transition-colors",
          on
            ? "border-state-success-text/30 bg-state-success-text/10 text-state-success-text"
            : "border-separator-border bg-background-secondary-default text-text-secondary"
        )}
      >
        {on ? "已开启" : "已关闭"}
      </button>
    </div>
  )
}
