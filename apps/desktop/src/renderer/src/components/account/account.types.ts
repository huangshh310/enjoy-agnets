/**
 * 个人中心数据类型。
 */
export interface UserProfileData {
  name: string
  email: string
  avatarLetter: string
  roleTitle: string
  timezone: string
  joinedAt: string
  safeStorageActive: boolean
  activeDevices: Array<{
    id: string
    name: string
    os: string
    ip: string
    lastActive: string
    isCurrent: boolean
  }>
}

export interface NotificationSettingsData {
  desktopPush: boolean
  agentCompleteSound: boolean
  approvalRequiredAlert: boolean
  weeklyDigest: boolean
  quietHoursEnabled: boolean
}
