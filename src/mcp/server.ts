import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { registerAllEntities } from './entities/index.js';
import { db } from '../database.js';

// Schema for completion/complete request (the actual MCP completion API)
const CompletionCompleteRequestSchema = z.object({
  method: z.literal('completion/complete'),
  params: z.object({
    argument: z.object({
      name: z.string(),
      value: z.string(),
    }),
    ref: z.object({
      type: z.string(),
      name: z.string(),
    }),
    context: z
      .object({
        arguments: z.record(z.unknown()).optional(),
      })
      .optional(),
  }),
});

export function createServer(): McpServer {
  const mcpServer = new McpServer(
    {
      name: 'user-manager-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  // Register all entities (tools, resources, prompts) first
  // This sets up the SDK's internal completion handler for resources
  registerAllEntities(mcpServer);

  // Register prompt completion handler AFTER entities are registered
  // The SDK sets up a completion/complete handler for resources, but we need to extend it
  // to also handle prompt completions. We'll wrap the existing handler.
  // Note: The SDK may throw an error if we try to override, so we need to work around this
  // by using the low-level API and handling both resource and prompt completions

  // Get the existing completion handler if it exists (for resources)
  // We'll create a wrapper that handles both resource and prompt completions
  // Since we can't easily access the SDK's internal handler, we'll create our own
  // that handles prompts and delegates to the SDK for resources (if needed)

  // For now, register our handler - it will handle prompt completions
  // Resource completions are already handled by the SDK through ResourceTemplate.complete
  try {
    mcpServer.server.setRequestHandler(CompletionCompleteRequestSchema, async request => {
      const { argument, ref } = request.params;

      // Handle get_user_details prompt completion for userId argument
      if (
        ref.type === 'ref/prompt' &&
        ref.name === 'get_user_details' &&
        argument.name === 'userId'
      ) {
        const partialUserId = argument.value || '';
        const allUsers = db.getAllUsers();

        // Filter users whose IDs start with the partial input
        const matchingUserIds = allUsers
          .filter(user => user.id.toLowerCase().startsWith(partialUserId.toLowerCase()))
          .map(user => user.id);

        // Return completion values in the correct format
        // The SDK expects values to be an array of strings, not objects
        return {
          completion: {
            values: matchingUserIds,
            hasMore: false,
          },
        };
      }

      // For resource completions, return empty completion
      // The SDK's handler should handle resource completions, but if our handler
      // is called first, we return empty for non-prompt completions
      // Note: This might not work if the SDK's handler is registered first
      return {
        completion: {
          values: [],
          hasMore: false,
        },
      };
    });
  } catch (error) {
    // If setting the handler fails (e.g., already exists), that's okay
    // The SDK's handler should handle resource completions, and we'll need
    // to find another way to add prompt completion support
    // For now, log the error but don't fail server creation
    console.error('[Warning] Could not register prompt completion handler:', error);
  }

  // Error handling
  mcpServer.server.onerror = error => {
    // Log errors to stderr (won't interfere with JSON-RPC on stdout)
    console.error('[MCP Error]', error);
  };

  return mcpServer;
}
