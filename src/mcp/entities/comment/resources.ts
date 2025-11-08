import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { db } from '../../../database.js';

export function registerCommentResources(mcpServer: McpServer): void {
  mcpServer.registerResource(
    'All Comments',
    'comment-manager://comments',
    {
      description: 'List of all comments in the system',
      mimeType: 'application/json',
    },
    async () => {
      // Get all comments by iterating through tasks
      const tasks = db.getAllTasks();
      const allComments: Array<{
        id: string;
        taskId: string;
        userId: string;
        content: string;
        createdAt: Date;
        updatedAt: Date;
      }> = [];
      tasks.forEach(task => {
        const comments = db.getCommentsByTask(task.id);
        allComments.push(...comments);
      });
      return {
        contents: [
          {
            uri: 'comment-manager://comments',
            mimeType: 'application/json',
            text: JSON.stringify(allComments, null, 2),
          },
        ],
      };
    }
  );

  mcpServer.registerResource(
    'Comment by ID',
    new ResourceTemplate('comment-manager://comments/{commentId}', {
      list: async () => {
        // Get all comments
        const tasks = db.getAllTasks();
        const allComments: Array<{ id: string; taskId: string; userId: string; content: string }> =
          [];
        tasks.forEach(task => {
          const comments = db.getCommentsByTask(task.id);
          allComments.push(...comments);
        });
        return {
          resources: allComments.map(comment => ({
            uri: `comment-manager://comments/${comment.id}`,
            name: `Comment on task ${comment.taskId}`,
            description: `Comment by user ${comment.userId}: ${comment.content.substring(0, 50)}...`,
            mimeType: 'application/json',
          })),
        };
      },
      complete: {
        commentId: async () => {
          const tasks = db.getAllTasks();
          const allCommentIds: string[] = [];
          tasks.forEach(task => {
            const comments = db.getCommentsByTask(task.id);
            allCommentIds.push(...comments.map(c => c.id));
          });
          return allCommentIds;
        },
      },
    }),
    {
      description: 'Get a specific comment by ID',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const commentId = Array.isArray(variables.commentId)
        ? variables.commentId[0]
        : variables.commentId;
      if (!commentId || typeof commentId !== 'string') {
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify({ error: 'Comment ID is required' }, null, 2),
            },
          ],
        };
      }

      const comment = db.getComment(commentId);
      if (!comment) {
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify({ error: 'Comment not found' }, null, 2),
            },
          ],
        };
      }

      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: 'application/json',
            text: JSON.stringify(comment, null, 2),
          },
        ],
      };
    }
  );
}
