/**
 * 远程工作区可识别错误：断线不得静默 {ok:true}。
 */
export const REMOTE_DISCONNECTED = "REMOTE_DISCONNECTED"
export const REMOTE_NOT_READY = "REMOTE_NOT_READY"
export const HOST_IN_USE = "HOST_IN_USE"

export class RemoteWorkspaceError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = "RemoteWorkspaceError"
    this.code = code
  }
}

export function disconnectedError(action = "operation"): RemoteWorkspaceError {
  return new RemoteWorkspaceError(
    REMOTE_DISCONNECTED,
    `${REMOTE_DISCONNECTED}: Remote workspace disconnected; ${action} refused.`
  )
}

export function notReadyError(status: string): RemoteWorkspaceError {
  return new RemoteWorkspaceError(REMOTE_NOT_READY, `Remote workspace is ${status}; IO refused.`)
}

export function isRemoteDisconnected(error: unknown): boolean {
  if (error instanceof RemoteWorkspaceError) return error.code === REMOTE_DISCONNECTED
  return error instanceof Error && error.message.includes(REMOTE_DISCONNECTED)
}
