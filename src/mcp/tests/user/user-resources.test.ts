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

  describe('User by ID resource', () => {
    it('should read user by ID when user exists', async () => {
      const testUser = db.createUser({
        name: 'Individual User Test',
        email: 'individual@example.com',
        role: 'admin',
      });

      const registeredResourceTemplates = mcpServer['_registeredResourceTemplates'];
      const resourceTemplate = registeredResourceTemplates['User by ID'];
      expect(resourceTemplate).toBeDefined();

      if (resourceTemplate) {
        const uri = new URL(`user-manager://users/${testUser.id}`);
        const variables = { userId: testUser.id };
        const result = await resourceTemplate.readCallback(uri, variables, {});

        expect(result).toBeDefined();
        expect(result.contents).toBeDefined();
        expect(result.contents.length).toBe(1);
        expect(result.contents[0].uri).toBe(`user-manager://users/${testUser.id}`);
        expect(result.contents[0].mimeType).toBe('application/json');

        const user = JSON.parse(result.contents[0].text);
        expect(user.id).toBe(testUser.id);
        expect(user.name).toBe('Individual User Test');
        expect(user.email).toBe('individual@example.com');
        expect(user.role).toBe('admin');
      }
    });

    it('should return error when user does not exist', async () => {
      const registeredResourceTemplates = mcpServer['_registeredResourceTemplates'];
      const resourceTemplate = registeredResourceTemplates['User by ID'];
      expect(resourceTemplate).toBeDefined();

      if (resourceTemplate) {
        const uri = new URL('user-manager://users/non-existent-id');
        const variables = { userId: 'non-existent-id' };
        const result = await resourceTemplate.readCallback(uri, variables, {});

        expect(result).toBeDefined();
        expect(result.contents).toBeDefined();
        expect(result.contents.length).toBe(1);
        expect(result.contents[0].mimeType).toBe('application/json');

        const error = JSON.parse(result.contents[0].text);
        expect(error.error).toBe('User not found');
      }
    });

    it('should return error when userId is missing', async () => {
      const registeredResourceTemplates = mcpServer['_registeredResourceTemplates'];
      const resourceTemplate = registeredResourceTemplates['User by ID'];
      expect(resourceTemplate).toBeDefined();

      if (resourceTemplate) {
        const uri = new URL('user-manager://users/');
        const variables: { userId?: string } = {};
        const result = await resourceTemplate.readCallback(uri, variables, {});

        expect(result).toBeDefined();
        expect(result.contents).toBeDefined();
        expect(result.contents.length).toBe(1);
        expect(result.contents[0].mimeType).toBe('application/json');

        const error = JSON.parse(result.contents[0].text);
        expect(error.error).toBe('User ID is required');
      }
    });

    it('should list all user resources', async () => {
      const user1 = db.createUser({
        name: 'List User 1',
        email: 'list1@example.com',
        role: 'user',
      });
      const user2 = db.createUser({
        name: 'List User 2',
        email: 'list2@example.com',
        role: 'admin',
      });

      const registeredResourceTemplates = mcpServer['_registeredResourceTemplates'];
      const resourceTemplate = registeredResourceTemplates['User by ID'];
      expect(resourceTemplate).toBeDefined();

      if (resourceTemplate && resourceTemplate.resourceTemplate.listCallback) {
        const result = await resourceTemplate.resourceTemplate.listCallback({}, {});

        expect(result).toBeDefined();
        expect(result.resources).toBeDefined();
        expect(result.resources.length).toBeGreaterThanOrEqual(2);

        const uris = result.resources.map((r: { uri: string }) => r.uri);
        expect(uris).toContain(`user-manager://users/${user1.id}`);
        expect(uris).toContain(`user-manager://users/${user2.id}`);

        const user1Resource = result.resources.find(
          (r: { uri: string }) => r.uri === `user-manager://users/${user1.id}`
        );
        expect(user1Resource).toBeDefined();
        expect(user1Resource.name).toBe('List User 1');
        expect(user1Resource.description).toContain('List User 1');
        expect(user1Resource.description).toContain('list1@example.com');
      }
    });

    it('should provide userId autocomplete', async () => {
      const user1 = db.createUser({
        name: 'Complete User 1',
        email: 'complete1@example.com',
        role: 'user',
      });
      const user2 = db.createUser({
        name: 'Complete User 2',
        email: 'complete2@example.com',
        role: 'admin',
      });

      const registeredResourceTemplates = mcpServer['_registeredResourceTemplates'];
      const resourceTemplate = registeredResourceTemplates['User by ID'];
      expect(resourceTemplate).toBeDefined();

      if (resourceTemplate) {
        const completeCallback = resourceTemplate.resourceTemplate.completeCallback('userId');
        expect(completeCallback).toBeDefined();

        if (completeCallback) {
          const completions = await completeCallback('', {});
          expect(Array.isArray(completions)).toBe(true);
          expect(completions.length).toBeGreaterThanOrEqual(2);
          expect(completions).toContain(user1.id);
          expect(completions).toContain(user2.id);
        }
      }
    });

    it('should return valid JSON structure for existing user', async () => {
      const testUser = db.createUser({
        name: 'Structure Test User',
        email: 'structure@example.com',
        role: 'viewer',
      });

      const registeredResourceTemplates = mcpServer['_registeredResourceTemplates'];
      const resourceTemplate = registeredResourceTemplates['User by ID'];
      expect(resourceTemplate).toBeDefined();

      if (resourceTemplate) {
        const uri = new URL(`user-manager://users/${testUser.id}`);
        const variables = { userId: testUser.id };
        const result = await resourceTemplate.readCallback(uri, variables, {});
        const user = JSON.parse(result.contents[0].text);

        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('name');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('role');
        expect(user).toHaveProperty('createdAt');
        expect(user).toHaveProperty('updatedAt');
        expect(typeof user.id).toBe('string');
        expect(typeof user.name).toBe('string');
        expect(typeof user.email).toBe('string');
        expect(typeof user.role).toBe('string');
      }
    });
  });
});
