import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { db } from '../../../database.js';
import { createPromptMessage, schema, validateInput } from '../../utils.js';

// Define schemas for prompt arguments
const getTagPromptSchema = z.object({
  tagId: z.string().describe('Tag ID to get details for'),
});

export function registerTagPrompts(mcpServer: McpServer): void {
  mcpServer.registerPrompt(
    'get_tag_details',
    {
      description: 'Get detailed information about a specific tag',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      argsSchema: schema(getTagPromptSchema),
    },
    async (args: unknown) => {
      const validated = validateInput(getTagPromptSchema, args);
      const tag = db.getTag(validated.tagId);

      if (!tag) {
        return createPromptMessage('user', `Tag with ID "${validated.tagId}" not found.`);
      }

      const tasks = db.getTasksByTag(validated.tagId);

      return createPromptMessage(
        'user',
        `Tag Details:
ID: ${tag.id}
Name: ${tag.name}
Color: ${tag.color}
Created: ${tag.createdAt.toISOString()}
Used in ${tasks.length} task(s)`
      );
    }
  );

  mcpServer.registerPrompt(
    'list_all_tags',
    {
      description: 'List all tags in the system with their basic information',
    },
    async () => {
      const tags = db.getAllTags();

      if (tags.length === 0) {
        return createPromptMessage('user', 'No tags found in the system.');
      }

      const tagList = tags
        .map(tag => {
          const taskCount = db.getTasksByTag(tag.id).length;
          return `- ${tag.name} (${tag.color}) - Used in ${taskCount} task(s) - ID: ${tag.id}`;
        })
        .join('\n');

      return createPromptMessage('user', `All Tags (${tags.length} total):\n\n${tagList}`);
    }
  );
}
