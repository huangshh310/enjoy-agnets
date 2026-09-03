/**
 * 团队中心：成员列表、角色权限切换与邀请管理。
 */
import { useState } from "react"
import {
  RiDeleteBinLine,
  RiMailAddLine,
  RiShieldUserLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cx } from "@/utils/cx"

import type { TeamMember, TeamRole } from "./team.types"

const INITIAL_MEMBERS: TeamMember[] = [
  {
    id: "mem_1",
    name: "Enjoy Engineer (You)",
    email: "team@enjoy-agents.dev",
    role: "owner",
    status: "active",
    joinedAt: "2026-01-15",
    lastActiveAt: "刚刚"
  },
  {
    id: "mem_2",
    name: "Alex Zhang",
    email: "alex.zhang@enjoy-agents.dev",
    role: "admin",
    status: "active",
    joinedAt: "2026-01-20",
    lastActiveAt: "10 分钟前"
  },
  {
    id: "mem_3",
    name: "Elena Rostova",
    email: "elena.r@enjoy-agents.dev",
    role: "member",
    status: "active",
    joinedAt: "2026-02-01",
    lastActiveAt: "2 小时前"
  },
  {
    id: "mem_4",
    name: "David Chen",
    email: "david.c@enjoy-agents.dev",
    role: "member",
    status: "invited",
    joinedAt: "2026-09-01",
    lastActiveAt: "未激活"
  }
]

export function TeamMembersSection() {
  const [members, setMembers] = useState<TeamMember[]>(INITIAL_MEMBERS)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<TeamRole>("member")
  const [search, setSearch] = useState("")

  function handleInvite() {
    if (!inviteEmail.trim()) return
    const newMember: TeamMember = {
      id: `mem_${Date.now()}`,
      name: inviteEmail.split("@")[0] || "New Member",
      email: inviteEmail.trim(),
      role: inviteRole,
      status: "invited",
      joinedAt: new Date().toISOString().slice(0, 10),
      lastActiveAt: "未激活"
    }
    setMembers([...members, newMember])
    setInviteEmail("")
    setInviteOpen(false)
  }

  function handleRoleChange(id: string, nextRole: TeamRole) {
    setMembers(members.map((m) => (m.id === id ? { ...m, role: nextRole } : m)))
  }

  function handleRemove(id: string) {
    setMembers(members.filter((m) => m.id !== id))
  }

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* 顶栏操作区 */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <Input
            placeholder="搜索团队成员姓名或邮箱..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 font-sans text-caption-1-regular"
          />
        </div>

        <Button onClick={() => setInviteOpen(true)} className="h-9 gap-1.5 text-caption-1-medium">
          <RiMailAddLine className="size-4" />
          <span>邀请新成员</span>
        </Button>
      </div>

      {/* 成员表格卡片 */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-separator-border/80 bg-background-primary-default shadow-2xs">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-separator-border/70 bg-background-secondary-default/50 text-text-tertiary font-medium">
                <th className="py-2.5 px-4">成员信息</th>
                <th className="py-2.5 px-4">角色权限</th>
                <th className="py-2.5 px-4">状态</th>
                <th className="py-2.5 px-4">最近活跃</th>
                <th className="py-2.5 px-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-separator-border/50 font-sans">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-background-secondary-hover/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-full bg-accent-500/10 text-accent-600 font-semibold text-xs shrink-0">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-text-primary truncate">{member.name}</span>
                        <span className="font-mono text-caption-2-regular text-text-tertiary truncate">{member.email}</span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    {member.role === "owner" ? (
                      <span className="inline-flex items-center gap-1 text-caption-2-medium font-semibold text-amber-600 dark:text-amber-400">
                        <RiShieldUserLine className="size-3.5" />
                        所有者
                      </span>
                    ) : (
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value as TeamRole)}
                        className="rounded-lg border border-border-button-default bg-background-secondary-default px-2 py-1 text-caption-2-medium text-text-secondary outline-none cursor-pointer"
                      >
                        <option value="admin">管理员 (Admin)</option>
                        <option value="member">成员 (Member)</option>
                      </select>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    <span
                      className={cx(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium font-mono",
                        member.status === "active"
                          ? "bg-state-success-text/10 text-state-success-text"
                          : "bg-text-tertiary/10 text-text-tertiary"
                      )}
                    >
                      {member.status === "active" ? "已就绪" : "待激活"}
                    </span>
                  </td>

                  <td className="py-3 px-4 font-mono text-caption-2-regular text-text-tertiary">
                    {member.lastActiveAt}
                  </td>

                  <td className="py-3 px-4 text-right">
                    {member.role !== "owner" ? (
                      <button
                        type="button"
                        onClick={() => handleRemove(member.id)}
                        className="text-text-tertiary hover:text-text-error-primary p-1 rounded transition-colors"
                        title="移除成员"
                      >
                        <RiDeleteBinLine className="size-4" />
                      </button>
                    ) : (
                      <span className="text-text-tertiary text-caption-2-regular select-none">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 邀请成员弹窗 */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>邀请新成员加入团队</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-caption-1-medium text-text-secondary">成员电子邮箱</label>
              <Input
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="h-9 font-mono text-caption-1-regular"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-caption-1-medium text-text-secondary">分配初始角色</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as TeamRole)}
                className="h-9 w-full rounded-lg border border-border-button-default bg-background-primary-default px-3 text-caption-1-medium text-text-primary outline-none"
              >
                <option value="member">成员 (具备日常 Agent 编码与查看权限)</option>
                <option value="admin">管理员 (具备团队策略、席位与账单管理权限)</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setInviteOpen(false)}>取消</Button>
            <Button onClick={handleInvite}>发送邀请函</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
