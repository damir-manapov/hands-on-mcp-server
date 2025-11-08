import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { db } from '../../../database.js';

export function registerUserResources(mcpServer: McpServer): void {
  mcpServer.registerResource(
    'All Users',
    'user-manager://users',
    {
      description: 'List of all users in the system',
      mimeType: 'application/json',
    },
    async () => {
      const users = db.getAllUsers();
      return {
        contents: [
          {
            uri: 'user-manager://users',
            mimeType: 'application/json',
            text: JSON.stringify(users, null, 2),
          },
        ],
      };
    }
  );
}
