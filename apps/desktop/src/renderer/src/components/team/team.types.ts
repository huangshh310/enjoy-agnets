/**
 * 团队资料与成员管理数据类型。
 */
export type TeamRole = "owner" | "admin" | "member"

export interface TeamMember {
  id: string
  name: string
  email: string
  role: TeamRole
  avatarUrl?: string
  status: "active" | "invited"
  joinedAt: string
  lastActiveAt: string
}

export interface TeamProfileData {
  id: string
  name: string
  slug: string
  plan: string
  createdAt: string
  memberCount: number
  maxMembers: number
  storageUsedBytes: number
  storageMaxBytes: number
  monthlyTokenUsed: number
  monthlyTokenLimit: number
  defaultApprovalMode: "auto" | "strict"
  allowCustomMcp: boolean
}
