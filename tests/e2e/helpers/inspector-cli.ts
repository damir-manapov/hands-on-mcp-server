import { spawn, type ChildProcess } from 'child_process';

// Default server command for integration tests
const DEFAULT_SERVER_COMMAND = 'node dist/index.js';

export interface InspectorCliResult {
  success: boolean;
  output: string;
  error?: string;
  json?: unknown;
}

export interface ToolResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}


export interface ResourceResult {
  contents: Array<{
    uri: string;
    mimeType: string;
    text?: string;
  }>;
}

export interface ResourceErrorResponse {
  error: string;
}

export interface ResourcesListResult {
  resources: Array<{
    uri: string;
    name?: string;
    description?: string;
    mimeType?: string;
  }>;
}

export interface PromptResult {
  messages: Array<{
    role: 'user' | 'assistant';
    content: { type: 'text'; text: string };
  }>;
}

export interface PromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface PromptInfo {
  name: string;
  description?: string;
  arguments?: PromptArgument[];
}

export interface PromptsListResult {
  prompts: PromptInfo[];
}


/**
 * Extract tool result from InspectorCliResult
 * Throws if the result is invalid or missing
 */
export function extractToolResult(result: InspectorCliResult): ToolResult {
  if (!result.success) {
    throw new Error(`Tool call failed: ${result.error || 'Unknown error'}`);
  }

  if (!result.json || typeof result.json !== 'object' || !('result' in result.json)) {
    throw new Error(`Invalid response format: ${JSON.stringify(result.json)}`);
  }

  const toolResult = result.json.result as ToolResult;
  if (!toolResult || !toolResult.content) {
    throw new Error(`Invalid tool result format: ${JSON.stringify(toolResult)}`);
  }

  return toolResult;
}


/**
 * Get the text content from a tool result
 * Throws if content is empty or missing
 */
export function getToolResultText(toolResult: ToolResult): string {
  if (!toolResult.content || toolResult.content.length === 0) {
    throw new Error('Tool result has no content');
  }
  return toolResult.content[0].text;
}

/**
 * Get and parse JSON text content from a tool result
 * Throws if content is empty, missing, or invalid JSON
 */
export function parseToolResultText<T = unknown>(toolResult: ToolResult): T {
  const text = getToolResultText(toolResult);
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(`Failed to parse tool result text as JSON: ${error}`);
  }
}

/**
 * Extract resource result from InspectorCliResult
 * Throws if the result is invalid or missing
 */
export function extractResourceResult(result: InspectorCliResult): ResourceResult {
  if (!result.json || typeof result.json !== 'object') {
    throw new Error(`Invalid response format: ${JSON.stringify(result.json)}`);
  }

  // Check for JSON-RPC error
  if ('error' in result.json) {
    const error = result.json.error as { code?: number; message?: string };
    throw new Error(
      `Resource read failed: ${error.message || JSON.stringify(error)}`
    );
  }

  if (!('result' in result.json)) {
    throw new Error(`Invalid response format: ${JSON.stringify(result.json)}`);
  }

  const resourceResult = result.json.result as ResourceResult;
  if (!resourceResult || !resourceResult.contents) {
    throw new Error(`Invalid resource result format: ${JSON.stringify(resourceResult)}`);
  }

  return resourceResult;
}

/**
 * Extract resources list from InspectorCliResult
 * Throws if the result is invalid or missing
 */
export function extractResourcesList(result: InspectorCliResult): ResourcesListResult {
  if (!result.success) {
    throw new Error(`Resources list failed: ${result.error || 'Unknown error'}`);
  }

  if (!result.json || typeof result.json !== 'object' || !('result' in result.json)) {
    throw new Error(`Invalid response format: ${JSON.stringify(result.json)}`);
  }

  const resourcesResult = result.json.result as ResourcesListResult;
  if (!resourcesResult || !Array.isArray(resourcesResult.resources)) {
    throw new Error(`Invalid resources list format: ${JSON.stringify(resourcesResult)}`);
  }

  return resourcesResult;
}


