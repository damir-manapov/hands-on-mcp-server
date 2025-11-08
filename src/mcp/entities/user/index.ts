import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerUserPrompts } from './prompts.js';
import { registerUserResources } from './resources.js';
import { registerUserTools } from './tools.js';

export function registerUser(mcpServer: McpServer): void {
  registerUserTools(mcpServer);
  registerUserResources(mcpServer);
  registerUserPrompts(mcpServer);
}
