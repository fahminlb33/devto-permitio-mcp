import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  sprintf,
  MessageConstants,
  MimeTypeJson,
  ResourceActions,
  ResourceNames,
} from "~/utils";
import { authorizeTool } from "~/features/common";

import * as service from "./service";

enum Descriptions {
  List = "List all registered user in the system, returning the user profile information.",
  MyProfile = "Get a detailed profile of the user based on its session code, the data includes the user's email, name, and role.",
  UserProfile = "Get a detailed profile of the used based on the provided email.",
}

export default function mcpUserHandlers(server: McpServer) {
  server.tool(
    "list-users",
    Descriptions.List,
    { sessionCode: z.string() },
    authorizeTool(
      ResourceActions.Read,
      ResourceNames.User,
      async (body, user) => {
        const users = await service.list();
        return {
          content: users.map((user) => ({
            type: "text",
            mimeType: MimeTypeJson,
            text: JSON.stringify(user),
          })),
        };
      },
    ),
  );

  server.tool(
    "my-profile",
    Descriptions.MyProfile,
    { sessionCode: z.string() },
    authorizeTool(
      ResourceActions.Read,
      ResourceNames.User,
      async (body, user) => {
        const profile = await service.get({
          type: "id",
          value: user.id,
        });
        if (!user) {
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
              mimeType: MimeTypeJson,
              text: JSON.stringify(profile),
            },
          ],
        };
      },
    ),
  );

  server.tool(
    "user-profile",
    Descriptions.UserProfile,
    { sessionCode: z.string(), email: z.string().email() },
    authorizeTool(
      ResourceActions.Read,
      ResourceNames.User,
      async (body, user) => {
        const profile = await service.get({
          type: "email",
          value: body.email,
        });
        if (!user) {
          return {
            content: [
              {
                type: "text",
                text: sprintf(MessageConstants.UserNotFound, body.email),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              mimeType: MimeTypeJson,
              text: JSON.stringify(profile),
            },
          ],
        };
      },
    ),
  );
}
