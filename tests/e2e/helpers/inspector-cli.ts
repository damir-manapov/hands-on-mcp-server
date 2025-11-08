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

export interface ToolsListResult {
  tools: Array<{ name: string; description?: string }>;
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
 * Extract tools list from InspectorCliResult
 * Throws if the result is invalid or missing
 */
export function extractToolsList(result: InspectorCliResult): ToolsListResult {
  if (!result.success) {
    throw new Error(`Tools list failed: ${result.error || 'Unknown error'}`);
  }

  if (!result.json || typeof result.json !== 'object' || !('result' in result.json)) {
    throw new Error(`Invalid response format: ${JSON.stringify(result.json)}`);
  }

  const toolsResult = result.json.result as ToolsListResult;
  if (!toolsResult || !Array.isArray(toolsResult.tools)) {
    throw new Error(`Invalid tools list format: ${JSON.stringify(toolsResult)}`);
  }

  return toolsResult;
}

/**
 * Safely extract tool result from InspectorCliResult
 * Returns null if the result is invalid or missing
 */
export function tryExtractToolResult(result: InspectorCliResult): ToolResult | null {
  try {
    return extractToolResult(result);
  } catch {
    return null;
  }
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
 * Send a JSON-RPC request to the MCP server via stdio
 */
async function sendJsonRpcRequest(
  serverCommand: string,
  method: string,
  params: Record<string, unknown>
): Promise<InspectorCliResult> {
  return new Promise(resolve => {
    const parts = serverCommand.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);

    if (!cmd) {
      resolve({
        success: false,
        output: '',
        error: 'Invalid server command',
      });
      return;
    }

    const proc = spawn(cmd, args, {
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let responseReceived = false;

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
      // Check if we have a complete JSON-RPC response
      const lines = stdout
        .trim()
        .split('\n')
        .filter(l => l.trim().startsWith('{'));
      if (lines.length > 0 && !responseReceived) {
        try {
          const lastLine = lines[lines.length - 1];
          if (lastLine) {
            JSON.parse(lastLine);
            responseReceived = true;
          }
          // Give it a moment to ensure all data is received, then close
          setTimeout(() => {
            if (!proc.killed) {
              proc.kill();
            }
          }, 100);
        } catch {
          // Not complete yet, keep waiting
        }
      }
    });

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    // Send JSON-RPC request after a small delay to ensure server is ready
    const requestTimeout = setTimeout(() => {
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      };

      proc.stdin.write(JSON.stringify(request) + '\n');
      proc.stdin.end();
    }, 100);

    // Timeout after 10 seconds
    const processTimeout = setTimeout(() => {
      if (!proc.killed) {
        proc.kill();
      }
      resolve({
        success: false,
        output: stdout,
        error: 'Timeout',
      });
    }, 10000);

    proc.on('close', code => {
      clearTimeout(requestTimeout);
      clearTimeout(processTimeout);
      let json: unknown;
      try {
        // Try to parse the last line as JSON (MCP responses are JSON-RPC)
        // Filter out stderr messages that might be mixed in
        const lines = stdout
          .trim()
          .split('\n')
          .filter(l => l.trim() && l.trim().startsWith('{'));
        const lastLine = lines[lines.length - 1];
        if (lastLine) {
          json = JSON.parse(lastLine);
        }
      } catch {
        // Not JSON, that's okay
      }

      const result: InspectorCliResult = {
        success: code === 0 || code === null || responseReceived,
        output: stdout,
        json,
      };
      if (stderr) {
        result.error = stderr;
      }

      resolve(result);
    });

    proc.on('error', error => {
      clearTimeout(requestTimeout);
      clearTimeout(processTimeout);
      resolve({
        success: false,
        output: stdout,
        error: error.message,
      });
    });
  });
}

/**
 * Call an MCP tool using JSON-RPC over stdio
 */
export async function callToolViaInspector(
  toolName: string,
  args: Record<string, unknown> = {},
  serverCommand: string = DEFAULT_SERVER_COMMAND
): Promise<InspectorCliResult> {
  return sendJsonRpcRequest(serverCommand, 'tools/call', {
    name: toolName,
    arguments: args,
  });
}

/**
 * List all tools using JSON-RPC over stdio
 */
export async function listToolsViaInspector(
  serverCommand: string = DEFAULT_SERVER_COMMAND
): Promise<InspectorCliResult> {
  return sendJsonRpcRequest(serverCommand, 'tools/list', {});
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
        // Server is ready when we see the startup message
        if (this.stderrBuffer.includes('running on stdio')) {
          this.isReady = true;
          resolve();
        }
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

      // Timeout if server doesn't start within 5 seconds
      setTimeout(() => {
        if (!this.isReady) {
          reject(new Error('Server did not start within timeout'));
        }
      }, 5000);
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
