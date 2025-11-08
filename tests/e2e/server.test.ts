import { describe, it, expect, beforeEach } from 'vitest';
import { createServer } from '../../src/mcp/server.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

describe('MCP Server', () => {
  let mcpServer: McpServer;

  beforeEach(() => {
    mcpServer = createServer();
  });

  describe('Server Creation', () => {
    it('should create a server instance', () => {
      expect(mcpServer).toBeDefined();
      expect(mcpServer.server).toBeDefined();
    });

    it('should have registered tools', () => {
      const registeredTools = mcpServer['_registeredTools'];
      expect(registeredTools).toBeDefined();
      expect(typeof registeredTools).toBe('object');
      // Verify tools are registered by checking internal structure
      expect(Object.keys(registeredTools).length).toBeGreaterThan(0);
    });

    it('should have registered resources', () => {
      const registeredResources = mcpServer['_registeredResources'];
      expect(registeredResources).toBeDefined();
      expect(typeof registeredResources).toBe('object');
      // Verify resources are registered by checking internal structure
      expect(Object.keys(registeredResources).length).toBeGreaterThan(0);
    });

    it('should have registered prompts', () => {
      const registeredPrompts = mcpServer['_registeredPrompts'];
      expect(registeredPrompts).toBeDefined();
      expect(typeof registeredPrompts).toBe('object');
      // Verify prompts are registered by checking internal structure
      expect(Object.keys(registeredPrompts).length).toBeGreaterThan(0);
    });
  });
});
