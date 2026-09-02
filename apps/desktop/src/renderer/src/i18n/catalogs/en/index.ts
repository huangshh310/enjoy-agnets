/**
 * 英文文案总表，结构必须与中文 Messages 对齐。
 */
import type { Messages } from "../zh/index.ts"
import { enChat } from "./chat.ts"
import { enCommand } from "./command.ts"
import { enCommon } from "./common.ts"
import { enNav } from "./nav.ts"
import { enPages } from "./pages.ts"
import { enSettings } from "./settings.ts"
import { enStudio } from "./studio.ts"

export const en: Messages = {
  common: enCommon,
  nav: enNav,
  command: enCommand,
  settings: enSettings,
  chat: enChat,
  studio: enStudio,
  pages: enPages
}
