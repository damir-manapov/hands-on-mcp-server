import { describe, it, expect, beforeEach } from 'vitest';
import { createServer } from '../../server.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { db } from '../../../database.js';

describe('User Resources', () => {
  let mcpServer: McpServer;

  beforeEach(() => {
    mcpServer = createServer();
    // Clear users before each test
    const allUsers = db.getAllUsers();
    allUsers.forEach(user => {
      db.deleteUser(user.id);
    });
  });

  describe('All Users resource', () => {
    it('should read All Users resource when empty', async () => {
      const registeredResources = mcpServer['_registeredResources'];
      const resource = registeredResources['user-manager://users'];
      expect(resource).toBeDefined();

      if (resource) {
        const result = await resource.readCallback();

        expect(result).toBeDefined();
        expect(result.contents).toBeDefined();
        expect(result.contents.length).toBe(1);
        expect(result.contents[0].uri).toBe('user-manager://users');
        expect(result.contents[0].mimeType).toBe('application/json');

        const users = JSON.parse(result.contents[0].text);
        expect(Array.isArray(users)).toBe(true);
        expect(users.length).toBe(0);
      }
    });

    it('should read All Users resource with users', async () => {
      // Create some users
      const user1 = db.createUser({
        name: 'Resource Test User 1',
        email: 'resource1@example.com',
        role: 'user',
      });
      const user2 = db.createUser({
        name: 'Resource Test User 2',
        email: 'resource2@example.com',
        role: 'admin',
      });

      const registeredResources = mcpServer['_registeredResources'];
      const resource = registeredResources['user-manager://users'];
      expect(resource).toBeDefined();

      if (resource) {
        const result = await resource.readCallback();

        expect(result).toBeDefined();
        expect(result.contents).toBeDefined();
        expect(result.contents.length).toBe(1);
        expect(result.contents[0].uri).toBe('user-manager://users');
        expect(result.contents[0].mimeType).toBe('application/json');

        const users = JSON.parse(result.contents[0].text);
        expect(Array.isArray(users)).toBe(true);
        expect(users.length).toBe(2);

        const userIds = users.map((u: { id: string }) => u.id);
        expect(userIds).toContain(user1.id);
        expect(userIds).toContain(user2.id);

        const user1Data = users.find((u: { id: string }) => u.id === user1.id);
        expect(user1Data.name).toBe('Resource Test User 1');
        expect(user1Data.email).toBe('resource1@example.com');
        expect(user1Data.role).toBe('user');
      }
    });

    it('should return valid JSON structure', async () => {
      db.createUser({
        name: 'JSON Test User',
        email: 'json@example.com',
        role: 'viewer',
      });

      const registeredResources = mcpServer['_registeredResources'];
      const resource = registeredResources['user-manager://users'];
      expect(resource).toBeDefined();

      if (resource) {
        const result = await resource.readCallback();
        const users = JSON.parse(result.contents[0].text);

        expect(Array.isArray(users)).toBe(true);
        if (users.length > 0) {
          const user = users[0];
          expect(user).toHaveProperty('id');
          expect(user).toHaveProperty('name');
          expect(user).toHaveProperty('email');
          expect(user).toHaveProperty('role');
          expect(user).toHaveProperty('createdAt');
          expect(user).toHaveProperty('updatedAt');
        }
      }
    });
  });
});
