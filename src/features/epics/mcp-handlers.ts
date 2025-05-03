import { z } from "zod";
import {
  type McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";

import { getDeleteMessage, MimeTypeJson } from "~/utils";
import { authorizeTool, parseAndAuthorizeResource } from "~/features/common";

import * as service from "./service";

const ResourceName = "epics";

enum Actions {
  Create = "create",
  Update = "update",
  Delete = "delete",
}

enum Descriptions {
  List = "List all epics in the system",
  Detail = "Get a detailed epic information, contains the epic title, creator, and creation date.",
  Statistics = "List all epics along with its task progression statistics.",
  Create = "Create new epic.",
  Rename = "Rename existing epic title.",
  Delete = "Delete existing epic based on its ID.",
}

export default function mcpEpicHandlers(server: McpServer) {
  server.resource(
    "list-epics",
    new ResourceTemplate(`${ResourceName}://{sessionCode}/list`, {
      list: undefined,
    }),
    {
      name: "List epics",
      description: Descriptions.List,
    },
    parseAndAuthorizeResource(
      z.object({ sessionCode: z.string() }),
      async (uri, data, user) => {
        const epics = await service.list(user.id);
        return {
          contents: epics.map((epic) => ({
            uri: `${ResourceName}://{sessionCOde}/${epic.epicId}`,
            mimeType: MimeTypeJson,
            text: JSON.stringify(epic),
          })),
        };
      },
    ),
  );

  server.resource(
    "epic-detail",
    new ResourceTemplate(`${ResourceName}://{sessionCode}/{epicId}`, {
      list: undefined,
    }),
    {
      name: "Get epic detail",
      description: Descriptions.Detail,
    },
    parseAndAuthorizeResource(
      z.object({
        sessionCode: z.string(),
        epicId: z.string().ulid(),
      }),
      async (uri, data, user) => {
        const epic = await service.get(data.epicId);
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
    ),
  );

  server.resource(
    "epic-statistics",
    new ResourceTemplate(`${ResourceName}://{sessionCode}/statistics`, {
      list: undefined,
    }),
    {
      name: "Get epic statistics",
      description: Descriptions.Statistics,
    },
    parseAndAuthorizeResource(
      z.object({
        sessionCode: z.string(),
        epicId: z.string().ulid(),
      }),
      async (uri, data, user) => {
        const stats = await service.statistics();
        return {
          contents: stats.map((epic) => ({
            uri: `epics://{sessionCOde}/${epic.epicId}`,
            mimeType: MimeTypeJson,
            text: JSON.stringify(epic),
          })),
        };
      },
    ),
  );

  server.tool(
    "create-epic",
    Descriptions.Create,
    { sessionCode: z.string(), title: z.string() },
    authorizeTool(Actions.Create, ResourceName, async (body, user) => {
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
    }),
  );

  server.tool(
    "rename-epic",
    Descriptions.Rename,
    { sessionCode: z.string(), epicId: z.string().ulid(), title: z.string() },
    authorizeTool(Actions.Update, ResourceName, async (body, user) => {
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
    }),
  );

  server.tool(
    "delete-epic",
    Descriptions.Delete,
    { sessionCode: z.string(), epicId: z.string().ulid() },
    authorizeTool(Actions.Delete, ResourceName, async (body, user) => {
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
    }),
  );
}
