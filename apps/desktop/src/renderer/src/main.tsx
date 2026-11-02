import "@fontsource-variable/inter"
import "@fontsource-variable/jetbrains-mono"
import "./styles/app.css"
import "blobatar/motion.css"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App"
import { installSessionDraftPersistence } from "./lib/session-draft-storage"
import { hydrateFollowupQueueFromMain } from "./hooks/followup-queue"

installSessionDraftPersistence()
hydrateFollowupQueueFromMain()

const gpuFlag = window.enjoyGpuCompositing
if (gpuFlag === "off" || gpuFlag === "on") {
  document.documentElement.setAttribute("data-gpu-compositing", gpuFlag)
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
