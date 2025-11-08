import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../../src/database.js';
import type { User } from '../../../src/types.js';
import {
  extractToolResult,
  parseToolResultText,
  getToolResultText,
  withServer,
} from '../helpers/inspector-cli.js';

describe('User Tools', () => {
  beforeEach(() => {
    // Clear users before each test
    const allUsers = db.getAllUsers();
    allUsers.forEach(user => {
      db.deleteUser(user.id);
    });
  });

  describe('create_user', () => {
    it('should create a user successfully', async () => {
      await withServer(async server => {
        const result = await server.callTool('create_user', {
          name: 'John Doe',
          email: 'john@example.com',
          role: 'user',
        });

        const toolResult = extractToolResult(result);
        const userData = parseToolResultText<User>(toolResult);
        expect(userData.name).toBe('John Doe');
        expect(userData.email).toBe('john@example.com');
        expect(userData.role).toBe('user');
        expect(userData.id).toBeDefined();
        expect(userData.createdAt).toBeDefined();
        expect(userData.updatedAt).toBeDefined();
      });
    });

    it('should create users with different roles', async () => {
      await withServer(async server => {
        const adminResult = await server.callTool('create_user', {
          name: 'Admin User',
          email: 'admin@example.com',
          role: 'admin',
        });

        const adminToolResult = extractToolResult(adminResult);
        const adminData = parseToolResultText<User>(adminToolResult);
        expect(adminData.role).toBe('admin');

        const viewerResult = await server.callTool('create_user', {
          name: 'Viewer User',
          email: 'viewer@example.com',
          role: 'viewer',
        });

        const viewerToolResult = extractToolResult(viewerResult);
        const viewerData = parseToolResultText<User>(viewerToolResult);
        expect(viewerData.role).toBe('viewer');
      });
    });
  });

  describe('get_user', () => {
    it('should get an existing user by ID using persistent server', async () => {
      await withServer(async server => {
        // Create a user
        const createResult = await server.callTool('create_user', {
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'admin',
      });

        const createToolResult = extractToolResult(createResult);
        const createdUser = parseToolResultText<User>(createToolResult);

        // Get the user - this should work since we're using the same process
        const getResult = await server.callTool('get_user', {
          userId: createdUser.id,
        });

        const getToolResult = extractToolResult(getResult);
        expect(getToolResult.isError).toBeUndefined();

        const userData = parseToolResultText<User>(getToolResult);
        expect(userData.id).toBe(createdUser.id);
        expect(userData.name).toBe('Jane Doe');
        expect(userData.email).toBe('jane@example.com');
        expect(userData.role).toBe('admin');
      });
    });

    it('should return error for non-existent user', async () => {
      await withServer(async server => {
        const result = await server.callTool('get_user', {
          userId: 'non-existent-id',
        });

        const toolResult = extractToolResult(result);
        expect(toolResult.isError).toBe(true);
        expect(getToolResultText(toolResult)).toBe('User not found');
      });
    });
  });

  describe('list_users', () => {
    it('should return empty array when no users exist', async () => {
      await withServer(async server => {
        // Clear all users first
        await server.callTool('clear_all_users', {});

        const result = await server.callTool('list_users', {});
        const toolResult = extractToolResult(result);
        const users = parseToolResultText<Array<unknown>>(toolResult);
        expect(Array.isArray(users)).toBe(true);
        expect(users.length).toBe(0);
      });
    });

    it('should return all users', async () => {
      await withServer(async server => {
        // Create users
        const user1Result = await server.callTool('create_user', {
          name: 'Test User 1',
          email: 'test1@example.com',
        role: 'user',
      });
        const user1Data = parseToolResultText<User>(extractToolResult(user1Result));

        const user2Result = await server.callTool('create_user', {
          name: 'Test User 2',
          email: 'test2@example.com',
        role: 'admin',
      });
        const user2Data = parseToolResultText<User>(extractToolResult(user2Result));

        // List users
        const listResult = await server.callTool('list_users', {});
        const listToolResult = extractToolResult(listResult);
        const users = parseToolResultText<Array<{ id: string; name: string }>>(listToolResult);
        expect(Array.isArray(users)).toBe(true);
        expect(users.length).toBeGreaterThanOrEqual(2);

        // Verify our created users are in the list
        const userIds = users.map((u: { id: string }) => u.id);
        expect(userIds).toContain(user1Data.id);
        expect(userIds).toContain(user2Data.id);
      });
    });
  });

  describe('Integration', () => {
    it('should create, get, and list users in sequence', async () => {
      await withServer(async server => {
        // Create a user
        const createResult = await server.callTool('create_user', {
          name: 'Integration Test User',
          email: 'integration@example.com',
          role: 'user',
        });

        const createToolResult = extractToolResult(createResult);
        const createdUser = parseToolResultText<User>(createToolResult);

        // Get the user
        const getResult = await server.callTool('get_user', {
          userId: createdUser.id,
        });

        const getToolResult = extractToolResult(getResult);
        expect(getToolResult.isError).toBeUndefined();

        const retrievedUser = parseToolResultText<User>(getToolResult);
        expect(retrievedUser.id).toBe(createdUser.id);
        expect(retrievedUser.name).toBe('Integration Test User');

        // List users
        const listResult = await server.callTool('list_users', {});
        const listToolResult = extractToolResult(listResult);
        const users = parseToolResultText<Array<{ id: string }>>(listToolResult);
        expect(users.length).toBeGreaterThanOrEqual(1);
        const userIds = users.map((u: { id: string }) => u.id);
        expect(userIds).toContain(createdUser.id);
      });
    });
  });
});
