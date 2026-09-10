/**
 * ACP available_commands：进 ⌘L，不进 Composer 斜杠条。
 */
import { create } from "zustand"

export type AcpCommand = {
  name: string
  description?: string
}

type AcpCommandStore = {
  commands: AcpCommand[]
  setCommands: (commands: AcpCommand[]) => void
}

export const useAcpCommands = create<AcpCommandStore>((set) => ({
  commands: [],
  setCommands: (commands) => set({ commands })
}))
