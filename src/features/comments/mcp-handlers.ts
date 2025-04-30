import { z } from "zod";
import {
  type McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";

import { MessageConstants, MimeTypeJson } from "~/utils";
import { mcpAuthorize, mcpParseResource } from "~/features/common";

import * as service from "./service";

export default function mcpCommentHandlers(server: McpServer) {
  server.resource(
    "list-task-comments",
    new ResourceTemplate("comments://{sessionCode}/{taskId?}/list", {
      list: undefined,
    }),
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

      const comments = await service.list(authorized.userId);
      return {
        contents: comments.map((c) => ({
          uri: `epics://{sessionCOde}/${c.taskId}`,
          mimeType: MimeTypeJson,
          text: JSON.stringify(c),
        })),
      };
    },
  );

  server.tool("add-task-comment", { sessionCode: z.string() }, async (body) => {
    body.sessionCode;
    return {
      content: [{ type: "text", text: "" }],
    };
  });
}
