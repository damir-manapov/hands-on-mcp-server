import { z } from 'zod';
import type { ZodRawShape } from 'zod';

// Helper to work around type issues with ZodRawShape
// The MCP SDK expects ZodRawShape but we have ZodObject, so we need this conversion
// Note: We must use 'any' here due to TypeScript's inability to express the structural
// compatibility between ZodObject and ZodRawShape that exists at runtime
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const schema = <T extends ZodRawShape>(s: z.ZodObject<T>): any => {
  // Type assertion needed for MCP SDK compatibility
  // ZodObject is structurally compatible with ZodRawShape at runtime
  return s as unknown as ZodRawShape;
};

// Helper to create tool config with properly typed inputSchema
// This encapsulates the type conversion needed for MCP SDK compatibility
export function createToolConfig<T extends ZodRawShape>(
  description: string,
  inputSchema: z.ZodObject<T>
) {
  return {
    description,
    // The schema() helper uses 'any' for MCP SDK compatibility (see schema() comment)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    inputSchema: schema(inputSchema),
  };
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
export function createPromptMessage(text: string): {
  messages: Array<{
    role: 'user';
    content: { type: 'text'; text: string };
  }>;
} {
  return {
    messages: [
      {
        role: 'user' as const,
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
