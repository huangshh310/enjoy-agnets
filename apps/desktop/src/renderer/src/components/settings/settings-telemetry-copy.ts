/**
 * 遥测默认面文案键：不承诺「不上传 / 只存在本机」。
 * TODO(kai): 跟进 PR 用测试钉死 local 零出站后，再决定能不能改口。
 * otel 只说「同时发送到你配置的地址」；端点原文只在开发者档。
 */
export function telemetryFaceKeys(policy: string): {
  collect: "collectDesc" | "collectDescOtel"
  recordDesc: "recordLocalDesc" | "recordLocalDescOtel"
} {
  if (policy === "otel") {
    return { collect: "collectDescOtel", recordDesc: "recordLocalDescOtel" }
  }
  return { collect: "collectDesc", recordDesc: "recordLocalDesc" }
}
