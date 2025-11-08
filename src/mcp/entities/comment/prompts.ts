import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { db } from '../../../database.js';
import { createPromptMessage, schema, validateInput } from '../../utils.js';

// Define schemas for prompt arguments
const getCommentPromptSchema = z.object({
  commentId: z.string().describe('Comment ID to get details for'),
});

const getCommentsByTaskPromptSchema = z.object({
  taskId: z.string().describe('Task ID to get comments for'),
});

export function registerCommentPrompts(mcpServer: McpServer): void {
  mcpServer.registerPrompt(
    'get_comment_details',
    {
      description: 'Get detailed information about a specific comment',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      argsSchema: schema(getCommentPromptSchema),
    },
    async (args: unknown) => {
      const validated = validateInput(getCommentPromptSchema, args);
      const comment = db.getComment(validated.commentId);

      if (!comment) {
        return createPromptMessage('user', `Comment with ID "${validated.commentId}" not found.`);
      }

      const task = db.getTask(comment.taskId);
      const user = db.getUser(comment.userId);

      return createPromptMessage(
        'user',
        `Comment Details:
ID: ${comment.id}
Content: ${comment.content}
Task: ${task?.title ?? 'Unknown'} (${comment.taskId})
Author: ${user?.name ?? 'Unknown'} (${comment.userId})
Created: ${comment.createdAt.toISOString()}
Last Updated: ${comment.updatedAt.toISOString()}`
      );
    }
  );

  mcpServer.registerPrompt(
    'get_comments_by_task',
    {
      description: 'List all comments for a specific task',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      argsSchema: schema(getCommentsByTaskPromptSchema),
    },
    async (args: unknown) => {
      const validated = validateInput(getCommentsByTaskPromptSchema, args);
      const comments = db.getCommentsByTask(validated.taskId);
      const task = db.getTask(validated.taskId);

      if (!task) {
        return createPromptMessage('user', `Task with ID "${validated.taskId}" not found.`);
      }

      if (comments.length === 0) {
        return createPromptMessage('user', `Task "${task.title}" has no comments.`);
      }

      const commentList = comments
        .map(comment => {
          const user = db.getUser(comment.userId);
          return `- ${user?.name ?? 'Unknown'}: ${comment.content} (${comment.createdAt.toISOString()})`;
        })
        .join('\n');

      return createPromptMessage(
        'user',
        `Comments for task "${task.title}" (${comments.length} total):\n\n${commentList}`
      );
    }
  );
}
