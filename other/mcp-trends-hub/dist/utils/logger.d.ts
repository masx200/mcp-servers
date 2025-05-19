import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
declare class Logger {
    private get logPath();
    private mcpServer;
    setMcpServer(mcpServer: McpServer): void;
    log(level: Parameters<McpServer['server']['sendLoggingMessage']>[0]['level'], data: unknown): void;
    info(data: unknown): void;
    error(data: unknown): void;
    warn(data: unknown): void;
    debug(data: unknown): void;
}
export declare const logger: Logger;
export {};
