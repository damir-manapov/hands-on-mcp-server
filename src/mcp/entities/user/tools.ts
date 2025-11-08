import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { db } from '../../../database.js';
import { createToolConfig, createToolResponse, validateInput } from '../../utils.js';

// Define schemas for validation
const createUserSchema = z.object({
  name: z.string().describe('User full name'),
  email: z.string().describe('User email address'),
  role: z.enum(['admin', 'user', 'viewer']).describe('User role'),
});

const getUserSchema = z.object({
  userId: z.string().describe('User ID'),
});

// Infer TypeScript types from Zod schemas
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type GetUserInput = z.infer<typeof getUserSchema>;

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
      return createToolResponse(JSON.stringify(user, null, 2));
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
        return createToolResponse('User not found', true);
      }
      return createToolResponse(JSON.stringify(user, null, 2));
    }
  );

  mcpServer.registerTool(
    'list_users',
    createToolConfig('List all users in the system'),
    async () => {
      const users = db.getAllUsers();
      return createToolResponse(JSON.stringify(users, null, 2));
    }
  );
}
