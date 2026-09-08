/**
 * command 表面：工作目录 + 即将执行的 shell。
 */
export function ApprovalCommandBody({ cwd, command }: { cwd: string; command: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-background-secondary-default px-3 py-2.5">
      <p className="font-mono text-caption-2-regular text-text-tertiary">{cwd}</p>
      <pre className="m-0 whitespace-pre-wrap break-words font-mono text-caption-1-regular leading-relaxed text-text-primary">
        <span className="mr-1.5 select-none text-text-tertiary">$</span>
        {command || "—"}
      </pre>
    </div>
  )
}
