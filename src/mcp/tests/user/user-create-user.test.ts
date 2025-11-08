import { describe, it, expect, beforeEach } from 'vitest';
import { createServer } from '../../server.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

describe('create_user tool', () => {
  let mcpServer: McpServer;

  beforeEach(() => {
    mcpServer = createServer();
  });

  it('should create a user via create_user tool', async () => {
    const registeredTools = mcpServer['_registeredTools'];
    const tool = registeredTools['create_user'];
    expect(tool).toBeDefined();

    if (tool) {
      const result = await tool.callback({
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      const userData = JSON.parse(result.content[0].text);
      expect(userData.name).toBe('Test User');
      expect(userData.email).toBe('test@example.com');
      expect(userData.role).toBe('user');
    }
  });
});
