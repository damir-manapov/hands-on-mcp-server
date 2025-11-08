import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { db } from '../../../database.js';

export function registerProjectResources(mcpServer: McpServer): void {
  mcpServer.registerResource(
    'All Projects',
    'project-manager://projects',
    {
      description: 'List of all projects in the system',
      mimeType: 'application/json',
    },
    async () => {
      const projects = db.getAllProjects();
      return {
        contents: [
          {
            uri: 'project-manager://projects',
            mimeType: 'application/json',
            text: JSON.stringify(projects, null, 2),
          },
        ],
      };
    }
  );

  mcpServer.registerResource(
    'Project by ID',
    new ResourceTemplate('project-manager://projects/{projectId}', {
      list: async () => {
        const projects = db.getAllProjects();
        return {
          resources: projects.map(project => ({
            uri: `project-manager://projects/${project.id}`,
            name: project.name,
            description: `Project: ${project.name} (${project.status})`,
            mimeType: 'application/json',
          })),
        };
      },
      complete: {
        projectId: async () => {
          const projects = db.getAllProjects();
          return projects.map(project => project.id);
        },
      },
    }),
    {
      description: 'Get a specific project by ID',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const projectId = Array.isArray(variables.projectId)
        ? variables.projectId[0]
        : variables.projectId;
      if (!projectId || typeof projectId !== 'string') {
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify({ error: 'Project ID is required' }, null, 2),
            },
          ],
        };
      }

      const project = db.getProject(projectId);
      if (!project) {
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify({ error: 'Project not found' }, null, 2),
            },
          ],
        };
      }

      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: 'application/json',
            text: JSON.stringify(project, null, 2),
          },
        ],
      };
    }
  );
}
