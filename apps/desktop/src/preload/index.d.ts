import type { EnjoyIdeApi } from "./index";

declare global {
  interface Window {
    ide: EnjoyIdeApi;
    enjoyGpuCompositing?: "on" | "off";
    enjoyE2eSendWatchdog?: boolean;
  }
}

export {};
