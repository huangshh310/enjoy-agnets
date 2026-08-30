import type { EnjoyIdeApi } from "./index";

declare global {
  interface Window {
    ide: EnjoyIdeApi;
  }
}

export {};
