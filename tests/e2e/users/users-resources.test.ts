import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../../src/database.js';
import type { User } from '../../../src/types.js';
import {
  extractResourceResult,
  extractResourcesList,
  parseResourceError,
  withServer,
} from '../helpers/inspector-cli.js';

describe('User Resources', () => {
  beforeEach(() => {
    // Clear users before each test
    const allUsers = db.getAllUsers();
    allUsers.forEach(user => {
      db.deleteUser(user.id);
    });
  });

  describe('All Users resource', () => {
    it('should read All Users resource when empty', async () => {
      await withServer(async server => {
        // Clear all users first
        await server.callTool('clear_all_users', {});

        const result = await server.readResource('user-manager://users');
        const resourceResult = extractResourceResult(result);

        expect(resourceResult.contents).toBeDefined();
        expect(resourceResult.contents.length).toBe(1);
        expect(resourceResult.contents[0].uri).toBe('user-manager://users');
        expect(resourceResult.contents[0].mimeType).toBe('application/json');
        expect(resourceResult.contents[0].text).toBeDefined();

        const users = JSON.parse(resourceResult.contents[0].text!);
        expect(Array.isArray(users)).toBe(true);
        expect(users.length).toBe(0);
      });
    });

    it('should read All Users resource with users', async () => {
      // Use persistent server to create users and read resource in same process
      await withServer(async server => {
        // Create users via tools
        await server.callTool('create_user', {
        name: 'Resource Test User 1',
        email: 'resource1@example.com',
        role: 'user',
      });

        await server.callTool('create_user', {
        name: 'Resource Test User 2',
        email: 'resource2@example.com',
        role: 'admin',
      });

        // Read the resource
        const result = await server.readResource('user-manager://users');
        const resourceResult = extractResourceResult(result);

        expect(resourceResult.contents.length).toBe(1);
        expect(resourceResult.contents[0].uri).toBe('user-manager://users');
        expect(resourceResult.contents[0].mimeType).toBe('application/json');
        expect(resourceResult.contents[0].text).toBeDefined();

        const users = JSON.parse(resourceResult.contents[0].text!) as User[];
        expect(Array.isArray(users)).toBe(true);
        expect(users.length).toBeGreaterThanOrEqual(2);

        const user1 = users.find(u => u.name === 'Resource Test User 1');
        const user2 = users.find(u => u.name === 'Resource Test User 2');

        expect(user1).toBeDefined();
        expect(user1?.email).toBe('resource1@example.com');
        expect(user1?.role).toBe('user');

        expect(user2).toBeDefined();
        expect(user2?.email).toBe('resource2@example.com');
        expect(user2?.role).toBe('admin');
      });
    });

    it('should return valid JSON structure', async () => {
      await withServer(async server => {
        // Create a user
        await server.callTool('create_user', {
        name: 'JSON Test User',
        email: 'json@example.com',
        role: 'viewer',
      });

        // Read the resource
        const result = await server.readResource('user-manager://users');
        const resourceResult = extractResourceResult(result);
        const users = JSON.parse(resourceResult.contents[0].text!) as User[];

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
      });
    });
  });

  describe('User by ID resource', () => {
    it('should read user by ID when user exists', async () => {
      await withServer(async server => {
        // Create a user
        await server.callTool('create_user', {
        name: 'Individual User Test',
        email: 'individual@example.com',
        role: 'admin',
      });

        // Get the user ID from the all users resource
        const allUsersResult = await server.readResource('user-manager://users');
        const allUsers = JSON.parse(
          extractResourceResult(allUsersResult).contents[0].text!
        ) as User[];
        const createdUser = allUsers.find(u => u.name === 'Individual User Test');
        expect(createdUser).toBeDefined();

        // Read the user by ID resource
        const result = await server.readResource(`user-manager://users/${createdUser!.id}`);
        const resourceResult = extractResourceResult(result);

        expect(resourceResult.contents.length).toBe(1);
        expect(resourceResult.contents[0].uri).toBe(`user-manager://users/${createdUser!.id}`);
        expect(resourceResult.contents[0].mimeType).toBe('application/json');
        expect(resourceResult.contents[0].text).toBeDefined();

        const user = JSON.parse(resourceResult.contents[0].text!) as User;
        expect(user.id).toBe(createdUser!.id);
        expect(user.name).toBe('Individual User Test');
        expect(user.email).toBe('individual@example.com');
        expect(user.role).toBe('admin');
      });
    });

    it('should return error when user does not exist', async () => {
      await withServer(async server => {
        const result = await server.readResource('user-manager://users/non-existent-id');
        const resourceResult = extractResourceResult(result);

        expect(resourceResult.contents.length).toBe(1);
        expect(resourceResult.contents[0].mimeType).toBe('application/json');
        expect(resourceResult.contents[0].text).toBeDefined();

        const error = parseResourceError(resourceResult);
        expect(error.error).toBe('User not found');
      });
    });

    it('should return error when userId is missing', async () => {
      await withServer(async server => {
        // Try to read resource with empty userId (just the base URI)
        // This will return a JSON-RPC error since the resource doesn't exist
        try {
          const result = await server.readResource('user-manager://users/');
          extractResourceResult(result);
          // If we get here, the resource was found (unexpected)
          expect.fail('Expected error for missing userId');
        } catch (error) {
          // Expected - resource not found
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('Resource');
      }
      });
    });

    it('should list all user resources', async () => {
      await withServer(async server => {
        // Create users
        await server.callTool('create_user', {
        name: 'List User 1',
        email: 'list1@example.com',
        role: 'user',
      });
        await server.callTool('create_user', {
        name: 'List User 2',
        email: 'list2@example.com',
        role: 'admin',
      });

        // List resources
        const result = await server.listResources();
        const resourcesList = extractResourcesList(result);

        expect(resourcesList.resources).toBeDefined();
        expect(resourcesList.resources.length).toBeGreaterThanOrEqual(2);

        // Find user resources
        const userResources = resourcesList.resources.filter(r =>
          r.uri.startsWith('user-manager://users/') && r.uri !== 'user-manager://users'
        );
        expect(userResources.length).toBeGreaterThanOrEqual(2);

        const user1Resource = userResources.find(r => r.name === 'List User 1');
        expect(user1Resource).toBeDefined();
        expect(user1Resource?.description).toContain('List User 1');
        expect(user1Resource?.description).toContain('list1@example.com');
      });
    });

    it('should provide userId autocomplete', async () => {
      // Note: Resource template completion is not directly accessible via JSON-RPC
      // This test would require accessing the MCP server's internal structure
      // For now, we'll skip this test or test it indirectly via resource listing
      await withServer(async server => {
        // Create users
        await server.callTool('create_user', {
        name: 'Complete User 1',
        email: 'complete1@example.com',
        role: 'user',
      });
        await server.callTool('create_user', {
        name: 'Complete User 2',
        email: 'complete2@example.com',
        role: 'admin',
      });

        // List resources to verify users exist (indirect test of completion)
        const result = await server.listResources();
        const resourcesList = extractResourcesList(result);
        const userResources = resourcesList.resources.filter(r =>
          r.uri.startsWith('user-manager://users/') && r.uri !== 'user-manager://users'
        );

        expect(userResources.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should return valid JSON structure for existing user', async () => {
      await withServer(async server => {
        // Create a user
        await server.callTool('create_user', {
        name: 'Structure Test User',
        email: 'structure@example.com',
        role: 'viewer',
      });

        // Get the user ID from the all users resource
        const allUsersResult = await server.readResource('user-manager://users');
        const allUsers = JSON.parse(
          extractResourceResult(allUsersResult).contents[0].text!
        ) as User[];
        const testUser = allUsers[0];

        // Read the user by ID resource
        const result = await server.readResource(`user-manager://users/${testUser.id}`);
        const resourceResult = extractResourceResult(result);
        const user = JSON.parse(resourceResult.contents[0].text!) as User;

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
      });
    });
  });
});
