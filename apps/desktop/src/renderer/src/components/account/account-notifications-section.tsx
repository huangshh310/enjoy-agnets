/**
 * 个人中心：通知偏好设置、系统级推送与提示音开关。
 */
import { useState } from "react"
import {
  RiCheckLine,
  RiNotification3Line
} from "@remixicon/react"
import { cx } from "@/utils/cx"
import type { NotificationSettingsData } from "./account.types"

const INITIAL_SETTINGS: NotificationSettingsData = {
  desktopPush: true,
  agentCompleteSound: true,
  approvalRequiredAlert: true,
  weeklyDigest: false,
  quietHoursEnabled: false
}

export function AccountNotificationsSection() {
  const [settings, setSettings] = useState<NotificationSettingsData>(INITIAL_SETTINGS)
  const [saved, setSaved] = useState(false)

  function handleToggle(key: keyof NotificationSettingsData) {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* 顶部概览 */}
      <div className="flex items-center justify-between p-5 rounded-2xl border border-separator-border/80 bg-background-secondary-default/60 backdrop-blur-md shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500 border border-accent-500/20">
            <RiNotification3Line className="size-6" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h2 className="text-title-3-semibold text-text-primary">通知与提醒偏好</h2>
            <p className="text-caption-1-regular text-text-tertiary">
              自定义长耗时 Agent 任务运行完成、关键审批与系统通知触发规则
            </p>
          </div>
        </div>

        {saved ? (
          <span className="inline-flex items-center gap-1 font-medium text-caption-2-medium text-state-success-text">
            <RiCheckLine className="size-3.5" />
            已自动保存
          </span>
        ) : null}
      </div>

      {/* 通知规则开关列表 */}
      <div className="flex flex-col gap-4 rounded-2xl border border-separator-border/80 bg-background-primary-default p-5 shadow-2xs">
        <h3 className="text-headline-medium text-text-primary">桌面推送与交互提醒</h3>
        
        <div className="flex flex-col divide-y divide-separator-border/60">
          <div className="flex items-center justify-between py-3.5">
            <div className="flex flex-col gap-0.5">
              <p className="text-caption-1-medium text-text-primary">操作系统桌面级通知</p>
              <p className="text-caption-2-regular text-text-tertiary">当窗口最小化或处于后台时，若复杂任务执行完毕触发系统托盘通知</p>
            </div>
            <button
              type="button"
              onClick={() => handleToggle("desktopPush")}
              className={cx(
                "px-3 py-1 rounded-lg text-caption-1-medium font-medium transition-colors border cursor-pointer",
                settings.desktopPush
                  ? "bg-state-success-text/10 text-state-success-text border-state-success-text/30"
                  : "bg-background-secondary-default text-text-secondary border-separator-border"
              )}
            >
              {settings.desktopPush ? "已开启" : "已关闭"}
            </button>
          </div>

          <div className="flex items-center justify-between py-3.5">
            <div className="flex flex-col gap-0.5">
              <p className="text-caption-1-medium text-text-primary">关键工具审批弹窗提示音</p>
              <p className="text-caption-2-regular text-text-tertiary">当触发高危写盘或终端执行审批时，播放柔和的系统提示音</p>
            </div>
            <button
              type="button"
              onClick={() => handleToggle("approvalRequiredAlert")}
              className={cx(
                "px-3 py-1 rounded-lg text-caption-1-medium font-medium transition-colors border cursor-pointer",
                settings.approvalRequiredAlert
                  ? "bg-state-success-text/10 text-state-success-text border-state-success-text/30"
                  : "bg-background-secondary-default text-text-secondary border-separator-border"
              )}
            >
              {settings.approvalRequiredAlert ? "已开启" : "已关闭"}
            </button>
          </div>

          <div className="flex items-center justify-between py-3.5">
            <div className="flex flex-col gap-0.5">
              <p className="text-caption-1-medium text-text-primary">智能体任务完成声效</p>
              <p className="text-caption-2-regular text-text-tertiary">当多阶段流水线或复杂编码任务完成时，播放轻微完成反馈音</p>
            </div>
            <button
              type="button"
              onClick={() => handleToggle("agentCompleteSound")}
              className={cx(
                "px-3 py-1 rounded-lg text-caption-1-medium font-medium transition-colors border cursor-pointer",
                settings.agentCompleteSound
                  ? "bg-state-success-text/10 text-state-success-text border-state-success-text/30"
                  : "bg-background-secondary-default text-text-secondary border-separator-border"
              )}
            >
              {settings.agentCompleteSound ? "已开启" : "已关闭"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
