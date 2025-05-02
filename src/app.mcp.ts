import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { authMcp, usersMcp, epicsMcp, tasksMcp, commentsMcp } from "./features";

// create server
const server = new McpServer({
  name: "DEV.to Permit.io Hackathon",
  version: "1.0.0",
});

// tools and resources
authMcp(server);
usersMcp(server);
epicsMcp(server);
tasksMcp(server);
commentsMcp(server);

// start the server
(async () => {
  const transport = new StdioServerTransport();
  server.connect(transport);
})().catch((err) => {
  console.error("Error starting server:", err);
  process.exit(1);
});
