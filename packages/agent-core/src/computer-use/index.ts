/**
 * Computer Use 纯模块：观察账本与 desktop_act 审批策略。
 */
export {
  createObservationLedger,
  OBSERVATION_TTL_MS,
  type Observation,
  type ObservationElement,
  type ObservationLedger,
  type StaleCause,
  type TakeObservation
} from "./observation-ledger.ts"
export {
  DESKTOP_ACT_SECOND_CONFIRM,
  DESKTOP_ACT_STALE,
  desktopActFailureCode,
  desktopActMayReportSuccess,
  desktopAppKey,
  elementStableKey,
  matchResnapElement,
  resolveListedAppPid,
  type ResnapTarget
} from "./observation-match.ts"
export {
  DESKTOP_ACT_ANY_SESSION_KEY,
  DESKTOP_ACT_SESSION_PREFIX,
  desktopActAlwaysAsks,
  desktopActAppKey,
  desktopActAppKeyInfo,
  desktopActApprovalText,
  desktopActBypassesSessionAllow,
  desktopActIsBareCoord,
  desktopActIsSensitive,
  stampDesktopActSensitiveFlag,
  desktopActSessionKey,
  desktopActSkipsApproval,
  isStableDesktopAppKey,
  normalizeDesktopAppName,
  persistentAlwaysAllowsDesktopAct,
  sessionAllowsDesktopAct,
  withAnyDesktopSessionKey
} from "./desktop-act-policy.ts"
export {
  DESKTOP_ACT_UNRESOLVED_OBSERVATION,
  bindObservationIdentityToDesktopActInput,
  desktopActHasUnresolvedObservation,
  desktopGrantShouldPersist,
  observationIdFromDesktopActInput,
  prepareDesktopActGateInput,
  type LookupDesktopObservation
} from "./desktop-act-observation-gate.ts"
export {
  DESKTOP_ACT_ACTION_FAILED,
  DESKTOP_ACT_BARE_COORDS_DISABLED,
  DESKTOP_ACT_BARE_COORDS_DISABLED_REASON,
  desktopActBareCoordsDeniedResult,
  desktopActCanContinueFromFailure,
  denyBareDesktopCoordApproval,
  refuseBareDesktopCoord,
  sanitizeDesktopActFailure,
  streamPayloadForDeniedToolPart
} from "./desktop-act-honesty.ts"
export {
  clearDesktopSecondConfirmGate,
  desktopActNeedsSecondConfirm,
  forgetDesktopSecondConfirmGate,
  rememberDesktopSecondConfirmGate
} from "./desktop-second-confirm-gate.ts"
export type { DesktopActAppKeySource } from "./desktop-act-policy.ts"
export {
  applyDesktopToolOrder,
  formatDesktopBiasInstruction,
  sanitizeDesktopMentionBias
} from "./desktop-tool-bias.ts"
export {
  clearAllConversationDesktopAllows,
  clearConversationDesktopAllow,
  conversationHasAnyDesktop,
  grantConversationDesktopAllow,
  isConversationDesktopAllowKey,
  mergeConversationDesktopAllow,
  overlayConversationDesktopAllow,
  revokeConversationDesktopAllow,
  setConversationAnyDesktop,
  snapshotConversationDesktopAllow,
  writeThroughDesktopActSessionAllow
} from "./conversation-desktop-allow.ts"
