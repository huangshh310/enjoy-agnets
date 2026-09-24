/** Enjoy Local 心跳工具名。审批和重启后续跑都认这个常量。 */
export const SET_SESSION_HEARTBEAT_TOOL = "set_session_heartbeat"

export type SessionHeartbeatRequest = {
  sessionId: string
  cadence: string
  prompt: string
  maxRuns?: number | null
}
