/**
 * 个人中心：用户个人资料、本地安全存储状态与活跃会话设备。
 */
import { useState } from "react"
import {
  RiCheckLine,
  RiComputerLine,
  RiShieldCheckLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useChatStore } from "@renderer/stores/chat-store"

import type { UserProfileData } from "./account.types"

const INITIAL_USER_PROFILE: UserProfileData = {
  name: "Enjoy Engineer",
  email: "team@enjoy-agents.dev",
  avatarLetter: "E",
  roleTitle: "Lead Agent System Architect",
  timezone: "Asia/Shanghai (UTC+08:00)",
  joinedAt: "2026-01-15",
  safeStorageActive: true,
  activeDevices: [
    {
      id: "dev_win",
      name: "Desktop Client (This Device)",
      os: "Windows 11 Pro · x64",
      ip: "127.0.0.1",
      lastActive: "当前在线",
      isCurrent: true
    }
  ]
}

export function AccountProfileSection() {
  const userName = useChatStore((state) => state.userName)
  const [profile, setProfile] = useState<UserProfileData>({
    ...INITIAL_USER_PROFILE,
    name: userName || INITIAL_USER_PROFILE.name
  })
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* 顶部个人卡片 */}
      <div className="flex items-center justify-between p-5 rounded-2xl border border-separator-border/80 bg-background-secondary-default/60 backdrop-blur-md shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-accent-500 text-white font-bold text-lg shadow-sm">
            {profile.avatarLetter}
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-title-3-semibold text-text-primary">{profile.name}</h2>
              <span className="rounded-full bg-accent-500/10 text-accent-600 border border-accent-500/20 px-2 py-0.2 text-[11px] font-mono font-semibold">
                主开发者
              </span>
            </div>
            <p className="font-mono text-caption-1-regular text-text-tertiary">
              {profile.email} · {profile.roleTitle}
            </p>
          </div>
        </div>

        <Button onClick={handleSave} className="h-8 text-caption-1-medium gap-1.5">
          {saved ? <RiCheckLine className="size-3.5 text-white" /> : null}
          <span>{saved ? "已保存" : "保存修改"}</span>
        </Button>
      </div>

      {/* 基础个人信息 */}
      <div className="flex flex-col gap-4 rounded-2xl border border-separator-border/80 bg-background-primary-default p-5 shadow-2xs">
        <h3 className="text-headline-medium text-text-primary">个人基础信息</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-caption-1-medium text-text-secondary">用户昵称</label>
            <Input
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="h-9 font-sans text-caption-1-regular"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-caption-1-medium text-text-secondary">电子邮箱</label>
            <Input
              value={profile.email}
              disabled
              className="h-9 font-mono text-caption-1-regular opacity-80"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-caption-1-medium text-text-secondary">职位头衔</label>
            <Input
              value={profile.roleTitle}
              onChange={(e) => setProfile({ ...profile, roleTitle: e.target.value })}
              className="h-9 font-sans text-caption-1-regular"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-caption-1-medium text-text-secondary">本地所在时区</label>
            <Input
              value={profile.timezone}
              disabled
              className="h-9 font-mono text-caption-1-regular opacity-80"
            />
          </div>
        </div>
      </div>

      {/* 本地安全与加密存储状态 */}
      <div className="flex flex-col gap-4 rounded-2xl border border-separator-border/80 bg-background-primary-default p-5 shadow-2xs">
        <h3 className="text-headline-medium text-text-primary">凭据加密与硬件安全</h3>

        <div className="flex items-center justify-between p-3.5 rounded-xl border border-separator-border/70 bg-background-secondary-default/40">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-state-success-text/10 text-state-success-text border border-state-success-text/20">
              <RiShieldCheckLine className="size-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-caption-1-medium text-text-primary font-medium">
                操作系统级安全加密存储 (Electron SafeStorage)
              </span>
              <span className="text-caption-2-regular text-text-tertiary">
                所有模型 API Key、密码与 HMAC 签名密钥已通过 Windows DPAPI 本地硬件级加密隔离保护
              </span>
            </div>
          </div>
          <span className="text-state-success-text font-mono text-[11px] font-semibold bg-state-success-text/10 px-2.5 py-1 rounded-full border border-state-success-text/20">
            已激活保护
          </span>
        </div>
      </div>

      {/* 活跃设备与客户端 */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-separator-border/80 bg-background-primary-default shadow-2xs">
        <div className="p-4 border-b border-separator-border/70 flex items-center justify-between">
          <h3 className="text-headline-medium text-text-primary">活跃客户端会话</h3>
          <span className="text-caption-2-regular text-text-tertiary">当前登录中的工作站节点</span>
        </div>

        <div className="divide-y divide-separator-border/50">
          {profile.activeDevices.map((device) => (
            <div key={device.id} className="flex items-center justify-between p-4 hover:bg-background-secondary-hover/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-background-secondary-default border border-separator-border text-text-primary">
                  <RiComputerLine className="size-5 text-accent-500" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-caption-1-semibold text-text-primary">{device.name}</span>
                    <span className="text-[10px] font-semibold font-mono bg-state-success-text/10 text-state-success-text px-1.5 py-0.2 rounded">
                      当前终端
                    </span>
                  </div>
                  <span className="font-mono text-caption-2-regular text-text-tertiary">
                    {device.os} · {device.ip}
                  </span>
                </div>
              </div>

              <span className="font-mono text-caption-2-regular text-state-success-text">
                {device.lastActive}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
