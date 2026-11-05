import assert from "node:assert/strict"
import { test } from "node:test"
import type { FileTreeNode } from "../types/review.types"
import {
  ancestorFolderIds,
  collectFolderIds,
  indexFileTree,
  mergeExpandedIds
} from "./headless-tree-data"

const sample: FileTreeNode[] = [
  {
    id: "apps",
    name: "apps",
    path: "apps",
    isDir: true,
    children: [
      {
        id: "apps/desktop",
        name: "desktop",
        path: "apps/desktop",
        isDir: true,
        children: [
          {
            id: "apps/desktop/a.ts",
            name: "a.ts",
            path: "apps/desktop/a.ts",
            isDir: false,
            status: "modified"
          }
        ]
      }
    ]
  }
]

test("indexFileTree + collectFolderIds", () => {
  const idx = indexFileTree(sample)
  assert.equal(idx.byId.get("apps/desktop/a.ts")?.name, "a.ts")
  assert.deepEqual(collectFolderIds(sample), ["apps", "apps/desktop"])
})

test("ancestorFolderIds + mergeExpandedIds", () => {
  assert.deepEqual(ancestorFolderIds("apps/desktop/a.ts"), ["apps", "apps/desktop"])
  assert.deepEqual(ancestorFolderIds("a.ts"), [])
  assert.deepEqual(mergeExpandedIds(["apps"], ["apps", "apps/desktop"]), [
    "apps",
    "apps/desktop"
  ])
})
