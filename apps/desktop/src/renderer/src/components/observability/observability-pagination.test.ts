/**
 * 可观测性链路日志分页逻辑单测
 */
import test from "node:test"
import assert from "node:assert/strict"

function paginateSlice<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize
  return items.slice(start, start + pageSize)
}

function getPageNumbers(currentPage: number, totalPages: number): (number | "ellipsis-start" | "ellipsis-end")[] {
  const result: (number | "ellipsis-start" | "ellipsis-end")[] = []
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) result.push(i)
    return result
  }
  result.push(1)
  if (currentPage > 3) result.push("ellipsis-start")
  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)
  for (let i = start; i <= end; i++) result.push(i)
  if (currentPage < totalPages - 2) result.push("ellipsis-end")
  result.push(totalPages)
  return result
}

test("分页切片正确截取指定页码数据", () => {
  const dummyList = Array.from({ length: 35 }, (_, i) => `item_${i + 1}`)

  const page1 = paginateSlice(dummyList, 1, 10)
  assert.equal(page1.length, 10)
  assert.equal(page1[0], "item_1")
  assert.equal(page1[9], "item_10")

  const page4 = paginateSlice(dummyList, 4, 10)
  assert.equal(page4.length, 5)
  assert.equal(page4[0], "item_31")
  assert.equal(page4[4], "item_35")
})

test("页码生成器在跨度大时正确生成两端省略号", () => {
  const pagesSmall = getPageNumbers(1, 4)
  assert.deepEqual(pagesSmall, [1, 2, 3, 4])

  const pagesMiddle = getPageNumbers(5, 10)
  assert.ok(pagesMiddle.includes("ellipsis-start"))
  assert.ok(pagesMiddle.includes("ellipsis-end"))
  assert.equal(pagesMiddle[0], 1)
  assert.equal(pagesMiddle[pagesMiddle.length - 1], 10)
})
