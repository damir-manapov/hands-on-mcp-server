import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerComment } from './comment/index.js';
import { registerProject } from './project/index.js';
import { registerTag } from './tag/index.js';
import { registerTask } from './task/index.js';
import { registerUser } from './user/index.js';

export function registerAllEntities(mcpServer: McpServer): void {
  registerUser(mcpServer);
  registerProject(mcpServer);
  registerTask(mcpServer);
  registerTag(mcpServer);
  registerComment(mcpServer);
}
