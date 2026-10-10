/**
 * 启动引导的步骤和开门条件。没有 React，也没有 IPC。
 */

/** 一步的文案和底栏。新增步骤只改这一张表，再在窗口里登记画面。 */
export const SETUP_GUIDE_FACE = {
  intro: {
    title: "settings.setupGuide.introTitle",
    body: "settings.setupGuide.introBody",
    primary: "settings.setupGuide.getStarted",
    hero: true,
    choice: false,
    showBack: false,
    finishes: false,
    skipWithoutWorkspace: false,
    mark: "app"
  },
  capabilities: {
    title: "settings.setupGuide.capabilitiesTitle",
    body: "settings.setupGuide.capabilitiesBody",
    primary: "settings.setupGuide.continue",
    hero: false,
    choice: false,
    showBack: true,
    finishes: false,
    skipWithoutWorkspace: false,
    mark: "none"
  },
  engines: {
    title: "settings.setupGuide.enginesTitle",
    body: "settings.setupGuide.enginesBody",
    primary: "settings.setupGuide.continue",
    hero: false,
    choice: true,
    showBack: true,
    finishes: false,
    skipWithoutWorkspace: false,
    mark: "none"
  },
  "connect-model": {
    title: "settings.setupGuide.connectTitle",
    body: "settings.setupGuide.connectBody",
    primary: "settings.setupGuide.continue",
    hero: false,
    choice: true,
    showBack: true,
    finishes: false,
    skipWithoutWorkspace: false,
    mark: "none"
  },
  appearance: {
    title: "settings.setupGuide.appearanceTitle",
    body: "settings.setupGuide.appearanceBody",
    primary: "settings.setupGuide.continue",
    hero: false,
    choice: true,
    showBack: true,
    finishes: false,
    skipWithoutWorkspace: false,
    mark: "none"
  },
  workspace: {
    title: "settings.setupGuide.workspaceTitle",
    body: "settings.setupGuide.workspaceBody",
    primary: "settings.setupGuide.continue",
    hero: false,
    choice: true,
    showBack: true,
    finishes: false,
    skipWithoutWorkspace: false,
    mark: "none"
  },
  ready: {
    title: "settings.setupGuide.readyTitle",
    body: "",
    primary: "settings.setupGuide.start",
    hero: true,
    choice: false,
    showBack: false,
    finishes: true,
    skipWithoutWorkspace: false,
    mark: "ready"
  }
} as const

export type SetupGuideStep = keyof typeof SETUP_GUIDE_FACE

export const SETUP_GUIDE_STEPS = Object.keys(SETUP_GUIDE_FACE) as SetupGuideStep[]

export type SetupGuideGate = "pending" | "show" | "exempt" | "hidden"

/** 到了安装、外观、文件夹才算开始设置，首次启动的门闩不再自动关掉。 */
export function isSetupGuideChoiceStep(step: SetupGuideStep): boolean {
  return SETUP_GUIDE_FACE[step].choice
}

export function nextSetupGuideStep(step: SetupGuideStep): SetupGuideStep {
  const index = SETUP_GUIDE_STEPS.indexOf(step)
  return SETUP_GUIDE_STEPS[Math.min(index + 1, SETUP_GUIDE_STEPS.length - 1)] ?? "ready"
}

export function previousSetupGuideStep(step: SetupGuideStep): SetupGuideStep {
  const index = SETUP_GUIDE_STEPS.indexOf(step)
  return SETUP_GUIDE_STEPS[Math.max(index - 1, 0)] ?? "intro"
}

/**
 * 设置和工作区名单都到齐才判断。
 * 已记下完成时间就不再弹。已有工作区的旧安装记一笔完成时间，不弹窗。
 * 查询失败时不弹，避免挡住已经在用的人。
 */
export function resolveSetupGuideGate(input: {
  settingsSettled: boolean
  workspacesSettled: boolean
  settingsFailed: boolean
  workspacesFailed: boolean
  completedAt: string | null | undefined
  workspaceCount: number
}): SetupGuideGate {
  if (!input.settingsSettled || !input.workspacesSettled) return "pending"
  if (input.settingsFailed || input.workspacesFailed) return "hidden"
  if (input.completedAt) return "hidden"
  if (input.workspaceCount > 0) return "exempt"
  return "show"
}
