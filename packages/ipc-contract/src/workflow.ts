/**
 * Workflow durable run：列表、详情、恢复、取消、重试。
 * 退出后暂停，重启从最近 checkpoint 恢复。
 */
import { z } from "zod"

export const WorkflowStatus = z.enum([
  "running",
  "paused",
  "waiting_approval",
  "completed",
  "failed",
  "cancelled"
])
export type WorkflowStatus = z.infer<typeof WorkflowStatus>

export const WorkflowStep = z.object({
  id: z.string(),
  index: z.number().int(),
  label: z.string(),
  status: WorkflowStatus,
  inputSummary: z.string().optional(),
  outputSummary: z.string().optional(),
  durationMs: z.number().int().optional(),
  checkpointId: z.string().optional(),
  dependsOn: z.array(z.string()).default([])
})
export type WorkflowStep = z.infer<typeof WorkflowStep>

export const WorkflowRun = z.object({
  id: z.string(),
  sessionId: z.string(),
  workspaceId: z.string().optional(),
  title: z.string(),
  status: WorkflowStatus,
  steps: z.array(WorkflowStep).default([]),
  lastCheckpointId: z.string().optional(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  error: z.string().optional()
})
export type WorkflowRun = z.infer<typeof WorkflowRun>

export const WorkflowListInput = z
  .object({
    workspaceId: z.string().optional(),
    sessionId: z.string().optional()
  })
  .strict()
export type WorkflowListInput = z.infer<typeof WorkflowListInput>

export const WorkflowStepDraft = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  dependsOn: z.array(z.string()).default([])
})

export const WorkflowStartInput = z
  .object({
    sessionId: z.string().min(1),
    workspaceId: z.string().optional(),
    title: z.string().min(1).max(80).default("Plan → Act → Verify"),
    steps: z.array(WorkflowStepDraft).max(12).optional()
  })
  .strict()
export type WorkflowStartInput = z.infer<typeof WorkflowStartInput>

export const WorkflowRecoverInput = z.object({}).strict()
export type WorkflowRecoverInput = z.infer<typeof WorkflowRecoverInput>

export const WorkflowGetInput = z.object({ runId: z.string().min(1) }).strict()
export type WorkflowGetInput = z.infer<typeof WorkflowGetInput>

export const WorkflowResumeInput = z.object({ runId: z.string().min(1) }).strict()
export type WorkflowResumeInput = z.infer<typeof WorkflowResumeInput>

export const WorkflowCancelInput = z.object({ runId: z.string().min(1) }).strict()
export type WorkflowCancelInput = z.infer<typeof WorkflowCancelInput>

export const WorkflowRetryInput = z
  .object({
    runId: z.string().min(1),
    stepId: z.string().optional()
  })
  .strict()
export type WorkflowRetryInput = z.infer<typeof WorkflowRetryInput>
