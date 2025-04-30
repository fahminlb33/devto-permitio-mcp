import { z } from "zod";
import {
  type McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";

import { sprintf, MessageConstants, MimeTypeJson } from "~/utils";
import { mcpAuthorize, mcpParseResource } from "~/features/common";

import * as service from "./service";

export default function mcpUserHandlers(server: McpServer) {
  server.resource(
    "my-profile",
    new ResourceTemplate("users://{sessionCode}/profile", {
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

      const user = await service.get({
        type: "id",
        value: authorized.userId,
      });
      if (!user) {
        return {
          contents: [
            {
              uri: uri.href,
              text: MessageConstants.InvalidSession,
            },
          ],
        };
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: MimeTypeJson,
            text: JSON.stringify(user),
          },
        ],
      };
    },
  );

  server.resource(
    "list-users",
    new ResourceTemplate("users://{sessionCode}/list", { list: undefined }),
    async (uri, body) => {
      const parsed = await mcpParseResource(
        body,
        z.object({
          sessionCode: z.string(),
          email: z.string().email(),
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

      const users = await service.list();
      return {
        contents: users.map((user) => ({
          uri: `users://{sessionCode}/${user.email}/profile`,
          mimeType: MimeTypeJson,
          text: JSON.stringify(user),
        })),
      };
    },
  );

  server.resource(
    "user-profile",
    new ResourceTemplate("users://{sessionCode}/{email}/profile", {
      list: undefined,
    }),
    async (uri, body) => {
      const parsed = await mcpParseResource(
        body,
        z.object({
          sessionCode: z.string(),
          email: z.string().email(),
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

      const user = await service.get({
        type: "email",
        value: parsed.data.email,
      });
      if (!user) {
        return {
          contents: [
            {
              uri: uri.href,
              text: sprintf(MessageConstants.UserNotFound, parsed.data.email),
            },
          ],
        };
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: MimeTypeJson,
            text: JSON.stringify(user),
          },
        ],
      };
    },
  );
}
