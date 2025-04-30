import { z } from "zod";
import {
  type McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";

import { MessageConstants, MimeTypeJson } from "~/utils";
import { mcpAuthorize, mcpParseResource } from "~/features/common";

import * as service from "./service";

export default function mcpTaskHandlers(server: McpServer) {
  server.resource(
    "list-epics",
    new ResourceTemplate("epics://{sessionCode}/list", { list: undefined }),
    async (uri, body) => {
      const parsed = await mcpParseResource(
        body,
        z.object({
          sessionCode: z.string(),
        }),
      );

      if (!parsed.success) {
        return {
          contents: parsed.errorMessages.map((msg) => ({
            uri: uri.href,
            text: msg,
          })),
        };
      }

      const authorized = await mcpAuthorize({
        type: "resource",
        uri: uri,
        sessionCode: parsed.data.sessionCode,
      });

      if (!authorized.success) {
        return {
          contents: [
            {
              uri: uri.href,
              text: MessageConstants.Forbidden,
            },
          ],
        };
      }

      const userId =
        authorized.role === "developer" ? authorized.userId : undefined;
      const users = await service.list(userId);
      return {
        contents: users.map((u) => ({
          uri: `tasks://{sessionCode}/${u.taskId}`,
          text: JSON.stringify(u),
        })),
      };
    },
  );

  const UserProfileSchema = z.object({
    sessionCode: z.string(),
    userName: z.string(),
  });
}
