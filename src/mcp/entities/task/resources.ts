import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { db } from '../../../database.js';

export function registerTaskResources(mcpServer: McpServer): void {
  mcpServer.registerResource(
    'All Tasks',
    'task-manager://tasks',
    {
      description: 'List of all tasks in the system',
      mimeType: 'application/json',
    },
    async () => {
      const tasks = db.getAllTasks();
      return {
        contents: [
          {
            uri: 'task-manager://tasks',
            mimeType: 'application/json',
            text: JSON.stringify(tasks, null, 2),
          },
        ],
      };
    }
  );

  mcpServer.registerResource(
    'Task by ID',
    new ResourceTemplate('task-manager://tasks/{taskId}', {
      list: async () => {
        const tasks = db.getAllTasks();
        return {
          resources: tasks.map(task => ({
            uri: `task-manager://tasks/${task.id}`,
            name: task.title,
            description: `Task: ${task.title} (${task.status})`,
            mimeType: 'application/json',
          })),
        };
      },
      complete: {
        taskId: async () => {
          const tasks = db.getAllTasks();
          return tasks.map(task => task.id);
        },
      },
    }),
    {
      description: 'Get a specific task by ID',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const taskId = Array.isArray(variables.taskId) ? variables.taskId[0] : variables.taskId;
      if (!taskId || typeof taskId !== 'string') {
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify({ error: 'Task ID is required' }, null, 2),
            },
          ],
        };
      }

      const task = db.getTask(taskId);
      if (!task) {
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify({ error: 'Task not found' }, null, 2),
            },
          ],
        };
      }

      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: 'application/json',
            text: JSON.stringify(task, null, 2),
          },
        ],
      };
    }
  );
}
