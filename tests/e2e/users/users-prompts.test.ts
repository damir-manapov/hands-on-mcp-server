import { describe, it, expect, beforeEach } from 'vitest';
import { createServer } from '../../../src/mcp/server.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { db } from '../../../src/database.js';

describe('User Prompts', () => {
  let mcpServer: McpServer;

  beforeEach(() => {
    mcpServer = createServer();
    // Clear users before each test
    const allUsers = db.getAllUsers();
    allUsers.forEach(user => {
      db.deleteUser(user.id);
    });
  });

  describe('get_user_details', () => {
    it('should get user details for existing user', async () => {
      const testUser = db.createUser({
        name: 'Prompt Test User',
        email: 'prompttest@example.com',
        role: 'admin',
      });

      const registeredPrompts = mcpServer['_registeredPrompts'];
      const prompt = registeredPrompts['get_user_details'];
      expect(prompt).toBeDefined();

      if (prompt) {
        const result = await prompt.callback({ userId: testUser.id });

        expect(result).toBeDefined();
        expect(result.messages).toBeDefined();
        expect(result.messages.length).toBe(1);
        expect(result.messages[0].role).toBe('user');
        expect(result.messages[0].content.type).toBe('text');

        const text = result.messages[0].content.text;
        expect(text).toContain(testUser.id);
        expect(text).toContain('Prompt Test User');
        expect(text).toContain('prompttest@example.com');
        expect(text).toContain('admin');
        expect(text).toContain('User Details:');
      }
    });

    it('should return error message for non-existent user', async () => {
      const registeredPrompts = mcpServer['_registeredPrompts'];
      const prompt = registeredPrompts['get_user_details'];
      expect(prompt).toBeDefined();

      if (prompt) {
        const result = await prompt.callback({ userId: 'non-existent-id' });

        expect(result).toBeDefined();
        expect(result.messages).toBeDefined();
        expect(result.messages.length).toBe(1);
        expect(result.messages[0].role).toBe('user');
        expect(result.messages[0].content.type).toBe('text');
        expect(result.messages[0].content.text).toContain('not found');
        expect(result.messages[0].content.text).toContain('non-existent-id');
      }
    });

    it('should include all user fields in details', async () => {
      const testUser = db.createUser({
        name: 'Complete User',
        email: 'complete@example.com',
        role: 'user',
      });

      const registeredPrompts = mcpServer['_registeredPrompts'];
      const prompt = registeredPrompts['get_user_details'];
      expect(prompt).toBeDefined();

      if (prompt) {
        const result = await prompt.callback({ userId: testUser.id });
        const text = result.messages[0].content.text;

        expect(text).toContain('ID:');
        expect(text).toContain('Name:');
        expect(text).toContain('Email:');
        expect(text).toContain('Role:');
        expect(text).toContain('Created:');
        expect(text).toContain('Last Updated:');
      }
    });
  });

  describe('list_all_users', () => {
    it('should return message when no users exist', async () => {
      const registeredPrompts = mcpServer['_registeredPrompts'];
      const prompt = registeredPrompts['list_all_users'];
      expect(prompt).toBeDefined();

      if (prompt) {
        const result = await prompt.callback({});

        expect(result).toBeDefined();
        expect(result.messages).toBeDefined();
        expect(result.messages.length).toBe(1);
        expect(result.messages[0].role).toBe('user');
        expect(result.messages[0].content.type).toBe('text');
        expect(result.messages[0].content.text).toContain('No users found');
      }
    });

    it('should list all users with their information', async () => {
      const user1 = db.createUser({
        name: 'List User One',
        email: 'list1@example.com',
        role: 'user',
      });
      const user2 = db.createUser({
        name: 'List User Two',
        email: 'list2@example.com',
        role: 'admin',
      });
      const user3 = db.createUser({
        name: 'List User Three',
        email: 'list3@example.com',
        role: 'viewer',
      });

      const registeredPrompts = mcpServer['_registeredPrompts'];
      const prompt = registeredPrompts['list_all_users'];
      expect(prompt).toBeDefined();

      if (prompt) {
        const result = await prompt.callback({});

        expect(result).toBeDefined();
        expect(result.messages).toBeDefined();
        expect(result.messages.length).toBe(1);
        expect(result.messages[0].role).toBe('user');
        expect(result.messages[0].content.type).toBe('text');

        const text = result.messages[0].content.text;
        expect(text).toContain('All Users');
        expect(text).toContain('3 total');
        expect(text).toContain('List User One');
        expect(text).toContain('list1@example.com');
        expect(text).toContain('List User Two');
        expect(text).toContain('list2@example.com');
        expect(text).toContain('List User Three');
        expect(text).toContain('list3@example.com');
        expect(text).toContain(user1.id);
        expect(text).toContain(user2.id);
        expect(text).toContain(user3.id);
      }
    });

    it('should include role information for each user', async () => {
      db.createUser({
        name: 'Role Test User',
        email: 'role@example.com',
        role: 'admin',
      });

      const registeredPrompts = mcpServer['_registeredPrompts'];
      const prompt = registeredPrompts['list_all_users'];
      expect(prompt).toBeDefined();

      if (prompt) {
        const result = await prompt.callback({});
        const text = result.messages[0].content.text;

        expect(text).toContain('Role:');
        expect(text).toContain('admin');
      }
    });

    it('should format user list correctly', async () => {
      db.createUser({
        name: 'Format User',
        email: 'format@example.com',
        role: 'user',
      });

      const registeredPrompts = mcpServer['_registeredPrompts'];
      const prompt = registeredPrompts['list_all_users'];
      expect(prompt).toBeDefined();

      if (prompt) {
        const result = await prompt.callback({});
        const text = result.messages[0].content.text;

        // Should have bullet points
        expect(text).toContain('-');
        // Should have parentheses for email
        expect(text).toContain('(');
        expect(text).toContain(')');
      }
    });
  });
});
