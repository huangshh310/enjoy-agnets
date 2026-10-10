/**
 * 自定义 stdio ACP 表单：command/args/env/cwd，行内错误，无假绿灯。
 */
import { useEffect, useState, type ReactNode } from "react"
import { RiAddLine, RiDeleteBinLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useSecretWriteGate } from "@renderer/hooks/use-secret-write-gate"
import { useT } from "@renderer/i18n"
import type { CustomAgentRecord, UpsertCustomAgentInput } from "@enjoy-agents/ipc-contract"
import { isCustomAgentId } from "@enjoy-agents/ipc-contract"
import type { SecretWriteErrorCode } from "@renderer/lib/secret-write"
import { SecretWriteError, SecretWritePreflight, SecretWriteSaveTip } from "../secret-write-notice"
import { submitCustomAgentWrite } from "./custom-acp-agent-submit"

export type CustomAgentDraft = {
  id?: string
  label: string
  command: string
  args: string[]
  env: Array<{ key: string; value: string }>
  cwdMode: "workspace" | "custom"
  cwd: string
}

export function emptyCustomDraft(): CustomAgentDraft {
  return { label: "", command: "", args: [], env: [], cwdMode: "workspace", cwd: "" }
}

export function CustomAcpAgentForm({
  initialId,
  onSaved,
  onCancel
}: {
  initialId?: string
  onSaved: () => void
  onCancel?: () => void
}) {
  const t = useT()
  const gate = useSecretWriteGate()
  const [draft, setDraft] = useState<CustomAgentDraft>(emptyCustomDraft)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!initialId || !isCustomAgentId(initialId) || !hasIde()) return
    void getIde()
      .agentTools.getCustom({ id: initialId })
      .then((record) => setDraft(draftFromRecord(record as CustomAgentRecord)))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }, [initialId])

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        void submitCustomAgent(draft, setBusy, setError, gate.setWriteCode, onSaved, t)
      }}
    >
      {gate.preflight ? <SecretWritePreflight /> : null}
      <p className="text-caption-2-medium text-text-tertiary">{t("settings.registry.customBasenamePolicy")}</p>
      <Field label={t("settings.registry.customLabel")}>
        <Input
          value={draft.label}
          onChange={(event) => setDraft({ ...draft, label: event.target.value })}
          maxLength={40}
          required
        />
      </Field>
      <Field label={t("settings.registry.customCommand")} hint={t("settings.registry.customCommandHint")}>
        <Input
          value={draft.command}
          onChange={(event) => setDraft({ ...draft, command: event.target.value })}
          className="font-mono"
          required
        />
      </Field>
      <ArgsEditor args={draft.args} onChange={(args) => setDraft({ ...draft, args })} />
      <EnvEditor env={draft.env} onChange={(env) => setDraft({ ...draft, env })} />
      <CwdFields draft={draft} onChange={setDraft} />
      {gate.errorCode ? <SecretWriteError code={gate.errorCode} /> : null}
      {error ? <p className="text-caption-1-medium text-text-error-primary">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <SecretWriteSaveTip blocked={gate.blocked}>
          <Button type="submit" size="sm" disabled={busy || gate.blocked} className="text-caption-1-medium">
            {busy ? t("settings.secretWrite.saving") : t("settings.registry.saveCustom")}
          </Button>
        </SecretWriteSaveTip>
        {onCancel ? (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel} className="text-caption-1-medium">
            {t("settings.agentTools.close")}
          </Button>
        ) : null}
      </div>
    </form>
  )
}

function Field({
  label,
  hint,
  children
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-caption-1-medium text-text-secondary">{label}</span>
      {children}
      {hint ? <span className="text-caption-2-medium text-text-tertiary">{hint}</span> : null}
    </label>
  )
}

