/**
 * Composer 草稿附加物：附件 / 引用 / 知识 Chip / 技能。召回与发送闸共用。
 */
import { listComposerAssets } from "./composer-assets"
import { listQuotedContexts } from "./quoted-context"
import { listSessionContextChips } from "./session-context-chips"
import { listComposerSkillChips } from "../components/ai-chat/composer/mentions/composer-skill-chips.ts"

export function composerHasExtras(): boolean {
  return (
    listComposerAssets().length > 0 ||
    listQuotedContexts().length > 0 ||
    listSessionContextChips().length > 0 ||
    listComposerSkillChips().length > 0
  )
}

/** 只算 Chip（引用 / 知识 / 技能），不含附件——附件另按 assetCount 计（leo soft：hasChips 不得把附件算进去）。 */
export function composerHasChips(): boolean {
  return (
    listQuotedContexts().length > 0 ||
    listSessionContextChips().length > 0 ||
    listComposerSkillChips().length > 0
  )
}
