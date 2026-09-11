/**
 * 本机记录视图常量。桶分段与 catalog 顺序只在这里写一次。
 */
export const CLI_USAGE_BUCKET_TABS = ["days", "models", "projects"] as const
export type CliUsageBucketTab = (typeof CLI_USAGE_BUCKET_TABS)[number]
