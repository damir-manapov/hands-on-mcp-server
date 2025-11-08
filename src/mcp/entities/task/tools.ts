import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { db } from '../../../database.js';
import { createToolConfig, createToolResponse, validateInput } from '../../utils.js';

// Define schemas for validation
const createTaskSchema = z.object({
  title: z.string().describe('Task title'),
  description: z.string().describe('Task description'),
  projectId: z.string().describe('Project ID'),
  assigneeId: z.string().nullable().optional().describe('Assignee user ID (optional)'),
  status: z.enum(['todo', 'in-progress', 'review', 'done']).describe('Task status'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).describe('Task priority'),
  dueDate: z.string().nullable().optional().describe('Due date (ISO string, optional)'),
  tags: z.array(z.string()).optional().describe('Tag IDs'),
});

const getTaskSchema = z.object({
  taskId: z.string().describe('Task ID'),
});

const getTasksByProjectSchema = z.object({
  projectId: z.string().describe('Project ID'),
});

const getTasksByAssigneeSchema = z.object({
  assigneeId: z.string().describe('Assignee user ID'),
});

const getTasksByStatusSchema = z.object({
  status: z.enum(['todo', 'in-progress', 'review', 'done']).describe('Task status'),
});

const getTasksByTagSchema = z.object({
  tagId: z.string().describe('Tag ID'),
});

const updateTaskSchema = z.object({
  taskId: z.string().describe('Task ID'),
  title: z.string().optional().describe('Task title'),
  description: z.string().optional().describe('Task description'),
  assigneeId: z.string().nullable().optional().describe('Assignee user ID'),
  status: z.enum(['todo', 'in-progress', 'review', 'done']).optional().describe('Task status'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().describe('Task priority'),
  dueDate: z.string().nullable().optional().describe('Due date (ISO string)'),
  tags: z.array(z.string()).optional().describe('Tag IDs'),
});

const deleteTaskSchema = z.object({
  taskId: z.string().describe('Task ID'),
});

const searchTasksSchema = z.object({
  query: z.string().describe('Search query'),
});

// Infer TypeScript types from Zod schemas
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type GetTaskInput = z.infer<typeof getTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type DeleteTaskInput = z.infer<typeof deleteTaskSchema>;

export function registerTaskTools(mcpServer: McpServer): void {
  mcpServer.registerTool(
    'create_task',
    createToolConfig('Create a new task', createTaskSchema),
    async (args: unknown) => {
      const validated = validateInput(createTaskSchema, args);
      const task = db.createTask({
        title: validated.title,
        description: validated.description,
        projectId: validated.projectId,
        assigneeId: validated.assigneeId ?? null,
        status: validated.status,
        priority: validated.priority,
        dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
        tags: validated.tags ?? [],
      });
      return createToolResponse(JSON.stringify(task, null, 2));
    }
  );

  mcpServer.registerTool(
    'get_task',
    createToolConfig('Get task details by ID', getTaskSchema),
    async (args: unknown) => {
      const validated = validateInput(getTaskSchema, args);
      const task = db.getTask(validated.taskId);
      if (!task) {
        return createToolResponse('Task not found', true);
      }
      return createToolResponse(JSON.stringify(task, null, 2));
    }
  );

  mcpServer.registerTool(
    'list_tasks',
    createToolConfig('List all tasks in the system'),
    async () => {
      const tasks = db.getAllTasks();
      return createToolResponse(JSON.stringify(tasks, null, 2));
    }
  );

  mcpServer.registerTool(
    'get_tasks_by_project',
    createToolConfig('Get all tasks for a project', getTasksByProjectSchema),
    async (args: unknown) => {
      const validated = validateInput(getTasksByProjectSchema, args);
      const tasks = db.getTasksByProject(validated.projectId);
      return createToolResponse(JSON.stringify(tasks, null, 2));
    }
  );

  mcpServer.registerTool(
    'get_tasks_by_assignee',
    createToolConfig('Get all tasks assigned to a user', getTasksByAssigneeSchema),
    async (args: unknown) => {
      const validated = validateInput(getTasksByAssigneeSchema, args);
      const tasks = db.getTasksByAssignee(validated.assigneeId);
      return createToolResponse(JSON.stringify(tasks, null, 2));
    }
  );

  mcpServer.registerTool(
    'get_tasks_by_status',
    createToolConfig('Get all tasks with a specific status', getTasksByStatusSchema),
    async (args: unknown) => {
      const validated = validateInput(getTasksByStatusSchema, args);
      const tasks = db.getTasksByStatus(validated.status);
      return createToolResponse(JSON.stringify(tasks, null, 2));
    }
  );

  mcpServer.registerTool(
    'get_tasks_by_tag',
    createToolConfig('Get all tasks with a specific tag', getTasksByTagSchema),
    async (args: unknown) => {
      const validated = validateInput(getTasksByTagSchema, args);
      const tasks = db.getTasksByTag(validated.tagId);
      return createToolResponse(JSON.stringify(tasks, null, 2));
    }
  );

  mcpServer.registerTool(
    'update_task',
    createToolConfig('Update task details', updateTaskSchema),
    async (args: unknown) => {
      const validated = validateInput(updateTaskSchema, args);
      const { taskId, dueDate, ...updates } = validated;
      // Filter out undefined values for exactOptionalPropertyTypes
      const filteredUpdates: Partial<{
        title: string;
        description: string;
        assigneeId: string | null;
        status: 'todo' | 'in-progress' | 'review' | 'done';
        priority: 'low' | 'medium' | 'high' | 'urgent';
        dueDate: Date | null;
        tags: string[];
      }> = Object.fromEntries(Object.entries(updates).filter(([, value]) => value !== undefined));
      if (dueDate !== undefined) {
        filteredUpdates.dueDate = dueDate ? new Date(dueDate) : null;
      }
      const task = db.updateTask(taskId, filteredUpdates);
      if (!task) {
        return createToolResponse('Task not found', true);
      }
      return createToolResponse(JSON.stringify(task, null, 2));
    }
  );

  mcpServer.registerTool(
    'delete_task',
    createToolConfig('Delete a task', deleteTaskSchema),
    async (args: unknown) => {
      const validated = validateInput(deleteTaskSchema, args);
      const deleted = db.deleteTask(validated.taskId);
      if (!deleted) {
        return createToolResponse('Task not found', true);
      }
      return createToolResponse(
        JSON.stringify({ success: true, message: 'Task deleted' }, null, 2)
      );
    }
  );

  mcpServer.registerTool(
    'search_tasks',
    createToolConfig('Search tasks by title or description', searchTasksSchema),
    async (args: unknown) => {
      const validated = validateInput(searchTasksSchema, args);
      const tasks = db.searchTasks(validated.query);
      return createToolResponse(JSON.stringify(tasks, null, 2));
    }
  );
}
