import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { MessageConstants } from "~/utils";

import * as service from "./service";

export default function mcpAuthHandlers(server: McpServer) {
  server.tool("login", { email: z.string() }, async (body) => {
    const result = await service.loginWithSessionCode(body.email);
    if (!result) {
      return {
        content: [
          {
            type: "text",
            text: MessageConstants.InvalidUser,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: MessageConstants.SessionCodeSent,
        },
      ],
    };
  });

  server.tool("logout", { sessionCode: z.string() }, async (body) => {
    const result = await service.logoutWithSessionCode(body.sessionCode);
    if (!result) {
      return {
        content: [
          {
            type: "text",
            text: MessageConstants.InvalidSession,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: MessageConstants.SessionRevoked,
        },
      ],
    };
  });
}
