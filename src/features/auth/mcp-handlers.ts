import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { MessageConstants } from "~/utils";

import * as service from "./service";

enum Descriptions {
  Login = "Authenticate a user by providing an email address. The email will contains a unique session code which will be used for subsequent MCP calls.",
  Logout = "Invalidate the provided session code so it will be unusable for subsequent MCP calls, effectively revoking the user access and requiring the user to login again.",
}

export default function mcpAuthHandlers(server: McpServer) {
  server.tool(
    "login",
    Descriptions.Login,
    { email: z.string() },
    async (body) => {
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
    },
  );

  server.tool(
    "logout",
    Descriptions.Logout,
    { sessionCode: z.string() },
    async (body) => {
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
    },
  );
}
