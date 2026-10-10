/**
 * Dock 默认摘要：应用显示名 + 人话动作，不带 bundle id / 裸 action / §。
 */
export type DesktopApprovalVerb = "click" | "type" | "scroll" | "key" | "drag" | "generic"

const VERB_ALIASES: Record<string, DesktopApprovalVerb> = {
  click: "click",
  double_click: "click",
  right_click: "click",
  type: "type",
  type_text: "type",
  scroll: "scroll",
  key: "key",
  press: "key",
  drag: "drag"
}

export function desktopApprovalVerb(action: unknown): DesktopApprovalVerb {
  if (typeof action !== "string") return "generic"
  return VERB_ALIASES[action.trim().toLowerCase()] ?? "generic"
}

export function desktopApprovalVerbKey(verb: DesktopApprovalVerb): string {
  if (verb === "click") return "chat.desktopApprovalVerbClick"
  if (verb === "type") return "chat.desktopApprovalVerbType"
  if (verb === "scroll") return "chat.desktopApprovalVerbScroll"
  if (verb === "key") return "chat.desktopApprovalVerbKey"
  if (verb === "drag") return "chat.desktopApprovalVerbDrag"
  return "chat.desktopApprovalVerbGeneric"
}

/** 默认句：在「备忘录」里点击「今日」。无控件名则省略引号段。 */
export function desktopApprovalSummaryKey(controlName: string): string {
  return controlName.trim() ? "chat.desktopApprovalSummary" : "chat.desktopApprovalSummaryBare"
}
