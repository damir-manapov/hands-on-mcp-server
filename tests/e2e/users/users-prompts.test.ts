import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../../src/database.js';
import {
  getPromptViaInspector,
  listPromptsViaInspector,
  extractPromptResult,
  extractPromptsList,
  extractResourceResult,
  PersistentServer,
} from '../helpers/inspector-cli.js';

describe('User Prompts', () => {
  beforeEach(() => {
    // Clear users before each test
    const allUsers = db.getAllUsers();
    allUsers.forEach(user => {
      db.deleteUser(user.id);
    });
  });

  describe('get_user_details', () => {
    it('should get user details for existing user', async () => {
      const server = new PersistentServer();
      try {
        await server.ready();

        // Create a user
        await server.callTool('create_user', {
          name: 'Prompt Test User',
          email: 'prompttest@example.com',
          role: 'admin',
        });

        // Get the user ID from the all users resource
        const allUsersResult = await server.readResource('user-manager://users');
        const allUsers = JSON.parse(
          extractResourceResult(allUsersResult).contents[0].text!
        );
        const testUser = allUsers.find((u: { name: string }) => u.name === 'Prompt Test User');
        expect(testUser).toBeDefined();

        // Get prompt
        const result = await server.getPrompt('get_user_details', { userId: testUser.id });
        const promptResult = extractPromptResult(result);

        expect(promptResult.messages).toBeDefined();
        expect(promptResult.messages.length).toBe(1);
        expect(promptResult.messages[0].role).toBe('user');
        expect(promptResult.messages[0].content.type).toBe('text');

        const text = promptResult.messages[0].content.text;
        expect(text).toContain(testUser.id);
        expect(text).toContain('Prompt Test User');
        expect(text).toContain('prompttest@example.com');
        expect(text).toContain('admin');
        expect(text).toContain('User Details:');
      } finally {
        await server.stop();
      }
    });

    it('should return error message for non-existent user', async () => {
      const result = await getPromptViaInspector('get_user_details', {
        userId: 'non-existent-id',
      });
      const promptResult = extractPromptResult(result);

      expect(promptResult.messages).toBeDefined();
      expect(promptResult.messages.length).toBe(1);
      expect(promptResult.messages[0].role).toBe('user');
      expect(promptResult.messages[0].content.type).toBe('text');
      expect(promptResult.messages[0].content.text).toContain('not found');
      expect(promptResult.messages[0].content.text).toContain('non-existent-id');
    });

    it('should include all user fields in details', async () => {
      const server = new PersistentServer();
      try {
        await server.ready();

        // Create a user
        await server.callTool('create_user', {
          name: 'Complete User',
          email: 'complete@example.com',
          role: 'user',
        });

        // Get the user ID
        const allUsersResult = await server.readResource('user-manager://users');
        const allUsers = JSON.parse(
          extractResourceResult(allUsersResult).contents[0].text!
        );
        const testUser = allUsers.find((u: { name: string }) => u.name === 'Complete User');
        expect(testUser).toBeDefined();

        // Get prompt
        const result = await server.getPrompt('get_user_details', { userId: testUser.id });
        const promptResult = extractPromptResult(result);
        const text = promptResult.messages[0].content.text;

        expect(text).toContain('ID:');
        expect(text).toContain('Name:');
        expect(text).toContain('Email:');
        expect(text).toContain('Role:');
        expect(text).toContain('Created:');
        expect(text).toContain('Last Updated:');
      } finally {
        await server.stop();
      }
    });
  });

  describe('list_all_users', () => {
    it('should return message when no users exist', async () => {
      const result = await getPromptViaInspector('list_all_users', {});
      const promptResult = extractPromptResult(result);

      expect(promptResult.messages).toBeDefined();
      expect(promptResult.messages.length).toBe(1);
      expect(promptResult.messages[0].role).toBe('user');
      expect(promptResult.messages[0].content.type).toBe('text');
      // Note: Each call spawns a new process, so database is fresh
      expect(promptResult.messages[0].content.text).toMatch(/No users found|All Users/);
    });

    it('should list all users with their information', async () => {
      const server = new PersistentServer();
      try {
        await server.ready();

        // Create users
        await server.callTool('create_user', {
          name: 'List User One',
          email: 'list1@example.com',
          role: 'user',
        });
        await server.callTool('create_user', {
          name: 'List User Two',
          email: 'list2@example.com',
          role: 'admin',
        });
        await server.callTool('create_user', {
          name: 'List User Three',
          email: 'list3@example.com',
          role: 'viewer',
        });

        // Get user IDs for verification
        const allUsersResult = await server.readResource('user-manager://users');
        const allUsers = JSON.parse(
          extractResourceResult(allUsersResult).contents[0].text!
        );
        const user1 = allUsers.find((u: { name: string }) => u.name === 'List User One');
        const user2 = allUsers.find((u: { name: string }) => u.name === 'List User Two');
        const user3 = allUsers.find((u: { name: string }) => u.name === 'List User Three');

        // Get prompt
        const result = await server.getPrompt('list_all_users', {});
        const promptResult = extractPromptResult(result);

        expect(promptResult.messages.length).toBe(1);
        expect(promptResult.messages[0].role).toBe('user');
        expect(promptResult.messages[0].content.type).toBe('text');

        const text = promptResult.messages[0].content.text;
        expect(text).toContain('All Users');
        expect(text).toContain('total');
        expect(text).toContain('List User One');
        expect(text).toContain('list1@example.com');
        expect(text).toContain('List User Two');
        expect(text).toContain('list2@example.com');
        expect(text).toContain('List User Three');
        expect(text).toContain('list3@example.com');
        if (user1) expect(text).toContain(user1.id);
        if (user2) expect(text).toContain(user2.id);
        if (user3) expect(text).toContain(user3.id);
      } finally {
        await server.stop();
      }
    });

    it('should include role information for each user', async () => {
      const server = new PersistentServer();
      try {
        await server.ready();

        // Create a user
        await server.callTool('create_user', {
          name: 'Role Test User',
          email: 'role@example.com',
          role: 'admin',
        });

        // Get prompt
        const result = await server.getPrompt('list_all_users', {});
        const promptResult = extractPromptResult(result);
        const text = promptResult.messages[0].content.text;

        expect(text).toContain('Role:');
        expect(text).toContain('admin');
      } finally {
        await server.stop();
      }
    });

    it('should format user list correctly', async () => {
      const server = new PersistentServer();
      try {
        await server.ready();

        // Create a user
        await server.callTool('create_user', {
          name: 'Format User',
          email: 'format@example.com',
          role: 'user',
        });

        // Get prompt
        const result = await server.getPrompt('list_all_users', {});
        const promptResult = extractPromptResult(result);
        const text = promptResult.messages[0].content.text;

        // Should have bullet points
        expect(text).toContain('-');
        // Should have parentheses for email
        expect(text).toContain('(');
        expect(text).toContain(')');
      } finally {
        await server.stop();
      }
    });
  });
});
