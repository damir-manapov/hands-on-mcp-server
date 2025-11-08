import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerProjectPrompts } from './prompts.js';
import { registerProjectResources } from './resources.js';
import { registerProjectTools } from './tools.js';

export function registerProject(mcpServer: McpServer): void {
  registerProjectTools(mcpServer);
  registerProjectResources(mcpServer);
  registerProjectPrompts(mcpServer);
}
