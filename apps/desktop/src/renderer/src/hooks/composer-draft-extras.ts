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
