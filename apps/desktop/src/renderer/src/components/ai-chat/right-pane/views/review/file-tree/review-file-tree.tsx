/**
 * 审查栏右侧文件树：导航/折叠/焦点壳换 @headless-tree/react；
 * 筛选 / 空态 / Git 态 / 暂存 / onSelectFile↔Diff 契约保留。
 * 不绑 j/k；#219 review.file.next/prev 仍走全局 dispatcher。
 */
import { useEffect, useMemo, useState } from "react"
import { RiCloseLine, RiSearchLine } from "@remixicon/react"
import { hotkeysCoreFeature, syncDataLoaderFeature } from "@headless-tree/core"
import { useTree } from "@headless-tree/react"
import { useT } from "@renderer/i18n"
import type { ChangedFileRow } from "@renderer/stores/chat-store"
import type { FileTreeNode } from "../types/review.types"
import { buildFileTree } from "./build-file-tree"
import { FileTreeItem } from "./file-tree-item"
import { listedStagePaths } from "./listed-stage-paths"
import {
  HEADLESS_ROOT_ID,
  ancestorFolderIds,
  collectFolderIds,
  indexFileTree,
  mergeExpandedIds
} from "./headless-tree-data"

export function ReviewFileTree(props: {
  changes: ChangedFileRow[]
  selectedFilePath: string | null
  onSelectFile: (path: string) => void
  onStage?: (paths: string[], action: "add" | "unstage") => void
}) {
  const { changes, selectedFilePath, onSelectFile } = props
  const t = useT()
  const [filterQuery, setFilterQuery] = useState("")

  const roots = useMemo(
    () => buildFileTree(changes, filterQuery),
    [changes, filterQuery]
  )

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden bg-background-primary-default select-none"
      data-testid="review-file-tree"
    >
      <div className="flex shrink-0 items-center gap-1.5 border-b border-separator-border/70 px-2.5 py-1.5 bg-background-secondary-default/40">
        <RiSearchLine className="size-3.5 shrink-0 text-text-tertiary" />
        <input
          type="text"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder={t("chat.reviewFilterFiles")}
          className="w-full bg-transparent text-caption-2-medium text-text-primary placeholder:text-text-tertiary focus:outline-hidden"
          data-testid="review-file-tree-filter"
        />
        {filterQuery ? (
          <button
            type="button"
            onClick={() => setFilterQuery("")}
            className="cursor-pointer text-text-tertiary hover:text-text-primary"
          >
            <RiCloseLine className="size-3.5" />
          </button>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {roots.length === 0 ? (
          <div
            data-testid="review-file-list-empty"
            className="flex min-h-0 flex-1 items-center justify-center bg-background-primary-default text-caption-2-medium text-text-tertiary"
          >
            {t("chat.reviewNoMatchingFiles")}
          </div>
        ) : (
          <HeadlessReviewTree
            roots={roots}
            selectedFilePath={selectedFilePath}
            onSelectFile={onSelectFile}
            onStage={
              props.onStage
                ? (path, action) => {
                    const paths = listedStagePaths(roots, path, action)
                    if (paths.length === 0 || !props.onStage) return
                    props.onStage(paths, action)
                  }
                : undefined
            }
          />
        )}
      </div>
    </div>
  )
}

function HeadlessReviewTree(props: {
  roots: FileTreeNode[]
  selectedFilePath: string | null
  onSelectFile: (path: string) => void
  onStage?: (path: string, action: "add" | "unstage") => void
}) {
  const { roots, selectedFilePath, onSelectFile, onStage } = props
  const index = useMemo(() => indexFileTree(roots), [roots])
  const initialExpanded = useMemo(
    () =>
      mergeExpandedIds(
        collectFolderIds(roots),
        ancestorFolderIds(selectedFilePath)
      ),
    // 仅首挂按全开；之后靠 effect 补祖先
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roots]
  )

  const [expandedItems, setExpandedItems] = useState<string[]>(initialExpanded)

  useEffect(() => {
    setExpandedItems(
      mergeExpandedIds(collectFolderIds(roots), ancestorFolderIds(selectedFilePath))
    )
  }, [roots])

  useEffect(() => {
    const ancestors = ancestorFolderIds(selectedFilePath)
    if (ancestors.length === 0) return
    setExpandedItems((prev) => mergeExpandedIds(prev, ancestors))
  }, [selectedFilePath])

  const rootNode = useMemo<FileTreeNode>(
    () => ({
      id: HEADLESS_ROOT_ID,
      name: "",
      path: "",
      isDir: true,
      children: roots
    }),
    [roots]
  )

  const tree = useTree<FileTreeNode>({
    state: { expandedItems },
    setExpandedItems,
    rootItemId: HEADLESS_ROOT_ID,
    indent: 14,
    getItemName: (item) => item.getItemData().name,
    isItemFolder: (item) => item.getItemData().isDir,
    dataLoader: {
      getItem: (itemId) => {
        if (itemId === HEADLESS_ROOT_ID) return rootNode
        const node = index.byId.get(itemId)
        if (!node) {
          return {
            id: itemId,
            name: itemId,
            path: itemId,
            isDir: false
          }
        }
        return node
      },
      getChildren: (itemId) => {
        if (itemId === HEADLESS_ROOT_ID) return roots.map((n) => n.id)
        const node = index.byId.get(itemId)
        return node?.children?.map((child) => child.id) ?? []
      }
    },
    onPrimaryAction: (item) => {
      const node = item.getItemData()
      if (node.isDir) {
        if (item.isExpanded()) item.collapse()
        else item.expand()
        return
      }
      onSelectFile(node.path)
    },
    hotkeys: {
      // Enter / Space 打开文件或折叠目录；不绑 j/k
      customActivateEnter: {
        hotkey: "Enter",
        handler: (_e, instance) => {
          const focusedId = instance.getState().focusedItem
          if (!focusedId) return
          instance.getItemInstance(focusedId)?.primaryAction()
        }
      },
      customActivateSpace: {
        hotkey: "Space",
        handler: (e, instance) => {
          e.preventDefault()
          const focusedId = instance.getState().focusedItem
          if (!focusedId) return
          instance.getItemInstance(focusedId)?.primaryAction()
        }
      }
    },
    features: [syncDataLoaderFeature, hotkeysCoreFeature]
  })

  return (
    <div
      {...tree.getContainerProps()}
      className="min-h-0 flex-1 overflow-y-auto py-1 outline-none"
      data-testid="review-file-tree-list"
    >
      {tree.getItems().map((item) => (
        <FileTreeItem
          key={item.getId()}
          item={item}
          selectedFilePath={selectedFilePath}
          treeRoots={roots}
          onStage={onStage}
        />
      ))}
    </div>
  )
}
