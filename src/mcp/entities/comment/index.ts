import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerCommentPrompts } from './prompts.js';
import { registerCommentResources } from './resources.js';
import { registerCommentTools } from './tools.js';

export function registerComment(mcpServer: McpServer): void {
  registerCommentTools(mcpServer);
  registerCommentResources(mcpServer);
  registerCommentPrompts(mcpServer);
}
