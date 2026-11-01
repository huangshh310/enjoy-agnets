/**
 * 会话级多标签工作集（短锁 multi-tab-short-lock）：有序 sessionId + 上限 6。
 * 侧栏仍是会话真源；标签只是快捷入口。XOR 前台由 chat-store.sessionId 承担。
 */

export const SESSION_TAB_CAP = 6

export const SESSION_TAB_OVERFLOW_MESSAGE = "最多开 6 个标签，先关掉一个再开。"
export const SESSION_TAB_EMPTY_MESSAGE = "开一个新对话，或从左边选一个。"
export const SESSION_TAB_DRAFT_CONFIRM_MESSAGE = "这段还没发送。留下还是丢掉？"
export const SESSION_TAB_BUSY_LABEL = "进行中"
export const SESSION_TAB_WAIT_LABEL = "等你拍板"

export type SessionTabsState = {
  tabIds: string[]
}

export type OpenSessionTabResult =
  | { ok: true; tabIds: string[]; focusId: string; alreadyOpen: boolean }
  | { ok: false; reason: "cap"; tabIds: string[]; message: string }

/** ⌘/Ctrl+单击：加入工作集并聚焦；已在集内则只聚焦。满 6 且未在集内 → 人话拒绝，不暗默丢。 */
export function openSessionTab(state: SessionTabsState, sessionId: string): OpenSessionTabResult {
  if (!sessionId) {
    return { ok: true, tabIds: state.tabIds, focusId: sessionId, alreadyOpen: false }
  }
  if (state.tabIds.includes(sessionId)) {
    return { ok: true, tabIds: state.tabIds, focusId: sessionId, alreadyOpen: true }
  }
  if (state.tabIds.length >= SESSION_TAB_CAP) {
    return {
      ok: false,
      reason: "cap",
      tabIds: state.tabIds,
      message: SESSION_TAB_OVERFLOW_MESSAGE
    }
  }
  return {
    ok: true,
    tabIds: [...state.tabIds, sessionId],
    focusId: sessionId,
    alreadyOpen: false
  }
}

/**
 * 关标签（不删会话）。返回下一枚应前台的 id；0 枚 → nextActive null（空「新对话」态）。
 */
export function closeSessionTab(
  state: SessionTabsState,
  sessionId: string,
  activeId: string | null
): { tabIds: string[]; nextActive: string | null; closed: boolean } {
  const index = state.tabIds.indexOf(sessionId)
  if (index < 0) {
    return { tabIds: state.tabIds, nextActive: activeId, closed: false }
  }
  const tabIds = state.tabIds.filter((id) => id !== sessionId)
  if (tabIds.length === 0) {
    return { tabIds, nextActive: null, closed: true }
  }
  if (activeId !== sessionId) {
    return { tabIds, nextActive: activeId, closed: true }
  }
  const nextActive = tabIds[Math.min(index, tabIds.length - 1)] ?? null
  return { tabIds, nextActive, closed: true }
}

/** 归档 / 删除会话：从工作集摘掉；若摘掉前台则切下一枚或空态。 */
export function removeSessionFromTabs(
  state: SessionTabsState,
  sessionId: string,
  activeId: string | null
): { tabIds: string[]; nextActive: string | null } {
  return closeSessionTab(state, sessionId, activeId)
}

/**
 * 普通单击侧栏：若已在标签集则选中该标签；不在集内不自动加入。
 * 从 0 标签空态单击：加入为首枚（否则回不去可发首句的工作集）。
 */
export function selectSessionFromSidebar(
  state: SessionTabsState,
  sessionId: string
): { tabIds: string[]; focusId: string; added: boolean } {
  if (state.tabIds.includes(sessionId)) {
    return { tabIds: state.tabIds, focusId: sessionId, added: false }
  }
  if (state.tabIds.length === 0) {
    return { tabIds: [sessionId], focusId: sessionId, added: true }
  }
  return { tabIds: state.tabIds, focusId: sessionId, added: false }
}

/**
 * 新对话钉：当前空「新对话」→ 复用/替换该标签；否则新开标签。
 * atCap 时用新会话 id 替换当前前台标签槽，不突破 6。
 */
export function planNewChatIntoTabs(input: {
  tabIds: string[]
  activeId: string | null
  newSessionId: string
  /** 当前前台是否为空「新对话」（可复用，未真正新建） */
  reusedEmpty: boolean
  /** 工作集里是否有一枚空「新对话」标签（用其 sessionId） */
  emptyNewChatTabId: string | null
}): { tabIds: string[]; focusId: string; replacedEmpty: boolean } {
  if (input.reusedEmpty && input.activeId) {
    return { tabIds: ensureTab(input.tabIds, input.activeId), focusId: input.activeId, replacedEmpty: true }
  }
  if (input.emptyNewChatTabId) {
    const tabIds = input.tabIds.map((id) =>
      id === input.emptyNewChatTabId ? input.newSessionId : id
    )
    const withFocus = tabIds.includes(input.newSessionId)
      ? tabIds
      : [...tabIds, input.newSessionId].slice(0, SESSION_TAB_CAP)
    return { tabIds: withFocus, focusId: input.newSessionId, replacedEmpty: true }
  }
  if (input.tabIds.includes(input.newSessionId)) {
    return { tabIds: input.tabIds, focusId: input.newSessionId, replacedEmpty: false }
  }
  if (input.tabIds.length < SESSION_TAB_CAP) {
    return {
      tabIds: [...input.tabIds, input.newSessionId],
      focusId: input.newSessionId,
      replacedEmpty: false
    }
  }
  // 已满：替换当前前台槽（或末槽），保持 ≤6
  if (input.activeId && input.tabIds.includes(input.activeId)) {
    return {
      tabIds: input.tabIds.map((id) => (id === input.activeId ? input.newSessionId : id)),
      focusId: input.newSessionId,
      replacedEmpty: false
    }
  }
  const tabIds = [...input.tabIds.slice(0, SESSION_TAB_CAP - 1), input.newSessionId]
  return { tabIds, focusId: input.newSessionId, replacedEmpty: false }
}

function ensureTab(tabIds: string[], sessionId: string): string[] {
  return tabIds.includes(sessionId) ? tabIds : [...tabIds, sessionId].slice(0, SESSION_TAB_CAP)
}

/**
 * 关标签是否弹草稿确认：仅「内存草稿」弹；已按会话落盘则不弹。
 * 内存正文：前台用 composer，后台用 memoryDraftText。
 */
export function tabCloseNeedsDraftConfirm(input: {
  sessionId: string
  activeId: string | null
  composer: string
  memoryDraftText?: string
  persistedDraftText?: string
}): boolean {
  if ((input.persistedDraftText ?? "").trim()) return false
  const text =
    input.sessionId === input.activeId
      ? input.composer
      : (input.memoryDraftText ?? "")
  return Boolean(text.trim())
}

/** 前台有会话且工作集为空时种一枚（启动/切项目），0 标签空态（sessionId null）不种。 */
export function seedTabIfEmpty(tabIds: string[], sessionId: string | null): string[] {
  if (!sessionId) return tabIds
  if (tabIds.length > 0) return tabIds
  return [sessionId]
}
