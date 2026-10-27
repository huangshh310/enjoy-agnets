/**
 * main 入口的第一条 import。模块求值时就装上，早于后面的启动日志。
 */
import { installStdioEpipeGuard } from "./stdio-epipe-guard"

installStdioEpipeGuard()
