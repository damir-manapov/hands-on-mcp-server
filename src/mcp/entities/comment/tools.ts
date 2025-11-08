import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { db } from '../../../database.js';
import { createToolConfig, createToolResponse, validateInput } from '../../utils.js';

// Define schemas for validation
const createCommentSchema = z.object({
  taskId: z.string().describe('Task ID'),
  userId: z.string().describe('User ID (comment author)'),
  content: z.string().describe('Comment content'),
});

const getCommentSchema = z.object({
  commentId: z.string().describe('Comment ID'),
});

const getCommentsByTaskSchema = z.object({
  taskId: z.string().describe('Task ID'),
});

const getCommentsByUserSchema = z.object({
  userId: z.string().describe('User ID'),
});

const updateCommentSchema = z.object({
  commentId: z.string().describe('Comment ID'),
  content: z.string().describe('Comment content'),
});

const deleteCommentSchema = z.object({
  commentId: z.string().describe('Comment ID'),
});

// Infer TypeScript types from Zod schemas
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type GetCommentInput = z.infer<typeof getCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type DeleteCommentInput = z.infer<typeof deleteCommentSchema>;

export function registerCommentTools(mcpServer: McpServer): void {
  mcpServer.registerTool(
    'create_comment',
    createToolConfig('Create a new comment on a task', createCommentSchema),
    async (args: unknown) => {
      const validated = validateInput(createCommentSchema, args);
      const comment = db.createComment({
        taskId: validated.taskId,
        userId: validated.userId,
        content: validated.content,
      });
      return createToolResponse(JSON.stringify(comment, null, 2));
    }
  );

  mcpServer.registerTool(
    'get_comment',
    createToolConfig('Get comment details by ID', getCommentSchema),
    async (args: unknown) => {
      const validated = validateInput(getCommentSchema, args);
      const comment = db.getComment(validated.commentId);
      if (!comment) {
        return createToolResponse('Comment not found', true);
      }
      return createToolResponse(JSON.stringify(comment, null, 2));
    }
  );

  mcpServer.registerTool(
    'get_comments_by_task',
    createToolConfig('Get all comments for a task', getCommentsByTaskSchema),
    async (args: unknown) => {
      const validated = validateInput(getCommentsByTaskSchema, args);
      const comments = db.getCommentsByTask(validated.taskId);
      return createToolResponse(JSON.stringify(comments, null, 2));
    }
  );

  mcpServer.registerTool(
    'get_comments_by_user',
    createToolConfig('Get all comments by a user', getCommentsByUserSchema),
    async (args: unknown) => {
      const validated = validateInput(getCommentsByUserSchema, args);
      const comments = db.getCommentsByUser(validated.userId);
      return createToolResponse(JSON.stringify(comments, null, 2));
    }
  );

  mcpServer.registerTool(
    'update_comment',
    createToolConfig('Update comment content', updateCommentSchema),
    async (args: unknown) => {
      const validated = validateInput(updateCommentSchema, args);
      const { commentId, ...updates } = validated;
      const comment = db.updateComment(commentId, updates);
      if (!comment) {
        return createToolResponse('Comment not found', true);
      }
      return createToolResponse(JSON.stringify(comment, null, 2));
    }
  );

  mcpServer.registerTool(
    'delete_comment',
    createToolConfig('Delete a comment', deleteCommentSchema),
    async (args: unknown) => {
      const validated = validateInput(deleteCommentSchema, args);
      const deleted = db.deleteComment(validated.commentId);
      if (!deleted) {
        return createToolResponse('Comment not found', true);
      }
      return createToolResponse(
        JSON.stringify({ success: true, message: 'Comment deleted' }, null, 2)
      );
    }
  );
}
