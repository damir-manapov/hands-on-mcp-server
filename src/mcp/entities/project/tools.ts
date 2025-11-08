import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { db } from '../../../database.js';
import { createToolConfig, createToolResponse, validateInput } from '../../utils.js';

// Define schemas for validation
const createProjectSchema = z.object({
  name: z.string().describe('Project name'),
  description: z.string().describe('Project description'),
  ownerId: z.string().describe('Owner user ID'),
  status: z.enum(['active', 'archived', 'completed']).describe('Project status'),
});

const getProjectSchema = z.object({
  projectId: z.string().describe('Project ID'),
});

const getProjectsByOwnerSchema = z.object({
  ownerId: z.string().describe('Owner user ID'),
});

const updateProjectSchema = z.object({
  projectId: z.string().describe('Project ID'),
  name: z.string().optional().describe('Project name'),
  description: z.string().optional().describe('Project description'),
  status: z.enum(['active', 'archived', 'completed']).optional().describe('Project status'),
});

const deleteProjectSchema = z.object({
  projectId: z.string().describe('Project ID'),
});

// Infer TypeScript types from Zod schemas
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type GetProjectInput = z.infer<typeof getProjectSchema>;
export type GetProjectsByOwnerInput = z.infer<typeof getProjectsByOwnerSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type DeleteProjectInput = z.infer<typeof deleteProjectSchema>;

export function registerProjectTools(mcpServer: McpServer): void {
  mcpServer.registerTool(
    'create_project',
    createToolConfig('Create a new project', createProjectSchema),
    async (args: unknown) => {
      const validated = validateInput(createProjectSchema, args);
      const project = db.createProject({
        name: validated.name,
        description: validated.description,
        ownerId: validated.ownerId,
        status: validated.status,
      });
      return createToolResponse(JSON.stringify(project, null, 2));
    }
  );

  mcpServer.registerTool(
    'get_project',
    createToolConfig('Get project details by ID', getProjectSchema),
    async (args: unknown) => {
      const validated = validateInput(getProjectSchema, args);
      const project = db.getProject(validated.projectId);
      if (!project) {
        return createToolResponse('Project not found', true);
      }
      return createToolResponse(JSON.stringify(project, null, 2));
    }
  );

  mcpServer.registerTool(
    'list_projects',
    createToolConfig('List all projects in the system', z.object({})),
    async () => {
      const projects = db.getAllProjects();
      return createToolResponse(JSON.stringify(projects, null, 2));
    }
  );

  mcpServer.registerTool(
    'get_projects_by_owner',
    createToolConfig('Get all projects owned by a user', getProjectsByOwnerSchema),
    async (args: unknown) => {
      const validated = validateInput(getProjectsByOwnerSchema, args);
      const projects = db.getProjectsByOwner(validated.ownerId);
      return createToolResponse(JSON.stringify(projects, null, 2));
    }
  );

  mcpServer.registerTool(
    'update_project',
    createToolConfig('Update project details', updateProjectSchema),
    async (args: unknown) => {
      const validated = validateInput(updateProjectSchema, args);
      const { projectId, ...updates } = validated;
      // Filter out undefined values for exactOptionalPropertyTypes
      const filteredUpdates = Object.fromEntries(
        Object.entries(updates).filter(([, value]) => value !== undefined)
      );
      const project = db.updateProject(projectId, filteredUpdates);
      if (!project) {
        return createToolResponse('Project not found', true);
      }
      return createToolResponse(JSON.stringify(project, null, 2));
    }
  );

  mcpServer.registerTool(
    'delete_project',
    createToolConfig('Delete a project', deleteProjectSchema),
    async (args: unknown) => {
      const validated = validateInput(deleteProjectSchema, args);
      const deleted = db.deleteProject(validated.projectId);
      if (!deleted) {
        return createToolResponse('Project not found', true);
      }
      return createToolResponse(JSON.stringify({ success: true, message: 'Project deleted' }, null, 2));
    }
  );
}

