import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { db } from '../../../database.js';
import { createToolConfig, validateInput } from '../../../utils.js';

// Define schemas for validation
const createUserSchema = z.object({
  name: z.string().describe('User full name'),
  email: z.string().describe('User email address'),
  role: z.enum(['admin', 'user', 'viewer']).describe('User role'),
});

const getUserSchema = z.object({
  userId: z.string().describe('User ID'),
});

export function registerUserTools(mcpServer: McpServer): void {
  mcpServer.registerTool(
    'create_user',
    createToolConfig('Create a new user in the system', createUserSchema),
    async (args: unknown) => {
      // Parse and validate - result is type-safe after parsing
      const validated = validateInput(createUserSchema, args);
      const user = db.createUser({
        name: validated.name,
        email: validated.email,
        role: validated.role,
      });
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(user, null, 2),
          },
        ],
      };
    }
  );

  mcpServer.registerTool(
    'get_user',
    createToolConfig('Get user details by ID', getUserSchema),
    async (args: unknown) => {
      // Parse and validate - result is type-safe after parsing
      const validated = validateInput(getUserSchema, args);
      const user = db.getUser(validated.userId);
      if (!user) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'User not found',
            },
          ],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(user, null, 2),
          },
        ],
      };
    }
  );

  mcpServer.registerTool(
    'list_users',
    createToolConfig('List all users in the system', z.object({})),
    async () => {
      const users = db.getAllUsers();
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(users, null, 2),
          },
        ],
      };
    }
  );
}
