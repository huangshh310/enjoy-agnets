/**
 * Computer Use 纯模块：观察账本与 desktop_act 审批策略。
 */
export {
  createObservationLedger,
  OBSERVATION_TTL_MS,
  type Observation,
  type ObservationElement,
  type TakeObservation
} from "./observation-ledger.ts"
export {
  desktopActApprovalText,
  desktopActBypassesSessionAllow,
  desktopActSkipsApproval
} from "./desktop-act-policy.ts"
