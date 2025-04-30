import { z } from "zod";
import {
  type McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";

import { MessageConstants, MimeTypeJson } from "~/utils";
import { mcpAuthorize, mcpParseResource } from "~/features/common";

import * as service from "./service";

export default function mcpEpicHandlers(server: McpServer) {
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

      const epics = await service.list(authorized.userId);
      return {
        contents: epics.map((epic) => ({
          uri: `epics://{sessionCOde}/${epic.epicId}`,
          mimeType: MimeTypeJson,
          text: JSON.stringify(epic),
        })),
      };
    },
  );

  server.resource(
    "epic-detail",
    new ResourceTemplate("epics://{sessionCode}/{epicId}", { list: undefined }),
    async (uri, body) => {
      const parsed = await mcpParseResource(
        body,
        z.object({
          sessionCode: z.string(),
          epicId: z.string().ulid(),
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

      const epic = await service.get(parsed.data.epicId);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: MimeTypeJson,
            text: JSON.stringify(epic),
          },
        ],
      };
    },
  );

  server.resource(
    "epic-statistics",
    new ResourceTemplate("epics://{sessionCode}/statistics", {
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

      const stats = await service.statistics();
      return {
        contents: stats.map((epic) => ({
          uri: `epics://{sessionCOde}/${epic.epicId}`,
          mimeType: MimeTypeJson,
          text: JSON.stringify(epic),
        })),
      };
    },
  );

  server.tool(
    "create-epic",
    { sessionCode: z.string(), title: z.string() },
    async (body) => {
      const authorized = await mcpAuthorize({
        type: "tool",
        resource: "epics",
        sessionCode: body.sessionCode,
      });

      if (!authorized.success) {
        return {
          content: [
            {
              type: "text",
              text: MessageConstants.Forbidden,
            },
          ],
        };
      }

      const epic = await service.create({
        userId: authorized.userId,
        title: body.title,
      });
      return {
        content: [
          {
            type: "text",
            mimeType: MimeTypeJson,
            text: JSON.stringify(epic),
          },
        ],
      };
    },
  );
}
