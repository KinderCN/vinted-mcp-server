#!/usr/bin/env node
import { startServer } from '../index';

startServer().catch((error) => {
  console.error('Failed to start Vinted MCP server:', error);
  process.exit(1);
});
