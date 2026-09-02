/**
 * 预置 Workflow 配方。页面只展示，不改语义。
 */
import type { TranslateFn } from "@renderer/i18n"

export type WorkflowRecipe = {
  id: string
  title: string
  subtitle: string
  category: string
  description: string
  chain: string
  steps: string[]
}

const RECIPE_DEFS = [
  {
    id: "plan-act-verify",
    chain: "plan>act>verify",
    titleKey: "pages.workflows.recipePlanTitle",
    subtitleKey: "pages.workflows.recipePlanSubtitle",
    categoryKey: "pages.workflows.recipePlanCategory",
    descKey: "pages.workflows.recipePlanDesc",
    stepKeys: [
      "pages.workflows.recipePlanStep1",
      "pages.workflows.recipePlanStep2",
      "pages.workflows.recipePlanStep3"
    ]
  },
  {
    id: "explore-refactor-test",
    chain: "explore>refactor>test",
    titleKey: "pages.workflows.recipeExploreTitle",
    subtitleKey: "pages.workflows.recipeExploreSubtitle",
    categoryKey: "pages.workflows.recipeExploreCategory",
    descKey: "pages.workflows.recipeExploreDesc",
    stepKeys: [
      "pages.workflows.recipeExploreStep1",
      "pages.workflows.recipeExploreStep2",
      "pages.workflows.recipeExploreStep3"
    ]
  },
  {
    id: "audit-fix-review",
    chain: "audit>fix>review",
    titleKey: "pages.workflows.recipeAuditTitle",
    subtitleKey: "pages.workflows.recipeAuditSubtitle",
    categoryKey: "pages.workflows.recipeAuditCategory",
    descKey: "pages.workflows.recipeAuditDesc",
    stepKeys: [
      "pages.workflows.recipeAuditStep1",
      "pages.workflows.recipeAuditStep2",
      "pages.workflows.recipeAuditStep3"
    ]
  },
  {
    id: "analyze-patch-verify",
    chain: "analyze>patch>verify",
    titleKey: "pages.workflows.recipeAnalyzeTitle",
    subtitleKey: "pages.workflows.recipeAnalyzeSubtitle",
    categoryKey: "pages.workflows.recipeAnalyzeCategory",
    descKey: "pages.workflows.recipeAnalyzeDesc",
    stepKeys: [
      "pages.workflows.recipeAnalyzeStep1",
      "pages.workflows.recipeAnalyzeStep2",
      "pages.workflows.recipeAnalyzeStep3"
    ]
  }
] as const

export function getWorkflowRecipes(t: TranslateFn): WorkflowRecipe[] {
  return RECIPE_DEFS.map((recipe) => ({
    id: recipe.id,
    title: t(recipe.titleKey),
    subtitle: t(recipe.subtitleKey),
    category: t(recipe.categoryKey),
    description: t(recipe.descKey),
    chain: recipe.chain,
    steps: recipe.stepKeys.map((key) => t(key))
  }))
}