/**
 * Extract prompt result from InspectorCliResult
 * Throws if the result is invalid or missing
 */
export function extractPromptResult(result: InspectorCliResult): PromptResult {
  if (!result.json || typeof result.json !== 'object') {
    throw new Error(`Invalid response format: ${JSON.stringify(result.json)}`);
  }

  // Check for JSON-RPC error
  if ('error' in result.json) {
    const error = result.json.error as { code?: number; message?: string };
    throw new Error(`Prompt get failed: ${error.message || JSON.stringify(error)}`);
  }

  if (!('result' in result.json)) {
    throw new Error(`Invalid response format: ${JSON.stringify(result.json)}`);
  }

  const promptResult = result.json.result as PromptResult;
  if (!promptResult || !promptResult.messages) {
    throw new Error(`Invalid prompt result format: ${JSON.stringify(promptResult)}`);
  }

  return promptResult;
}


/**
 * Helper function to run a test with a PersistentServer
 * Automatically handles server lifecycle (start, ready, stop)
 */
export async function withServer<T>(
  testFn: (server: PersistentServer) => Promise<T>,
  serverCommand: string = DEFAULT_SERVER_COMMAND
): Promise<T> {
  const server = new PersistentServer(serverCommand);
  try {
    await server.ready();
    return await testFn(server);
  } finally {
    await server.stop();
  }
}

/**
 * Persistent server process that can handle multiple JSON-RPC requests
 * This allows testing operations that require state persistence across calls
 */
export class PersistentServer {
  private proc: ChildProcess | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number, {
    resolve: (result: InspectorCliResult) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();
  private stdoutBuffer = '';
  private stderrBuffer = '';
  private isReady = false;
  private readyPromise: Promise<void>;

  constructor(private serverCommand: string = DEFAULT_SERVER_COMMAND) {
    this.readyPromise = this.start();
  }

  /**
   * Wait for the server to be ready
   */
  async ready(): Promise<void> {
    await this.readyPromise;
  }

  /**
   * Start the server process
   */
  private async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      const parts = this.serverCommand.split(' ');
      const cmd = parts[0];
      const args = parts.slice(1);

      if (!cmd) {
        reject(new Error('Invalid server command'));
        return;
      }

      this.proc = spawn(cmd, args, {
        shell: false,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      if (!this.proc.stdout || !this.proc.stderr) {
        reject(new Error('Failed to spawn server process'));
        return;
      }

      this.proc.stdout.on('data', (data: Buffer) => {
        this.stdoutBuffer += data.toString();
        this.processStdout();
      });

      this.proc.stderr.on('data', (data: Buffer) => {
        this.stderrBuffer += data.toString();
        // Stderr is just for error logging, don't use it to detect readiness
      });

      this.proc.on('error', error => {
        reject(error);
      });

      this.proc.on('close', code => {
        // Reject all pending requests
        for (const { reject, timeout } of this.pendingRequests.values()) {
          clearTimeout(timeout);
          reject(new Error(`Server process closed with code ${code}`));
        }
        this.pendingRequests.clear();
      });

      // Send initialize request to check if server is ready
      // The server is ready when it responds to initialize
      // Use a small delay to ensure process is fully spawned
      setTimeout(() => {
        try {
          const initRequest = {
            jsonrpc: '2.0' as const,
            id: -1, // Use -1 to avoid conflicts with regular requests
            method: 'initialize',
            params: {
              protocolVersion: '2024-11-05',
              capabilities: {},
              clientInfo: {
                name: 'test-client',
                version: '1.0.0',
              },
            },
          };

          if (this.proc && this.proc.stdin && !this.proc.stdin.destroyed) {
            this.proc.stdin.write(JSON.stringify(initRequest) + '\n');
          }

          // Wait for initialize response
          // The response will be detected in processStdout() which sets isReady
          const checkReady = setInterval(() => {
            if (this.isReady) {
              clearInterval(checkReady);
              resolve();
            }
          }, 50);

          // Timeout if server doesn't respond within 5 seconds
          setTimeout(() => {
            clearInterval(checkReady);
            if (!this.isReady) {
              reject(new Error('Server did not respond to initialize within timeout'));
            }
          }, 5000);
        } catch (error) {
          reject(error);
        }
      }, 200);
    });
  }

