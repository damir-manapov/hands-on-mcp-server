import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTagPrompts } from './prompts.js';
import { registerTagResources } from './resources.js';
import { registerTagTools } from './tools.js';

export function registerTag(mcpServer: McpServer): void {
  registerTagTools(mcpServer);
  registerTagResources(mcpServer);
  registerTagPrompts(mcpServer);
}
