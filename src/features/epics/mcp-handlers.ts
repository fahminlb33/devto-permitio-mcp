import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  getDeleteMessage,
  MimeTypeJson,
  ResourceActions,
  ResourceNames,
} from "~/utils";
import { authorizeTool } from "~/features/common";

import * as service from "./service";

enum Descriptions {
  List = "List all epics in the system",
  Detail = "Get a detailed epic information, contains the epic title, creator, and creation date.",
  Statistics = "List all epics along with its task progression statistics.",
  Create = "Create new epic.",
  Rename = "Rename existing epic title.",
  Delete = "Delete existing epic based on its ID.",
}

export default function mcpEpicHandlers(server: McpServer) {
  server.tool(
    "list-epics",
    Descriptions.List,
    { sessionCode: z.string() },
    authorizeTool(
      ResourceActions.Read,
      ResourceNames.Epic,
      async (body, user) => {
        const userId = user.role === "Developer" ? user.id : undefined;
        const epics = await service.list(userId);
        return {
          content: epics.map((epic) => ({
            type: "text",
            mimeType: MimeTypeJson,
            text: JSON.stringify(epic),
          })),
        };
      },
    ),
  );

  server.tool(
    "epic-detail",
    Descriptions.Detail,
    { sessionCode: z.string(), epicId: z.string().ulid() },
    authorizeTool(
      ResourceActions.Read,
      ResourceNames.Epic,
      async (body, user) => {
        const epic = await service.get(body.epicId);
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
    ),
  );

  server.tool(
    "epic-statistics",
    Descriptions.Statistics,
    { sessionCode: z.string(), epicId: z.string().ulid() },
    authorizeTool(
      ResourceActions.Read,
      ResourceNames.Epic,
      async (body, user) => {
        const userId = user.role === "Developer" ? user.id : undefined;
        const stats = await service.statistics(userId);
        return {
          content: [
            {
              type: "text",
              mimeType: MimeTypeJson,
              text: JSON.stringify(stats),
            },
          ],
        };
      },
    ),
  );

  server.tool(
    "create-epic",
    Descriptions.Create,
    { sessionCode: z.string(), title: z.string() },
    authorizeTool(
      ResourceActions.Create,
      ResourceNames.Epic,
      async (body, user) => {
        const epic = await service.create({
          title: body.title,
          userId: user.id,
          userRole: user.role,
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
    ),
  );

  server.tool(
    "rename-epic",
    Descriptions.Rename,
    { sessionCode: z.string(), epicId: z.string().ulid(), title: z.string() },
    authorizeTool(
      ResourceActions.Update,
      ResourceNames.Epic,
      async (body, user) => {
        const isExists = await service.isExists(body.epicId);
        if (!isExists) {
          return {
            content: [
              {
                type: "text",
                text: "Epic not found",
              },
            ],
          };
        }

        const epic = await service.update(body.epicId, body.title);
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
    ),
  );

  server.tool(
    "delete-epic",
    Descriptions.Delete,
    { sessionCode: z.string(), epicId: z.string().ulid() },
    authorizeTool(
      ResourceActions.Delete,
      ResourceNames.Epic,
      async (body, user) => {
        const isExists = await service.isExists(body.epicId);
        if (!isExists) {
          return {
            content: [
              {
                type: "text",
                text: "Epic not found",
              },
            ],
          };
        }

        const success = await service.remove(body.epicId);
        return {
          content: [
            {
              type: "text",
              text: getDeleteMessage(success, "epic"),
            },
          ],
        };
      },
    ),
  );
}