  /**
   * Process stdout buffer and match responses to pending requests
   */
  private processStdout(): void {
    const lines = this.stdoutBuffer.split('\n');
    
    // Keep the last incomplete line in the buffer
    this.stdoutBuffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('{')) {
        continue;
      }

      try {
        const response = JSON.parse(trimmed) as { id?: number; result?: unknown; error?: unknown };
        
        // Check if this is the initialize response (id: -1) indicating server is ready
        if (response.id === -1 && response.result && !this.isReady) {
          this.isReady = true;
          // Don't process this as a regular request, it's just for readiness check
          continue;
        }
        
        if (response.id !== undefined && this.pendingRequests.has(response.id)) {
          const { resolve, timeout } = this.pendingRequests.get(response.id)!;
          clearTimeout(timeout);
          this.pendingRequests.delete(response.id);

          const result: InspectorCliResult = {
            success: !response.error,
            output: trimmed,
            json: response,
          };

          if (response.error) {
            result.error = JSON.stringify(response.error);
          }

          resolve(result);
        }
      } catch {
        // Not a JSON-RPC response, ignore
      }
    }
  }

  /**
   * Send a JSON-RPC request to the persistent server
   */
  async sendRequest(method: string, params: Record<string, unknown>): Promise<InspectorCliResult> {
    await this.ready();

    if (!this.proc || this.proc.killed) {
      throw new Error('Server process is not running');
    }

    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      const request = {
        jsonrpc: '2.0' as const,
        id,
        method,
        params,
      };

      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request ${id} timed out`));
      }, 10000);

      // Store the promise resolvers
      this.pendingRequests.set(id, { resolve, reject, timeout });

      // Send the request
      if (!this.proc) {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        reject(new Error('Server process is not running'));
        return;
      }

      if (this.proc.stdin && !this.proc.stdin.destroyed) {
        this.proc.stdin.write(JSON.stringify(request) + '\n');
      } else {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        reject(new Error('Server stdin is not available'));
      }
    });
  }

  /**
   * Call a tool on the persistent server
   */
  async callTool(toolName: string, args: Record<string, unknown> = {}): Promise<InspectorCliResult> {
    return this.sendRequest('tools/call', {
      name: toolName,
      arguments: args,
    });
  }

  /**
   * List tools on the persistent server
   */
  async listTools(): Promise<InspectorCliResult> {
    return this.sendRequest('tools/list', {});
  }

  /**
   * Read a resource on the persistent server
   */
  async readResource(uri: string): Promise<InspectorCliResult> {
    return this.sendRequest('resources/read', { uri });
  }

  /**
   * List resources on the persistent server
   */
  async listResources(): Promise<InspectorCliResult> {
    return this.sendRequest('resources/list', {});
  }

  /**
   * Get a prompt on the persistent server
   */
  async getPrompt(promptName: string, args: Record<string, unknown> = {}): Promise<InspectorCliResult> {
    return this.sendRequest('prompts/get', {
      name: promptName,
      arguments: args,
    });
  }

  /**
   * List prompts on the persistent server
   */
  async listPrompts(): Promise<InspectorCliResult> {
    return this.sendRequest('prompts/list', {});
  }

  /**
   * Get prompt completion suggestions on the persistent server
   * Uses the old prompts/complete API (for backward compatibility with existing tests)
   */
  async getPromptCompletion(
    promptName: string,
    args: Record<string, unknown> = {}
  ): Promise<InspectorCliResult> {
    return this.sendRequest('prompts/complete', {
      name: promptName,
      arguments: args,
    });
  }

  /**
   * Get completion suggestions using the completion/complete API
   * This is the actual API format used by MCP clients
   */
  async getCompletion(
    argumentName: string,
    argumentValue: string,
    refType: string,
    refName: string,
    context?: Record<string, unknown>
  ): Promise<InspectorCliResult> {
    return this.sendRequest('completion/complete', {
      argument: {
        name: argumentName,
        value: argumentValue,
      },
      ref: {
        type: refType,
        name: refName,
      },
      context: context ? { arguments: context } : undefined,
    });
  }

  /**
   * Stop the server process
   */
  async stop(): Promise<void> {
    // Reject all pending requests
    for (const { reject, timeout } of this.pendingRequests.values()) {
      clearTimeout(timeout);
      reject(new Error('Server is being stopped'));
    }
    this.pendingRequests.clear();

    if (this.proc && !this.proc.killed) {
      this.proc.kill();
      this.proc = null;
    }
  }
}

/**
 * Extract prompts list from InspectorCliResult
 * Throws if the result is invalid or missing
 */
export function extractPromptsList(result: InspectorCliResult): PromptsListResult {
  if (!result.success) {
    throw new Error(`Prompts list failed: ${result.error || 'Unknown error'}`);
  }

  if (!result.json || typeof result.json !== 'object' || !('result' in result.json)) {
    throw new Error(`Invalid response format: ${JSON.stringify(result.json)}`);
  }

  const promptsResult = result.json.result as PromptsListResult;
  if (!promptsResult || !Array.isArray(promptsResult.prompts)) {
    throw new Error(`Invalid prompts list format: ${JSON.stringify(promptsResult)}`);
  }

  return promptsResult;
}

/**
 * Parse error response from a resource result
 * Throws if the content is missing or invalid JSON
 */
export function parseResourceError(resourceResult: ResourceResult): ResourceErrorResponse {
  if (!resourceResult.contents || resourceResult.contents.length === 0) {
    throw new Error('Resource result has no contents');
  }

  const content = resourceResult.contents[0];
  if (!content.text) {
    throw new Error('Resource content has no text');
  }

  try {
    const parsed = JSON.parse(content.text) as ResourceErrorResponse;
    if (!parsed.error || typeof parsed.error !== 'string') {
      throw new Error('Invalid error response format: missing or invalid error field');
    }
    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse resource error as JSON: ${error.message}`);
    }
    throw error;
  }
}

