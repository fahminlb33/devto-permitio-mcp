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
  List = "List comments for a specific task.",
  Create = "Create new comment for specific task.",
  Update = "Update existing comment content.",
  Delete = "Delete comment from a task.",
}

export default function mcpCommentHandlers(server: McpServer) {
  server.tool(
    "list-comments",
    Descriptions.List,
    {
      sessionCode: z.string(),
      taskId: z.string().ulid(),
    },
    authorizeTool(
      ResourceActions.Read,
      ResourceNames.Comment,
      async (body, user) => {
        const comments = await service.list(user.id);
        return {
          content: comments.map((c) => ({
            type: "text",
            mimeType: MimeTypeJson,
            text: JSON.stringify(c),
          })),
        };
      },
    ),
  );

  server.tool(
    "create-comment",
    Descriptions.Create,
    {
      sessionCode: z.string(),
      taskId: z.string().ulid(),
      content: z.string(),
    },
    authorizeTool(
      ResourceActions.Update,
      ResourceNames.Comment,
      async (body, user) => {
        const isExists = await service.isTaskExists(body.taskId);
        if (!isExists) {
          return {
            content: [
              {
                type: "text",
                text: "Task is not found",
              },
            ],
          };
        }

        const comment = await service.create({
          content: body.content,
          taskId: body.taskId,
          userId: user.id,
          userRole: user.role,
        });

        return {
          content: [
            {
              type: "text",
              mimeType: MimeTypeJson,
              text: JSON.stringify(comment),
            },
          ],
        };
      },
    ),
  );

  server.tool(
    "update-comment",
    Descriptions.Update,
    {
      sessionCode: z.string(),
      commentId: z.string().ulid(),
      content: z.string(),
    },
    authorizeTool(
      ResourceActions.Update,
      ResourceNames.Comment,
      async (body, user) => {
        const isExists = await service.isExists(body.commentId);
        if (!isExists) {
          return {
            content: [
              {
                type: "text",
                text: "Comment not found",
              },
            ],
          };
        }

        const comment = await service.update(body.commentId, body.content);
        return {
          content: [
            {
              type: "text",
              mimeType: MimeTypeJson,
              text: JSON.stringify(comment),
            },
          ],
        };
      },
    ),
  );

  server.tool(
    "delete-comment",
    Descriptions.Delete,
    { sessionCode: z.string(), epicId: z.string().ulid() },
    authorizeTool(
      ResourceActions.Delete,
      ResourceNames.Comment,
      async (body, user) => {
        const isExists = await service.isExists(body.commentId);
        if (!isExists) {
          return {
            content: [
              {
                type: "text",
                text: "Comment not found",
              },
            ],
          };
        }

        const success = await service.remove(body.epicId);
        return {
          content: [
            {
              type: "text",
              text: getDeleteMessage(success, "comment"),
            },
          ],
        };
      },
    ),
  );
}
