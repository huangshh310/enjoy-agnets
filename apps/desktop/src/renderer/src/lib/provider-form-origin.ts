/**
 * 添加密钥表单从哪来，取消 / 保存回到原处，不要停在设置页。
 */
import { CHAT_CONNECT_FROM, SETUP_GUIDE_FROM } from "../components/setup-guide/open-provider-form"

export { CHAT_CONNECT_FROM, SETUP_GUIDE_FROM }

export function isTransientProviderOrigin(from: string | undefined): boolean {
  return from === SETUP_GUIDE_FROM || from === CHAT_CONNECT_FROM
}
