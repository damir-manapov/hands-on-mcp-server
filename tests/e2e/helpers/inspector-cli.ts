import { spawn } from 'child_process';

export interface InspectorCliResult {
  success: boolean;
  output: string;
  error?: string;
  json?: unknown;
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
  serverCommand: string,
  toolName: string,
  args: Record<string, unknown> = {}
): Promise<InspectorCliResult> {
  return sendJsonRpcRequest(serverCommand, 'tools/call', {
    name: toolName,
    arguments: args,
  });
}

/**
 * List all tools using JSON-RPC over stdio
 */
export async function listToolsViaInspector(serverCommand: string): Promise<InspectorCliResult> {
  return sendJsonRpcRequest(serverCommand, 'tools/list', {});
}
