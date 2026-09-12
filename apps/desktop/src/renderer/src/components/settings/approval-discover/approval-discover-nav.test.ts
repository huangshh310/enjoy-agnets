/**
 * 跳转不变量：只去通用权限卡，改完回智能体，不新开路由。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  agentReturnSearch,
  approvalDiscoverSearch,
  APPROVAL_PERMISSIONS_ANCHOR,
  parseApprovalDiscoverFrom
} from "./approval-discover-nav.ts"

test("from 只认本机 CLI / 默认项，其它丢掉", () => {
  assert.equal(parseApprovalDiscoverFrom("agent"), "racks")
  assert.equal(parseApprovalDiscoverFrom("agent-defaults"), "defaults")
  assert.equal(parseApprovalDiscoverFrom("team"), null)
  assert.equal(parseApprovalDiscoverFrom(undefined), null)
})

test("主链落到 general，并记住来源", () => {
  assert.deepEqual(approvalDiscoverSearch("racks"), {
    from: "agent",
    tab: undefined,
    tool: undefined
  })
  assert.deepEqual(approvalDiscoverSearch("defaults"), {
    from: "agent-defaults",
    tab: undefined,
    tool: undefined
  })
})

test("返回智能体对应分段，清掉 from", () => {
  assert.deepEqual(agentReturnSearch("racks"), {
    tab: undefined,
    tool: undefined,
    from: undefined
  })
  assert.deepEqual(agentReturnSearch("defaults"), {
    tab: "defaults",
    tool: undefined,
    from: undefined
  })
})

test("落点锚点是已有权限卡，不是新路由", () => {
  assert.equal(APPROVAL_PERMISSIONS_ANCHOR, "settings-permissions")
})
