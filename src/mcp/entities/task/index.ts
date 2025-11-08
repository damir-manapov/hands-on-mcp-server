import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTaskPrompts } from './prompts.js';
import { registerTaskResources } from './resources.js';
import { registerTaskTools } from './tools.js';

export function registerTask(mcpServer: McpServer): void {
  registerTaskTools(mcpServer);
  registerTaskResources(mcpServer);
  registerTaskPrompts(mcpServer);
}
