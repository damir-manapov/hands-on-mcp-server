import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { db } from '../../../database.js';

export function registerTagResources(mcpServer: McpServer): void {
  mcpServer.registerResource(
    'All Tags',
    'tag-manager://tags',
    {
      description: 'List of all tags in the system',
      mimeType: 'application/json',
    },
    async () => {
      const tags = db.getAllTags();
      return {
        contents: [
          {
            uri: 'tag-manager://tags',
            mimeType: 'application/json',
            text: JSON.stringify(tags, null, 2),
          },
        ],
      };
    }
  );

  mcpServer.registerResource(
    'Tag by ID',
    new ResourceTemplate('tag-manager://tags/{tagId}', {
      list: async () => {
        const tags = db.getAllTags();
        return {
          resources: tags.map(tag => ({
            uri: `tag-manager://tags/${tag.id}`,
            name: tag.name,
            description: `Tag: ${tag.name}`,
            mimeType: 'application/json',
          })),
        };
      },
      complete: {
        tagId: async () => {
          const tags = db.getAllTags();
          return tags.map(tag => tag.id);
        },
      },
    }),
    {
      description: 'Get a specific tag by ID',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const tagId = Array.isArray(variables.tagId) ? variables.tagId[0] : variables.tagId;
      if (!tagId || typeof tagId !== 'string') {
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify({ error: 'Tag ID is required' }, null, 2),
            },
          ],
        };
      }

      const tag = db.getTag(tagId);
      if (!tag) {
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify({ error: 'Tag not found' }, null, 2),
            },
          ],
        };
      }

      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: 'application/json',
            text: JSON.stringify(tag, null, 2),
          },
        ],
      };
    }
  );
}
