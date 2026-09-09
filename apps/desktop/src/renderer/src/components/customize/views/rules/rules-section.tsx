/**
 * 项目规则管理：扫描、筛选、模板写入、新建与查看。
 */
import { RulesCreateDialog } from "./rules-create-dialog"
import { RulesHeader } from "./rules-header"
import { RulesInspectDialog } from "./rules-inspect-dialog"
import { RulesList } from "./rules-list"
import { RulesTemplates } from "./rules-templates"
import { RulesToolbar } from "./rules-toolbar"
import { useCreateRule } from "./use-create-rule"
import { useInspectRule } from "./use-inspect-rule"
import { useRulesList } from "./use-rules-list"

export function RulesSection() {
  const list = useRulesList()
  const create = useCreateRule(list.refresh)
  const inspect = useInspectRule(list.refresh)
  return (
    <div className="flex flex-col gap-5">
      <RulesHeader
        discoveredRules={list.discoveredRules}
        isRefreshing={list.isRefreshing}
        onRefresh={() => void list.refresh()}
        onCreate={() => create.setOpen(true)}
      />
      <RulesDiscovered list={list} inspect={inspect} />
      <RulesTemplates
        copiedId={inspect.copiedId}
        isWriting={create.isWriting}
        onCopy={inspect.copyText}
        onWrite={(preset, kind) => void create.writePreset(preset, kind)}
      />
      <RulesInspectDialog
        rule={inspect.inspectRule}
        copiedId={inspect.copiedId}
        onClose={() => inspect.setInspectRule(null)}
        onCopy={inspect.copyText}
      />
      <BoundCreateDialog create={create} />
    </div>
  )
}

function RulesDiscovered(props: {
  list: ReturnType<typeof useRulesList>
  inspect: ReturnType<typeof useInspectRule>
}) {
  const { list, inspect } = props
  return (
    <section className="flex flex-col gap-3">
      <RulesToolbar
        selectedKind={list.selectedKind}
        onSelectKind={list.setSelectedKind}
        search={list.search}
        onSearch={list.setSearch}
      />
      <RulesList
        discoveredCount={list.discoveredRules.length}
        filteredRules={list.filteredRules}
        onReveal={inspect.reveal}
        onInspect={inspect.setInspectRule}
        onDelete={(rule) => void inspect.remove(rule)}
      />
    </section>
  )
}

function BoundCreateDialog(props: { create: ReturnType<typeof useCreateRule> }) {
  const { create } = props
  return (
    <RulesCreateDialog
      open={create.open}
      onOpenChange={create.setOpen}
      kind={create.kind}
      onKind={create.setKind}
      name={create.name}
      onName={create.setName}
      globs={create.globs}
      onGlobs={create.setGlobs}
      description={create.description}
      onDescription={create.setDescription}
      content={create.content}
      onContent={create.setContent}
      isCreating={create.isCreating}
      onSubmit={() => void create.createRule()}
    />
  )
}