export interface PromptCompletionResult {
  argument: Record<string, string[]>;
}

export interface CompletionResult {
  completion: {
    values: string[];
    hasMore: boolean;
  };
}

/**
 * Extract prompt completion result from InspectorCliResult (old API format)
 * Throws if the result is invalid or missing
 */
export function extractPromptCompletion(result: InspectorCliResult): PromptCompletionResult {
  if (!result.success) {
    throw new Error(`Prompt completion failed: ${result.error || 'Unknown error'}`);
  }

  if (!result.json || typeof result.json !== 'object' || !('result' in result.json)) {
    throw new Error(`Invalid response format: ${JSON.stringify(result.json)}`);
  }

  const completionResult = result.json.result as PromptCompletionResult;
  if (!completionResult || typeof completionResult !== 'object' || !('argument' in completionResult)) {
    throw new Error(`Invalid completion result format: ${JSON.stringify(completionResult)}`);
  }

  return completionResult;
}

/**
 * Extract completion result from InspectorCliResult (new completion/complete API)
 * Throws if the result is invalid or missing
 */
export function extractCompletion(result: InspectorCliResult): CompletionResult {
  if (!result.success) {
    throw new Error(`Completion failed: ${result.error || 'Unknown error'}`);
  }

  if (!result.json || typeof result.json !== 'object' || !('result' in result.json)) {
    throw new Error(`Invalid response format: ${JSON.stringify(result.json)}`);
  }

  const completionResult = result.json.result as CompletionResult;
  if (
    !completionResult ||
    typeof completionResult !== 'object' ||
    !('completion' in completionResult) ||
    !Array.isArray(completionResult.completion.values)
  ) {
    throw new Error(`Invalid completion result format: ${JSON.stringify(completionResult)}`);
  }

  // Validate that all values are strings
  if (!completionResult.completion.values.every(v => typeof v === 'string')) {
    throw new Error(`Invalid completion values: expected array of strings, got ${JSON.stringify(completionResult.completion.values)}`);
  }

  return completionResult;
}
