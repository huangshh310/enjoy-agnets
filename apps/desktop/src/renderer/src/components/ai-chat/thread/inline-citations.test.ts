/**
 * InlineCitations 行内引用标记解析单测
 */
import test from "node:test"
import assert from "node:assert/strict"

function parseCitationSegments(text: string) {
  return text.split(/(\[\d+\])/g).map((part) => {
    const match = part.match(/^\[(\d+)\]$/)
    if (match && match[1]) {
      return { isCitation: true, n: Number(match[1]) }
    }
    return { isCitation: false, text: part }
  })
}

test("parseCitationSegments 正确拆分正文与 [1], [2] 上标角标", () => {
  const text = "Transformers scale well[1], though attention is quadratic[2]."
  const segments = parseCitationSegments(text)

  assert.equal(segments.length, 5)
  assert.equal(segments[0]?.isCitation, false)
  assert.equal(segments[1]?.isCitation, true)
  assert.equal((segments[1] as { isCitation: true; n: number }).n, 1)
  assert.equal(segments[3]?.isCitation, true)
  assert.equal((segments[3] as { isCitation: true; n: number }).n, 2)
})