function ArgsEditor({ args, onChange }: { args: string[]; onChange: (args: string[]) => void }) {
  const t = useT()
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-caption-1-medium text-text-secondary">{t("settings.registry.customArgs")}</span>
      {args.map((arg, index) => (
        <div key={`${index}-${arg}`} className="flex items-center gap-1.5">
          <Input
            value={arg}
            onChange={(event) => onChange(args.map((item, i) => (i === index ? event.target.value : item)))}
            className="font-mono"
          />
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange(args.filter((_, i) => i !== index))}>
            <RiDeleteBinLine className="size-3.5" />
          </Button>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={() => onChange([...args, ""])} className="w-fit gap-1">
        <RiAddLine className="size-3.5" />
        {t("settings.agentTools.customArgsAdd")}
      </Button>
    </div>
  )
}

function EnvEditor({
  env,
  onChange
}: {
  env: Array<{ key: string; value: string }>
  onChange: (env: Array<{ key: string; value: string }>) => void
}) {
  const t = useT()
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-caption-1-medium text-text-secondary">{t("settings.registry.customEnv")}</span>
      <p className="text-caption-2-medium text-text-tertiary">{t("settings.registry.customEnvHint")}</p>
      {env.map((row, index) => (
        <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-1.5">
          <Input
            value={row.key}
            onChange={(event) => onChange(env.map((item, i) => (i === index ? { ...item, key: event.target.value } : item)))}
            className="font-mono"
            placeholder="KEY"
          />
          <Input
            type={looksSecret(row.key) ? "password" : "text"}
            value={row.value}
            onChange={(event) =>
              onChange(env.map((item, i) => (i === index ? { ...item, value: event.target.value } : item)))
            }
            className="font-mono"
          />
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange(env.filter((_, i) => i !== index))}>
            <RiDeleteBinLine className="size-3.5" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => onChange([...env, { key: "", value: "" }])}
        className="w-fit gap-1"
      >
        <RiAddLine className="size-3.5" />
        {t("settings.agentTools.customArgsAdd")}
      </Button>
    </div>
  )
}

function CwdFields({
  draft,
  onChange
}: {
  draft: CustomAgentDraft
  onChange: (draft: CustomAgentDraft) => void
}) {
  const t = useT()
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-caption-1-medium text-text-secondary">{t("settings.registry.customCwd")}</legend>
      <label className="flex items-center gap-2 text-caption-1-regular text-text-secondary">
        <input
          type="radio"
          name="cwdMode"
          checked={draft.cwdMode === "workspace"}
          onChange={() => onChange({ ...draft, cwdMode: "workspace" })}
        />
        {t("settings.registry.cwdWorkspace")}
      </label>
      <label className="flex items-center gap-2 text-caption-1-regular text-text-secondary">
        <input
          type="radio"
          name="cwdMode"
          checked={draft.cwdMode === "custom"}
          onChange={() => onChange({ ...draft, cwdMode: "custom" })}
        />
        {t("settings.registry.cwdCustom")}
      </label>
      {draft.cwdMode === "custom" ? (
        <Input
          value={draft.cwd}
          onChange={(event) => onChange({ ...draft, cwd: event.target.value })}
          className="font-mono"
          placeholder="/absolute/path"
        />
      ) : null}
    </fieldset>
  )
}

async function submitCustomAgent(
  draft: CustomAgentDraft,
  setBusy: (value: boolean) => void,
  setError: (value: string | null) => void,
  setWriteCode: (code: SecretWriteErrorCode | null) => void,
  onSaved: () => void,
  t: (path: string, vars?: Record<string, string | number>) => string
) {
  if (!hasIde()) return
  setBusy(true)
  setError(null)
  setWriteCode(null)
  const result = await submitCustomAgentWrite(toInput(draft), t, draft.command)
  setBusy(false)
  if (result.ok) {
    onSaved()
    return
  }
  if ("writeCode" in result) setWriteCode(result.writeCode)
  else setError(result.error)
}

function toInput(draft: CustomAgentDraft): UpsertCustomAgentInput {
  const env: Record<string, string> = {}
  for (const row of draft.env) {
    if (row.key.trim()) env[row.key.trim()] = row.value
  }
  return {
    id: draft.id && isCustomAgentId(draft.id) ? draft.id : undefined,
    label: draft.label.trim(),
    command: draft.command.trim(),
    args: draft.args.map((item) => item.trim()).filter(Boolean),
    env,
    cwdMode: draft.cwdMode,
    cwd: draft.cwdMode === "custom" ? draft.cwd.trim() : undefined
  }
}

function draftFromRecord(record: CustomAgentRecord): CustomAgentDraft {
  return {
    id: record.id,
    label: record.label,
    command: record.command,
    args: [...record.args],
    env: Object.entries(record.env).map(([key, value]) => ({ key, value })),
    cwdMode: record.cwdMode,
    cwd: record.cwd ?? ""
  }
}

function looksSecret(key: string): boolean {
  return /key|token|secret|password|passwd/i.test(key)
}
