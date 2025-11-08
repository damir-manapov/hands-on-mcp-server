import { describe, it, expect, beforeEach } from 'vitest';
import { createServer } from '../../../src/mcp/server.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { db } from '../../../src/database.js';

describe('User Tools', () => {
  let mcpServer: McpServer;

  beforeEach(() => {
    mcpServer = createServer();
    // Clear users before each test
    const allUsers = db.getAllUsers();
    allUsers.forEach(user => {
      db.deleteUser(user.id);
    });
  });

  describe('create_user', () => {
    it('should create a user successfully', async () => {
      const registeredTools = mcpServer['_registeredTools'];
      const tool = registeredTools['create_user'];
      expect(tool).toBeDefined();

      if (tool) {
        const result = await tool.callback({
          name: 'John Doe',
          email: 'john@example.com',
          role: 'user',
        });

        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(result.content[0].type).toBe('text');
        expect(result.isError).toBeUndefined();

        const userData = JSON.parse(result.content[0].text);
        expect(userData.name).toBe('John Doe');
        expect(userData.email).toBe('john@example.com');
        expect(userData.role).toBe('user');
        expect(userData.id).toBeDefined();
        expect(userData.createdAt).toBeDefined();
        expect(userData.updatedAt).toBeDefined();
      }
    });

    it('should create users with different roles', async () => {
      const registeredTools = mcpServer['_registeredTools'];
      const tool = registeredTools['create_user'];
      expect(tool).toBeDefined();

      if (tool) {
        const adminResult = await tool.callback({
          name: 'Admin User',
          email: 'admin@example.com',
          role: 'admin',
        });
        const adminData = JSON.parse(adminResult.content[0].text);
        expect(adminData.role).toBe('admin');

        const viewerResult = await tool.callback({
          name: 'Viewer User',
          email: 'viewer@example.com',
          role: 'viewer',
        });
        const viewerData = JSON.parse(viewerResult.content[0].text);
        expect(viewerData.role).toBe('viewer');
      }
    });
  });

  describe('get_user', () => {
    it('should get an existing user by ID', async () => {
      // First create a user
      const createdUser = db.createUser({
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'admin',
      });

      const registeredTools = mcpServer['_registeredTools'];
      const tool = registeredTools['get_user'];
      expect(tool).toBeDefined();

      if (tool) {
        const result = await tool.callback({ userId: createdUser.id });

        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(result.content[0].type).toBe('text');
        expect(result.isError).toBeUndefined();

        const userData = JSON.parse(result.content[0].text);
        expect(userData.id).toBe(createdUser.id);
        expect(userData.name).toBe('Jane Doe');
        expect(userData.email).toBe('jane@example.com');
        expect(userData.role).toBe('admin');
      }
    });

    it('should return error for non-existent user', async () => {
      const registeredTools = mcpServer['_registeredTools'];
      const tool = registeredTools['get_user'];
      expect(tool).toBeDefined();

      if (tool) {
        const result = await tool.callback({ userId: 'non-existent-id' });

        expect(result).toBeDefined();
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toBe('User not found');
      }
    });
  });

  describe('list_users', () => {
    it('should return empty array when no users exist', async () => {
      const registeredTools = mcpServer['_registeredTools'];
      const tool = registeredTools['list_users'];
      expect(tool).toBeDefined();

      if (tool) {
        const result = await tool.callback({});

        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(result.content[0].type).toBe('text');
        expect(result.isError).toBeUndefined();

        const users = JSON.parse(result.content[0].text);
        expect(Array.isArray(users)).toBe(true);
        expect(users.length).toBe(0);
      }
    });

    it('should return all users', async () => {
      // Create multiple users
      const user1 = db.createUser({
        name: 'User One',
        email: 'user1@example.com',
        role: 'user',
      });
      const user2 = db.createUser({
        name: 'User Two',
        email: 'user2@example.com',
        role: 'admin',
      });
      const user3 = db.createUser({
        name: 'User Three',
        email: 'user3@example.com',
        role: 'viewer',
      });

      const registeredTools = mcpServer['_registeredTools'];
      const tool = registeredTools['list_users'];
      expect(tool).toBeDefined();

      if (tool) {
        const result = await tool.callback({});

        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(result.content[0].type).toBe('text');
        expect(result.isError).toBeUndefined();

        const users = JSON.parse(result.content[0].text);
        expect(Array.isArray(users)).toBe(true);
        expect(users.length).toBe(3);

        const userIds = users.map((u: { id: string }) => u.id);
        expect(userIds).toContain(user1.id);
        expect(userIds).toContain(user2.id);
        expect(userIds).toContain(user3.id);
      }
    });
  });

  describe('Integration', () => {
    it('should create, get, and list users in sequence', async () => {
      const registeredTools = mcpServer['_registeredTools'];
      const createTool = registeredTools['create_user'];
      const getTool = registeredTools['get_user'];
      const listTool = registeredTools['list_users'];

      expect(createTool).toBeDefined();
      expect(getTool).toBeDefined();
      expect(listTool).toBeDefined();

      if (createTool && getTool && listTool) {
        // Create a user
        const createResult = await createTool.callback({
          name: 'Integration Test User',
          email: 'integration@example.com',
          role: 'user',
        });
        const createdUser = JSON.parse(createResult.content[0].text);

        // Get the user
        const getResult = await getTool.callback({ userId: createdUser.id });
        const retrievedUser = JSON.parse(getResult.content[0].text);
        expect(retrievedUser.id).toBe(createdUser.id);
        expect(retrievedUser.name).toBe('Integration Test User');

        // List users
        const listResult = await listTool.callback({});
        const users = JSON.parse(listResult.content[0].text);
        expect(users.length).toBe(1);
        expect(users[0].id).toBe(createdUser.id);
      }
    });
  });
});
