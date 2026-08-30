"use client"

import { RiCodeBlock, RiGlobalLine, RiShareForwardLine, RiSparklingFill } from "@remixicon/react"
import { QuietIconButton } from "@/components/base/buttons/quiet-icon-button"
import { PillTab, PillTabList } from "@/components/base/tabs/pill-tab"
import { cx } from "@/utils/cx"
import type { ChangedFileRow } from "@renderer/stores/chat-store"
import { AiChatCodePane } from "./ai-chat-code-pane"

export function AiChatChangesPanel({
  rightTab,
  onRightTabChange,
  changes,
  additions,
  deletions,
  selectedFilePath,
  selectedFileContent,
  onSelectFile
}: {
  rightTab: "changes" | "browser"
  onRightTabChange: (tab: "changes" | "browser") => void
  changes: ChangedFileRow[]
  additions: number
  deletions: number
  selectedFilePath: string | null
  selectedFileContent: string
  onSelectFile: (path: string) => void
}) {
  return (
    <section className="flex h-full min-w-0 flex-col bg-background-primary-default">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <PillTabList>
          <PillTab variant="blue" icon={RiCodeBlock} isSelected={rightTab === "changes"} onSelect={() => onRightTabChange("changes")}>
            Changes
          </PillTab>
          <PillTab variant="blue" icon={RiGlobalLine} isSelected={rightTab === "browser"} onSelect={() => onRightTabChange("browser")}>
            Browser
          </PillTab>
        </PillTabList>
      </div>

      {rightTab === "browser" ? (
        <div className="flex flex-1 items-center justify-center text-body-medium text-text-tertiary">
          Browser preview is not connected yet.
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 px-4 py-2">
            <p className="min-w-0 flex-1 text-body-medium text-text-primary">
              {changes.length} Uncommitted changes
            </p>
            <span className="text-caption-1-medium text-state-success-text">+{additions}</span>
            <span className="text-caption-1-medium text-text-error-primary">-{deletions}</span>
            <QuietIconButton icon={RiShareForwardLine} aria-label="Share changes" />
          </div>

          <div className="flex flex-col gap-1 px-2 pb-2">
            {changes.length === 0 ? (
              <p className="px-2 py-1 text-caption-1-medium text-text-tertiary">Working tree is clean.</p>
            ) : null}
            {changes.map((file) => (
              <button
                key={file.path}
                type="button"
                onClick={() => onSelectFile(file.path)}
                className={cx(
                  "flex items-center gap-2 rounded-2lg px-2 py-1.5 text-left",
                  file.path === selectedFilePath
                    ? "bg-background-secondary-default"
                    : "hover:bg-background-secondary-hover"
                )}
              >
                <RiSparklingFill className="size-4 text-accent-500" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-caption-1-medium text-text-secondary">{file.path}</span>
                <span className="rounded-md bg-badge-new-background px-1.5 py-0.5 text-caption-1-semibold text-badge-new-text">
                  {file.status}
                </span>
              </button>
            ))}
          </div>

          {selectedFilePath ? (
            <AiChatCodePane path={selectedFilePath} value={selectedFileContent} />
          ) : (
            <div className="flex flex-1 items-center justify-center text-caption-1-medium text-text-tertiary">
              Select a changed file to preview.
            </div>
          )}
        </>
      )}
    </section>
  )
}
