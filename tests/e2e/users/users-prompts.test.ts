import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../../src/database.js';
import {
  extractPromptResult,
  extractResourceResult,
  extractToolResult,
  extractPromptsList,
  extractPromptCompletion,
  withServer,
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
      await withServer(async server => {
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
      });
    });

    it('should return error message for non-existent user', async () => {
      await withServer(async server => {
        const result = await server.getPrompt('get_user_details', {
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
    });

    it('should include all user fields in details', async () => {
      await withServer(async server => {
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
      });
    });

    it('should provide userId autocompletion', async () => {
      await withServer(async server => {
        // Create users for autocompletion
        await server.callTool('create_user', {
          name: 'Autocomplete User 1',
          email: 'autocomplete1@example.com',
          role: 'user',
        });

        await server.callTool('create_user', {
          name: 'Autocomplete User 2',
          email: 'autocomplete2@example.com',
          role: 'admin',
        });

        // List prompts to verify the prompt has arguments schema
        const promptsResult = await server.listPrompts();
        const promptsList = extractPromptsList(promptsResult);

        expect(promptsList.prompts).toBeDefined();
        const getDetailsPrompt = promptsList.prompts.find(
          p => p.name === 'get_user_details'
        );
        
        expect(getDetailsPrompt).toBeDefined();
        if (!getDetailsPrompt) {
          throw new Error('get_user_details prompt not found');
        }

        expect(getDetailsPrompt.description).toBeDefined();
        expect(getDetailsPrompt.description).toContain('Get detailed information');

        // Verify that the prompt has arguments defined for autocompletion
        expect(getDetailsPrompt.arguments).toBeDefined();
        expect(Array.isArray(getDetailsPrompt.arguments)).toBe(true);

        // Verify that the arguments array includes userId field
        const userIdArg = getDetailsPrompt.arguments?.find(
          arg => arg.name === 'userId'
        );
        expect(userIdArg).toBeDefined();
        expect(userIdArg?.description).toBeDefined();
        expect(userIdArg?.description).toContain('User ID');
        expect(userIdArg?.required).toBe(true);
      });
    });

    it('should provide completion suggestions when typing partial user ID', async () => {
      await withServer(async server => {
        // Clear all users first
        await server.callTool('clear_all_users', {});

        // Create users with different ID patterns for testing
        const user1Result = await server.callTool('create_user', {
          name: 'Completion Test User 1',
          email: 'completion1@example.com',
          role: 'user',
        });
        const user1 = extractToolResult(user1Result);
        const user1Data = JSON.parse(user1.content[0].text!) as { id: string };

        const user2Result = await server.callTool('create_user', {
          name: 'Completion Test User 2',
          email: 'completion2@example.com',
          role: 'admin',
        });
        const user2 = extractToolResult(user2Result);
        const user2Data = JSON.parse(user2.content[0].text!) as { id: string };

        // Test completion with no input - should return all user IDs
        const allCompletionResult = await server.getPromptCompletion('get_user_details', {});
        const allCompletion = extractPromptCompletion(allCompletionResult);
        expect(allCompletion.argument).toBeDefined();
        expect(allCompletion.argument.userId).toBeDefined();
        expect(Array.isArray(allCompletion.argument.userId)).toBe(true);
        expect(allCompletion.argument.userId.length).toBeGreaterThanOrEqual(2);
        expect(allCompletion.argument.userId).toContain(user1Data.id);
        expect(allCompletion.argument.userId).toContain(user2Data.id);

        // Test completion with partial input - should return matching user IDs
        // Use the first few characters of user1's ID
        const partialId = user1Data.id.substring(0, Math.min(4, user1Data.id.length));
        const partialCompletionResult = await server.getPromptCompletion('get_user_details', {
          userId: partialId,
        });
        const partialCompletion = extractPromptCompletion(partialCompletionResult);
        expect(partialCompletion.argument).toBeDefined();
        expect(partialCompletion.argument.userId).toBeDefined();
        expect(Array.isArray(partialCompletion.argument.userId)).toBe(true);
        // Should include user1 since it starts with the partial ID
        expect(partialCompletion.argument.userId).toContain(user1Data.id);
        // All returned IDs should start with the partial input
        partialCompletion.argument.userId.forEach(id => {
          expect(id.toLowerCase().startsWith(partialId.toLowerCase())).toBe(true);
        });
      });
    });
  });

  describe('list_all_users', () => {
    it('should return message when no users exist', async () => {
      await withServer(async server => {
        // Clear all users first
        await server.callTool('clear_all_users', {});

        const result = await server.getPrompt('list_all_users', {});
        const promptResult = extractPromptResult(result);

        expect(promptResult.messages).toBeDefined();
        expect(promptResult.messages.length).toBe(1);
        expect(promptResult.messages[0].role).toBe('user');
        expect(promptResult.messages[0].content.type).toBe('text');
        expect(promptResult.messages[0].content.text).toContain('No users found');
      });
    });

    it('should list all users with their information', async () => {
      await withServer(async server => {
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
      });
    });

    it('should include role information for each user', async () => {
      await withServer(async server => {
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
      });
    });

    it('should format user list correctly', async () => {
      await withServer(async server => {
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
      });
    });
  });
});
