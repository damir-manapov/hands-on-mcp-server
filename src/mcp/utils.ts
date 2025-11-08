import { z } from 'zod';
import type { ZodRawShape } from 'zod';

// Helper to work around type issues with ZodRawShape
// The MCP SDK expects ZodRawShape but we have ZodObject, so we need this conversion
// We extract the shape property which is the actual ZodRawShape
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const schema = <T extends ZodRawShape>(s: z.ZodObject<T>): any => {
  // Extract the shape property which is the ZodRawShape the SDK expects
  return s.shape;
};

// Helper to create tool config with properly typed inputSchema
// This encapsulates the type conversion needed for MCP SDK compatibility
export function createToolConfig<T extends ZodRawShape>(
  description: string,
  inputSchema?: z.ZodObject<T>
) {
  const config: {
    description: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    inputSchema?: any;
  } = {
    description,
  };

  // Only add inputSchema if provided and not empty
  if (inputSchema) {
    const shape = inputSchema.shape;
    const isEmpty = Object.keys(shape).length === 0;
    if (!isEmpty) {
      // Pass the shape (ZodRawShape) - the MCP SDK will wrap it in z.object()

      config.inputSchema = shape;
    }
  }

  return config;
}

// Helper function to safely parse and validate input
// After the success check, result.data is guaranteed to be type T
export function validateInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new Error(`Validation failed: ${result.error.message}`);
  }
  // TypeScript narrows the type after the success check
  return result.data;
}

// Helper function to create prompt messages
// Simplifies the creation of prompt message responses
export function createPromptMessage(
  role: 'user' | 'assistant',
  text: string
): {
  messages: Array<{
    role: 'user' | 'assistant';
    content: { type: 'text'; text: string };
  }>;
} {
  return {
    messages: [
      {
        role,
        content: {
          type: 'text' as const,
          text,
        },
      },
    ],
  };
}

// Helper function to create tool responses
// Simplifies the creation of tool response content
export function createToolResponse(
  text: string,
  isError = false
): {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
} {
  return {
    content: [
      {
        type: 'text' as const,
        text,
      },
    ],
    ...(isError && { isError: true }),
  };
}
