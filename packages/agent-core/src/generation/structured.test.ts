import assert from "node:assert/strict"
import { test } from "node:test"
import { jsonSchemaToZod } from "./structured.ts"
import { toZodSchema } from "./structured-valibot.ts"

test("jsonSchemaToZod 解析 object / required", () => {
  const schema = jsonSchemaToZod({
    type: "object",
    required: ["name"],
    properties: {
      name: { type: "string" },
      age: { type: "integer" }
    }
  })
  assert.equal(schema.safeParse({ name: "a" }).success, true)
  assert.equal(schema.safeParse({ name: "a", age: 1 }).success, true)
  assert.equal(schema.safeParse({ age: 1 }).success, false)
})

test("jsonSchemaToZod 解析 array", () => {
  const schema = jsonSchemaToZod({ type: "array", items: { type: "string" } })
  assert.equal(schema.safeParse(["a"]).success, true)
  assert.equal(schema.safeParse([1]).success, false)
})

test("toZodSchema 解析 Valibot 形 object / optional", () => {
  const schema = toZodSchema({
    type: "object",
    "~standard": { version: 1, vendor: "valibot" },
    entries: {
      name: { type: "string" },
      age: { type: "optional", wrapped: { type: "integer" } }
    }
  })
  assert.equal(schema.safeParse({ name: "a" }).success, true)
  assert.equal(schema.safeParse({ name: "a", age: 2 }).success, true)
  assert.equal(schema.safeParse({ age: 2 }).success, false)
})
