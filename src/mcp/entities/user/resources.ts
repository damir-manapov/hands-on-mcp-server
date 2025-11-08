import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
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

  mcpServer.registerResource(
    'User by ID',
    new ResourceTemplate('user-manager://users/{userId}', {
      list: async () => {
        const users = db.getAllUsers();
        return {
          resources: users.map(user => ({
            uri: `user-manager://users/${user.id}`,
            name: user.name,
            description: `User: ${user.name} (${user.email})`,
            mimeType: 'application/json',
          })),
        };
      },
      complete: {
        userId: async () => {
          const users = db.getAllUsers();
          return users.map(user => user.id);
        },
      },
    }),
    {
      description: 'Get a specific user by ID',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const userId = Array.isArray(variables.userId) ? variables.userId[0] : variables.userId;
      if (!userId || typeof userId !== 'string') {
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify({ error: 'User ID is required' }, null, 2),
            },
          ],
        };
      }

      const user = db.getUser(userId);
      if (!user) {
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify({ error: 'User not found' }, null, 2),
            },
          ],
        };
      }

      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: 'application/json',
            text: JSON.stringify(user, null, 2),
          },
        ],
      };
    }
  );
}
