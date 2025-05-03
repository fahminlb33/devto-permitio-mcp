import { z } from "zod";
import {
  type McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";

import { getDeleteMessage, MimeTypeJson } from "~/utils";
import { authorizeTool, parseAndAuthorizeResource } from "~/features/common";

import * as service from "./service";

const ResourceName = "tasks";

enum Actions {
  Create = "create",
  Update = "update",
  Delete = "delete",
  Assign = "assign",
  Unassign = "unassign",
  LogWork = "log-work",
}

enum Descriptions {
  List = "List available tasks.",
  StatisticsByUser = "Count the number of tasks per user.",
  StatisticsByTask = "Count the number of comments per task",
  Detail = "Get a detailed info of a specific task.",
  Create = "Create new task for a specific epic.",
  Update = "Updates task title and content.",
  Delete = "Delete the specified task.",
  Assign = "Assign task to a user. Only manager and admin can assign task to users.",
  Unassign = "Unassign user from a specific task. Only manager and admin can unassign task to users.",
  LogWork = "Update task status and optionally increase the time spent for a specified task.",
}

export default function mcpTaskHandlers(server: McpServer) {
  server.resource(
    "list-tasks",
    new ResourceTemplate(`${ResourceName}://{sessionCode}`, {
      list: undefined,
    }),
    {
      name: "List tasks",
      description: Descriptions.List,
    },
    parseAndAuthorizeResource(
      z.object({ sessionCode: z.string() }),
      async (uri, data, user) => {
        const userId = user.role === "Developer" ? user.id : undefined;
        const users = await service.list(userId);
        return {
          contents: users.map((u) => ({
            uri: `${ResourceName}://{sessionCode}/${u.taskId}`,
            mimeType: MimeTypeJson,
            text: JSON.stringify(u),
          })),
        };
      },
    ),
  );

  server.resource(
    "tasks-statistics-by-user",
    new ResourceTemplate(`${ResourceName}://{sessionCode}/statistics/by-user`, {
      list: undefined,
    }),
    {
      name: "Get task statistics grouped by user",
      description: Descriptions.StatisticsByUser,
    },
    parseAndAuthorizeResource(
      z.object({ sessionCode: z.string() }),
      async (uri, data, user) => {
        const stats = await service.statisticsByUser();
        return {
          contents: stats.map((u) => ({
            uri: `${ResourceName}://{sessionCode}/statistics/by-user`,
            mimeType: MimeTypeJson,
            text: JSON.stringify(u),
          })),
        };
      },
    ),
  );

  server.resource(
    "tasks-statistics-by-task",
    new ResourceTemplate(`${ResourceName}://{sessionCode}/statistics/by-task`, {
      list: undefined,
    }),
    {
      name: "Get task statistics grouped by user",
      description: Descriptions.StatisticsByTask,
    },
    parseAndAuthorizeResource(
      z.object({ sessionCode: z.string() }),
      async (uri, data, user) => {
        const stats = await service.statisticsByTask();
        return {
          contents: stats.map((u) => ({
            uri: `${ResourceName}://{sessionCode}/statistics/by-task`,
            mimeType: MimeTypeJson,
            text: JSON.stringify(u),
          })),
        };
      },
    ),
  );

  server.resource(
    "task-detail",
    new ResourceTemplate(`${ResourceName}://{sessionCode}/{taskId}`, {
      list: undefined,
    }),
    {
      name: "Get task detail",
      description: Descriptions.Detail,
    },
    parseAndAuthorizeResource(
      z.object({ sessionCode: z.string(), taskId: z.string().ulid() }),
      async (uri, data, user) => {
        const task = await service.get(data.taskId);
        if (!task) {
          return {
            contents: [
              {
                uri: uri.href,
                text: "Task not found",
              },
            ],
          };
        }

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: MimeTypeJson,
              text: JSON.stringify(task),
            },
          ],
        };
      },
    ),
  );

  server.tool(
    "create-task",
    Descriptions.Create,
    {
      sessionCode: z.string(),
      epicId: z.string().ulid(),
      title: z.string(),
      description: z.string(),
    },
    authorizeTool(Actions.Update, ResourceName, async (body, user) => {
      const isExists = await service.isEpicExists(body.epicId);
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

      const result = await service.create({
        title: body.title,
        description: body.description,
        epicId: body.epicId,
        userId: user.id,
        userRole: user.role,
      });

      return {
        content: [
          {
            type: "text",
            mimeType: MimeTypeJson,
            text: JSON.stringify(result),
          },
        ],
      };
    }),
  );

  server.tool(
    "update-task",
    Descriptions.Update,
    {
      sessionCode: z.string(),
      taskId: z.string().ulid(),
      title: z.string(),
      description: z.string(),
    },
    authorizeTool(Actions.Update, ResourceName, async (body, user) => {
      const isExists = await service.isExists(body.commentId);
      if (!isExists) {
        return {
          content: [
            {
              type: "text",
              text: "Task not found",
            },
          ],
        };
      }

      const result = await service.update(
        body.taskId,
        body.title,
        body.description,
      );

      return {
        content: [
          {
            type: "text",
            mimeType: MimeTypeJson,
            text: JSON.stringify(result),
          },
        ],
      };
    }),
  );

  server.tool(
    "delete-task",
    Descriptions.Delete,
    { sessionCode: z.string(), epicId: z.string().ulid() },
    authorizeTool(Actions.Delete, ResourceName, async (body, user) => {
      const isExists = await service.isExists(body.commentId);
      if (!isExists) {
        return {
          content: [
            {
              type: "text",
              text: "Task not found",
            },
          ],
        };
      }

      const success = await service.remove(body.epicId);
      return {
        content: [
          {
            type: "text",
            text: getDeleteMessage(success, "task"),
          },
        ],
      };
    }),
  );

  server.tool(
    "assign-task",
    Descriptions.Assign,
    {
      sessionCode: z.string(),
      taskId: z.string().ulid(),
      userId: z.string().ulid(),
    },
    authorizeTool(Actions.Assign, ResourceName, async (body, user) => {
      const isExists = await service.isExists(body.commentId);
      if (!isExists) {
        return {
          content: [
            {
              type: "text",
              text: "Task not found",
            },
          ],
        };
      }

      const result = await service.assign(body.taskId, body.userId);
      return {
        content: [
          {
            type: "text",
            mimeType: MimeTypeJson,
            text: JSON.stringify(result),
          },
        ],
      };
    }),
  );

  server.tool(
    "unassign-task",
    Descriptions.Unassign,
    { sessionCode: z.string(), taskId: z.string().ulid() },
    authorizeTool(Actions.Assign, ResourceName, async (body, user) => {
      const isExists = await service.isExists(body.commentId);
      if (!isExists) {
        return {
          content: [
            {
              type: "text",
              text: "Task not found",
            },
          ],
        };
      }

      const result = await service.unassign(body.taskId);
      return {
        content: [
          {
            type: "text",
            mimeType: MimeTypeJson,
            text: JSON.stringify(result),
          },
        ],
      };
    }),
  );

  server.tool(
    "log-work-on-task",
    Descriptions.LogWork,
    {
      sessionCode: z.string(),
      taskId: z.string().ulid(),
      status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
      incrementTimeSpentInMinutes: z.number().min(0),
    },
    authorizeTool(Actions.Assign, ResourceName, async (body, user) => {
      const isExists = await service.isExists(body.commentId);
      if (!isExists) {
        return {
          content: [
            {
              type: "text",
              text: "Task not found",
            },
          ],
        };
      }

      const result = await service.logWork(
        body.taskId,
        body.status,
        body.incrementTimeSpentInMinutes,
      );

      return {
        content: [
          {
            type: "text",
            mimeType: MimeTypeJson,
            text: JSON.stringify(result),
          },
        ],
      };
    }),
  );
}
