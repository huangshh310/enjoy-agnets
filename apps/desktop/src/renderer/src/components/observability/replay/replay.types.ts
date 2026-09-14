/**
 * 事件流回放类型定义与精选示例事件。
 */
export type ReplayRow = {
  type: string
  runId?: string
  sequence?: number
  timestamp?: number
  toolName?: string
  decision?: string
}

export type EventFilterType = "all" | "run" | "tool" | "approval" | "text"

export const SAMPLE_REPLAY_EVENTS: ReplayRow[] = [
  {
    type: "run.start",
    runId: "run_sample_agent_demo",
    sequence: 1,
    timestamp: Date.now() - 3200
  },
  {
    type: "text.delta",
    runId: "run_sample_agent_demo",
    sequence: 2,
    timestamp: Date.now() - 3050
  },
  {
    type: "tool.start",
    runId: "run_sample_agent_demo",
    sequence: 3,
    timestamp: Date.now() - 2700,
    toolName: "read_file"
  },
  {
    type: "approval.required",
    runId: "run_sample_agent_demo",
    sequence: 4,
    timestamp: Date.now() - 2680,
    toolName: "read_file"
  },
  {
    type: "approval.resolved",
    runId: "run_sample_agent_demo",
    sequence: 5,
    timestamp: Date.now() - 2100,
    toolName: "read_file",
    decision: "allow"
  },
  {
    type: "tool.result",
    runId: "run_sample_agent_demo",
    sequence: 6,
    timestamp: Date.now() - 1950,
    toolName: "read_file"
  },
  {
    type: "text.delta",
    runId: "run_sample_agent_demo",
    sequence: 7,
    timestamp: Date.now() - 1600
  },
  {
    type: "tool.start",
    runId: "run_sample_agent_demo",
    sequence: 8,
    timestamp: Date.now() - 1200,
    toolName: "bash"
  },
  {
    type: "tool.result",
    runId: "run_sample_agent_demo",
    sequence: 9,
    timestamp: Date.now() - 400,
    toolName: "bash"
  },
  {
    type: "text.delta",
    runId: "run_sample_agent_demo",
    sequence: 10,
    timestamp: Date.now() - 150
  },
  {
    type: "run.end",
    runId: "run_sample_agent_demo",
    sequence: 11,
    timestamp: Date.now()
  }
]
