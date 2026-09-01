/**
 * 预置 Workflow 配方。页面只展示，不改语义。
 */

export type WorkflowRecipe = {
  id: string
  title: string
  subtitle: string
  category: string
  description: string
  chain: string
  steps: string[]
}

export const WORKFLOW_RECIPES: WorkflowRecipe[] = [
  {
    id: "plan-act-verify",
    title: "Plan → Act → Verify",
    subtitle: "全自动规划、实现与验证闭环",
    category: "Full Cycle Dev",
    description:
      "Multi-step autonomous workflow: first writes a structural plan, makes precise code modifications, and validates with automated test suites.",
    chain: "plan>act>verify",
    steps: ["Plan", "Act", "Verify"]
  },
  {
    id: "explore-refactor-test",
    title: "Explore → Refactor → Test",
    subtitle: "代码架构探索与安全重构",
    category: "Architecture & Refactor",
    description:
      "Deep codebase research followed by systematic refactoring and automated regression verification.",
    chain: "explore>refactor>test",
    steps: ["Explore", "Refactor", "Test"]
  },
  {
    id: "audit-fix-review",
    title: "Audit → Fix → Review",
    subtitle: "安全隐患巡检与缺陷修复",
    category: "Security & BugFix",
    description:
      "Scan code for potential runtime vulnerabilities, generate targeted fixes, and perform human-in-the-loop review.",
    chain: "audit>fix>review",
    steps: ["Audit", "Fix", "Review"]
  },
  {
    id: "analyze-patch-verify",
    title: "Analyze → Patch → Verify",
    subtitle: "针对性诊断与热补丁交付",
    category: "Diagnostic & Patch",
    description:
      "Analyze error logs or issue descriptions, synthesize minimal diff patch, and verify against target workspace.",
    chain: "analyze>patch>verify",
    steps: ["Analyze", "Patch", "Verify"]
  }
]
