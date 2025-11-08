import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerUser } from './user/index.js';

export function registerAllEntities(mcpServer: McpServer): void {
  registerUser(mcpServer);
  // Add more entities here as they are created
  // registerProject(mcpServer);
  // registerTask(mcpServer);
}
