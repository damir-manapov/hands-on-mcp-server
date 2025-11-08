import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAllEntities } from './entities/index.js';

export function createServer(): McpServer {
  const mcpServer = new McpServer(
    {
      name: 'user-manager-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  // Register all entities (tools, resources, prompts)
  registerAllEntities(mcpServer);

  // Error handling
  mcpServer.server.onerror = error => {
    console.error('[MCP Error]', error);
  };

  return mcpServer;
}
