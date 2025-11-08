import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { db } from '../../../database.js';
import { createPromptMessage, schema, validateInput } from '../../utils.js';

// Define schemas for prompt arguments
const getTaskPromptSchema = z.object({
  taskId: z.string().describe('Task ID to get details for'),
});

const getTasksByProjectPromptSchema = z.object({
  projectId: z.string().describe('Project ID to get tasks for'),
});

export function registerTaskPrompts(mcpServer: McpServer): void {
  mcpServer.registerPrompt(
    'get_task_details',
    {
      description: 'Get detailed information about a specific task',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      argsSchema: schema(getTaskPromptSchema),
    },
    async (args: unknown) => {
      const validated = validateInput(getTaskPromptSchema, args);
      const task = db.getTask(validated.taskId);

      if (!task) {
        return createPromptMessage('user', `Task with ID "${validated.taskId}" not found.`);
      }

      const project = db.getProject(task.projectId);
      const assignee = task.assigneeId ? db.getUser(task.assigneeId) : null;
      const tags = task.tags.map(tagId => db.getTag(tagId)).filter(Boolean);

      return createPromptMessage(
        'user',
        `Task Details:
ID: ${task.id}
Title: ${task.title}
Description: ${task.description}
Project: ${project?.name ?? 'Unknown'} (${task.projectId})
Assignee: ${assignee ? `${assignee.name} (${task.assigneeId})` : 'Unassigned'}
Status: ${task.status}
Priority: ${task.priority}
Due Date: ${task.dueDate ? task.dueDate.toISOString() : 'Not set'}
Tags: ${tags.length > 0 ? tags.map(t => t?.name).join(', ') : 'None'}
Created: ${task.createdAt.toISOString()}
Last Updated: ${task.updatedAt.toISOString()}`
      );
    }
  );

  mcpServer.registerPrompt(
    'list_all_tasks',
    {
      description: 'List all tasks in the system with their basic information',
    },
    async () => {
      const tasks = db.getAllTasks();

      if (tasks.length === 0) {
        return createPromptMessage('user', 'No tasks found in the system.');
      }

      const taskList = tasks
        .map(task => {
          const project = db.getProject(task.projectId);
          const assignee = task.assigneeId ? db.getUser(task.assigneeId) : null;
          return `- ${task.title} (${task.status}, ${task.priority}) - Project: ${project?.name ?? 'Unknown'} - Assignee: ${assignee ? assignee.name : 'Unassigned'} - ID: ${task.id}`;
        })
        .join('\n');

      return createPromptMessage('user', `All Tasks (${tasks.length} total):\n\n${taskList}`);
    }
  );

  mcpServer.registerPrompt(
    'get_tasks_by_project',
    {
      description: 'List all tasks for a specific project',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      argsSchema: schema(getTasksByProjectPromptSchema),
    },
    async (args: unknown) => {
      const validated = validateInput(getTasksByProjectPromptSchema, args);
      const tasks = db.getTasksByProject(validated.projectId);
      const project = db.getProject(validated.projectId);

      if (!project) {
        return createPromptMessage('user', `Project with ID "${validated.projectId}" not found.`);
      }

      if (tasks.length === 0) {
        return createPromptMessage('user', `Project "${project.name}" has no tasks.`);
      }

      const taskList = tasks
        .map(task => {
          const assignee = task.assigneeId ? db.getUser(task.assigneeId) : null;
          return `- ${task.title} (${task.status}, ${task.priority}) - Assignee: ${assignee ? assignee.name : 'Unassigned'} - ID: ${task.id}`;
        })
        .join('\n');

      return createPromptMessage(
        'user',
        `Tasks for project "${project.name}" (${tasks.length} total):\n\n${taskList}`
      );
    }
  );
}
