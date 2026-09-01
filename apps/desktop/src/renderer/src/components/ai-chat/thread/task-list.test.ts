/**
 * TaskList 任务状态归一化与完成度进度单测
 */
import test from "node:test"
import assert from "node:assert/strict"

function normalizeTaskItems(tasks: Array<{ title: string; status?: "pending" | "in_progress" | "completed" } | string>, currentIndex?: number) {
  return tasks.map((t, i) => {
    if (typeof t === "string") {
      if (currentIndex !== undefined) {
        if (i < currentIndex) return { title: t, status: "completed" }
        if (i === currentIndex) return { title: t, status: "in_progress" }
        return { title: t, status: "pending" }
      }
      return { title: t, status: "pending" }
    }
    return {
      title: t.title,
      status: t.status ?? (currentIndex !== undefined ? (i < currentIndex ? "completed" : i === currentIndex ? "in_progress" : "pending") : "pending")
    }
  })
}

test("normalizeTaskItems 正确依据 currentIndex 推导各个任务状态", () => {
  const raw = [
    "Scaffold project",
    "Build component",
    "Run verification"
  ]

  const items = normalizeTaskItems(raw, 1)
  assert.equal(items.length, 3)
  assert.equal(items[0]?.status, "completed")
  assert.equal(items[1]?.status, "in_progress")
  assert.equal(items[2]?.status, "pending")

  const completedCount = items.filter((t) => t.status === "completed").length
  assert.equal(completedCount, 1)
  const pct = Math.round((completedCount / items.length) * 100)
  assert.equal(pct, 33)
})
