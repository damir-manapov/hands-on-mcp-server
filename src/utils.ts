import { z } from 'zod';
import type { ZodRawShape } from 'zod';

// Helper to work around type issues with ZodRawShape
// The MCP SDK expects ZodRawShape but we have ZodObject, so we need this conversion
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
export const schema = <T extends ZodRawShape>(s: z.ZodObject<T>) => s as unknown as any;

// Helper to create tool config with properly typed inputSchema
// This avoids eslint-disable comments by encapsulating the any cast
// The schema() helper returns any for MCP SDK compatibility
export function createToolConfig<T extends ZodRawShape>(
  description: string,
  inputSchema: z.ZodObject<T>
) {
  return {
    description,
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
