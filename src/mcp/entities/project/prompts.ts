import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { db } from '../../../database.js';
import { createPromptMessage, schema, validateInput } from '../../utils.js';

// Define schemas for prompt arguments
const getProjectPromptSchema = z.object({
  projectId: z.string().describe('Project ID to get details for'),
});

const getProjectsByOwnerPromptSchema = z.object({
  ownerId: z.string().describe('Owner user ID to get projects for'),
});

export function registerProjectPrompts(mcpServer: McpServer): void {
  mcpServer.registerPrompt(
    'get_project_details',
    {
      description: 'Get detailed information about a specific project',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      argsSchema: schema(getProjectPromptSchema),
    },
    async (args: unknown) => {
      const validated = validateInput(getProjectPromptSchema, args);
      const project = db.getProject(validated.projectId);

      if (!project) {
        return createPromptMessage('user', `Project with ID "${validated.projectId}" not found.`);
      }

      const owner = db.getUser(project.ownerId);
      const ownerName = owner ? owner.name : 'Unknown';

      return createPromptMessage(
        'user',
        `Project Details:
ID: ${project.id}
Name: ${project.name}
Description: ${project.description}
Status: ${project.status}
Owner: ${ownerName} (${project.ownerId})
Created: ${project.createdAt.toISOString()}
Last Updated: ${project.updatedAt.toISOString()}`
      );
    }
  );

  mcpServer.registerPrompt(
    'list_all_projects',
    {
      description: 'List all projects in the system with their basic information',
    },
    async () => {
      const projects = db.getAllProjects();

      if (projects.length === 0) {
        return createPromptMessage('user', 'No projects found in the system.');
      }

      const projectList = projects
        .map(project => {
          const owner = db.getUser(project.ownerId);
          const ownerName = owner ? owner.name : 'Unknown';
          return `- ${project.name} (${project.status}) - Owner: ${ownerName} - ID: ${project.id}`;
        })
        .join('\n');

      return createPromptMessage(
        'user',
        `All Projects (${projects.length} total):\n\n${projectList}`
      );
    }
  );

  mcpServer.registerPrompt(
    'get_projects_by_owner',
    {
      description: 'List all projects owned by a specific user',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      argsSchema: schema(getProjectsByOwnerPromptSchema),
    },
    async (args: unknown) => {
      const validated = validateInput(getProjectsByOwnerPromptSchema, args);
      const projects = db.getProjectsByOwner(validated.ownerId);
      const owner = db.getUser(validated.ownerId);

      if (!owner) {
        return createPromptMessage('user', `User with ID "${validated.ownerId}" not found.`);
      }

      if (projects.length === 0) {
        return createPromptMessage('user', `${owner.name} has no projects.`);
      }

      const projectList = projects
        .map(project => `- ${project.name} (${project.status}) - ID: ${project.id}`)
        .join('\n');

      return createPromptMessage(
        'user',
        `Projects owned by ${owner.name} (${projects.length} total):\n\n${projectList}`
      );
    }
  );
}
