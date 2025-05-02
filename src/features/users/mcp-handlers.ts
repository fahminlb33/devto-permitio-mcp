import { z } from "zod";
import {
  type McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";

import { sprintf, MessageConstants, MimeTypeJson } from "~/utils";
import { parseAndAuthorizeResource } from "~/features/common";

import * as service from "./service";

enum Descriptions {
  List = "List all registered user in the system, returning the user profile information.",
  MyProfile = "Get a detailed profile of the user based on its session code, the data includes the user's email, name, and role.",
  GetProfile = "Get a detailed profile of the used based on the provided email",
}

export default function mcpUserHandlers(server: McpServer) {
  server.resource(
    "list-users",
    new ResourceTemplate("users://{sessionCode}/list", { list: undefined }),
    {
      name: "List tasks",
      description: Descriptions.List,
    },
    parseAndAuthorizeResource(
      z.object({ sessionCode: z.string() }),
      async (uri, data, user) => {
        const users = await service.list();
        return {
          contents: users.map((user) => ({
            uri: `users://{sessionCode}/${user.email}/profile`,
            mimeType: MimeTypeJson,
            text: JSON.stringify(user),
          })),
        };
      },
    ),
  );

  server.resource(
    "my-profile",
    new ResourceTemplate("users://{sessionCode}/profile", {
      list: undefined,
    }),
    {
      name: "List tasks",
      description: Descriptions.MyProfile,
    },
    parseAndAuthorizeResource(
      z.object({ sessionCode: z.string() }),
      async (uri, data, user) => {
        const profile = await service.get({
          type: "id",
          value: user.id,
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
              text: JSON.stringify(profile),
            },
          ],
        };
      },
    ),
  );

  server.resource(
    "user-profile",
    new ResourceTemplate("users://{sessionCode}/{email}/profile", {
      list: undefined,
    }),
    {
      name: "List tasks",
      description: Descriptions.GetProfile,
    },
    parseAndAuthorizeResource(
      z.object({ sessionCode: z.string(), email: z.string().email() }),
      async (uri, data, user) => {
        const profile = await service.get({
          type: "email",
          value: data.email,
        });
        if (!user) {
          return {
            contents: [
              {
                uri: uri.href,
                text: sprintf(MessageConstants.UserNotFound, data.email),
              },
            ],
          };
        }

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: MimeTypeJson,
              text: JSON.stringify(profile),
            },
          ],
        };
      },
    ),
  );
}
