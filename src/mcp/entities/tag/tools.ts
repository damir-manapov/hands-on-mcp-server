import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { db } from '../../../database.js';
import { createToolConfig, createToolResponse, validateInput } from '../../utils.js';

// Define schemas for validation
const createTagSchema = z.object({
  name: z.string().describe('Tag name'),
  color: z.string().describe('Tag color (hex code)'),
});

const getTagSchema = z.object({
  tagId: z.string().describe('Tag ID'),
});

const updateTagSchema = z.object({
  tagId: z.string().describe('Tag ID'),
  name: z.string().optional().describe('Tag name'),
  color: z.string().optional().describe('Tag color (hex code)'),
});

const deleteTagSchema = z.object({
  tagId: z.string().describe('Tag ID'),
});

// Infer TypeScript types from Zod schemas
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type GetTagInput = z.infer<typeof getTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
export type DeleteTagInput = z.infer<typeof deleteTagSchema>;

export function registerTagTools(mcpServer: McpServer): void {
  mcpServer.registerTool(
    'create_tag',
    createToolConfig('Create a new tag', createTagSchema),
    async (args: unknown) => {
      const validated = validateInput(createTagSchema, args);
      const tag = db.createTag({
        name: validated.name,
        color: validated.color,
      });
      return createToolResponse(JSON.stringify(tag, null, 2));
    }
  );

  mcpServer.registerTool(
    'get_tag',
    createToolConfig('Get tag details by ID', getTagSchema),
    async (args: unknown) => {
      const validated = validateInput(getTagSchema, args);
      const tag = db.getTag(validated.tagId);
      if (!tag) {
        return createToolResponse('Tag not found', true);
      }
      return createToolResponse(JSON.stringify(tag, null, 2));
    }
  );

  mcpServer.registerTool('list_tags', createToolConfig('List all tags in the system'), async () => {
    const tags = db.getAllTags();
    return createToolResponse(JSON.stringify(tags, null, 2));
  });

  mcpServer.registerTool(
    'update_tag',
    createToolConfig('Update tag details', updateTagSchema),
    async (args: unknown) => {
      const validated = validateInput(updateTagSchema, args);
      const { tagId, ...updates } = validated;
      // Filter out undefined values for exactOptionalPropertyTypes
      const filteredUpdates = Object.fromEntries(
        Object.entries(updates).filter(([, value]) => value !== undefined)
      );
      const tag = db.updateTag(tagId, filteredUpdates);
      if (!tag) {
        return createToolResponse('Tag not found', true);
      }
      return createToolResponse(JSON.stringify(tag, null, 2));
    }
  );

  mcpServer.registerTool(
    'delete_tag',
    createToolConfig('Delete a tag', deleteTagSchema),
    async (args: unknown) => {
      const validated = validateInput(deleteTagSchema, args);
      const tag = db.getTag(validated.tagId);

      if (!tag) {
        return createToolResponse('Tag not found', true);
      }

      // Request user confirmation before deleting
      const result = await mcpServer.server.elicitInput({
        message: `Are you sure you want to delete the tag "${tag.name}" (ID: ${tag.id})? This action cannot be undone.`,
        requestedSchema: {
          type: 'object',
          properties: {
            confirm: {
              type: 'boolean',
              title: 'Confirm deletion',
              description: 'Check this box to confirm you want to delete this tag',
            },
          },
          required: ['confirm'],
        },
      });

      // Handle user response
      if (result.action === 'accept' && result.content?.confirm === true) {
        const deleted = db.deleteTag(validated.tagId);
        if (!deleted) {
          return createToolResponse('Tag deletion failed', true);
        }
        return createToolResponse(
          JSON.stringify(
            { success: true, message: `Tag "${tag.name}" deleted successfully` },
            null,
            2
          )
        );
      }

      // User declined or cancelled the deletion
      const message =
        result.action === 'decline' ? 'Tag deletion declined by user' : 'Tag deletion cancelled';

      return createToolResponse(JSON.stringify({ success: false, message }, null, 2));
    }
  );
}
