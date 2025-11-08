import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../../src/database.js';
import type { Tag } from '../../../src/types.js';
import {
  extractToolResult,
  parseToolResultText,
  PersistentServer,
  withServer,
} from '../helpers/inspector-cli.js';

describe('Tag Tools', () => {
  beforeEach(() => {
    // Clear tags before each test
    const allTags = db.getAllTags();
    allTags.forEach(tag => {
      db.deleteTag(tag.id);
    });
  });

  describe('create_tag', () => {
    it('should create a tag successfully', async () => {
      await withServer(async server => {
        const result = await server.callTool('create_tag', {
          name: 'Important',
          color: '#FF0000',
        });

        const toolResult = extractToolResult(result);
        const tagData = parseToolResultText<Tag>(toolResult);
        expect(tagData.name).toBe('Important');
        expect(tagData.color).toBe('#FF0000');
        expect(tagData.id).toBeDefined();
        expect(tagData.createdAt).toBeDefined();
      });
    });
  });

  describe('delete_tag with elicitation', () => {
    it('should delete tag when user confirms', async () => {
      await withServer(async server => {
        // Create a tag first
        const createResult = await server.callTool('create_tag', {
          name: 'Test Tag',
          color: '#00FF00',
        });
        const createToolResult = extractToolResult(createResult);
        const tagData = parseToolResultText<Tag>(createToolResult);

        // Delete the tag with confirmation
        // Start the delete operation (it will pause for elicitation)
        const deletePromise = server.callTool('delete_tag', {
          tagId: tagData.id,
        });

        // Wait for the elicitation request from the server
        const elicitationId = await server.waitForElicitation(2000);
        expect(elicitationId).not.toBeNull();

        // Respond to the elicitation with confirmation
        if (elicitationId !== null) {
          await server.respondToElicitation(elicitationId, {
            action: 'accept',
            content: { confirm: true },
          });
        }

        // Wait for the delete operation to complete
        const deleteResult = await deletePromise;
        const deleteToolResult = extractToolResult(deleteResult);
        const deleteData = parseToolResultText<{ success: boolean; message: string }>(
          deleteToolResult
        );

        expect(deleteData.success).toBe(true);
        expect(deleteData.message).toContain('deleted successfully');

        // Verify tag is actually deleted
        const getResult = await server.callTool('get_tag', { tagId: tagData.id });
        const getToolResult = extractToolResult(getResult);
        expect(getToolResult.isError).toBe(true);
      });
    });

    it('should not delete tag when user declines', async () => {
      await withServer(async server => {
        // Create a tag first
        const createResult = await server.callTool('create_tag', {
          name: 'Test Tag',
          color: '#00FF00',
        });
        const createToolResult = extractToolResult(createResult);
        const tagData = parseToolResultText<Tag>(createToolResult);

        // Delete the tag with confirmation
        const deletePromise = server.callTool('delete_tag', {
          tagId: tagData.id,
        });

        // Wait for the elicitation request from the server
        const elicitationId = await server.waitForElicitation(2000);
        expect(elicitationId).not.toBeNull();

        // Respond with decline
        if (elicitationId !== null) {
          await server.respondToElicitation(elicitationId, {
            action: 'decline',
          });
        }

        // Wait for the delete operation to complete
        const deleteResult = await deletePromise;
        const deleteToolResult = extractToolResult(deleteResult);
        const deleteData = parseToolResultText<{ success: boolean; message: string }>(
          deleteToolResult
        );

        expect(deleteData.success).toBe(false);
        expect(deleteData.message).toContain('declined');

        // Verify tag still exists
        const getResult = await server.callTool('get_tag', { tagId: tagData.id });
        const getToolResult = extractToolResult(getResult);
        expect(getToolResult.isError).toBeFalsy();
        const existingTag = parseToolResultText<Tag>(getToolResult);
        expect(existingTag.id).toBe(tagData.id);
      });
    });
  });
});

