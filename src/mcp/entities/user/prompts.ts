import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { db } from '../../../database.js';
import { createPromptMessage, schema, validateInput } from '../../utils.js';

// Define schemas for prompt arguments
const getUserPromptSchema = z.object({
  userId: z.string().describe('User ID to get details for'),
});

export function registerUserPrompts(mcpServer: McpServer): void {
  mcpServer.registerPrompt(
    'get_user_details',
    {
      description: 'Get detailed information about a specific user',
      // The schema() helper uses 'any' for MCP SDK compatibility
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      argsSchema: schema(getUserPromptSchema),
    },
    async (args: unknown) => {
      // Parse and validate - result is type-safe after parsing
      const validated = validateInput(getUserPromptSchema, args);
      const user = db.getUser(validated.userId);

      if (!user) {
        return createPromptMessage('user', `User with ID "${validated.userId}" not found.`);
      }

      return createPromptMessage(
        'user',
        `User Details:
ID: ${user.id}
Name: ${user.name}
Email: ${user.email}
Role: ${user.role}
Created: ${user.createdAt.toISOString()}
Last Updated: ${user.updatedAt.toISOString()}`
      );
    }
  );

  mcpServer.registerPrompt(
    'list_all_users',
    {
      description: 'List all users in the system with their basic information',
    },
    async () => {
      const users = db.getAllUsers();

      if (users.length === 0) {
        return createPromptMessage('user', 'No users found in the system.');
      }

      const userList = users
        .map(user => `- ${user.name} (${user.email}) - Role: ${user.role} - ID: ${user.id}`)
        .join('\n');

      return createPromptMessage('user', `All Users (${users.length} total):\n\n${userList}`);
    }
  );
}
