#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './mcp/server.js';

const mcpServer = createServer();

process.on('SIGINT', () => {
  void mcpServer.close().then(() => {
    process.exit(0);
  });
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  // Server is now ready - don't output anything to stdout/stderr
  // as it would interfere with JSON-RPC communication
}

main().catch((error: unknown) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
