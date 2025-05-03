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
  server.tool(
    "list-tasks",
    Descriptions.List,
    { sessionCode: z.string(), epicId: z.string().ulid() },
    authorizeTool(
      ResourceActions.Read,
      ResourceNames.Task,
      async (body, user) => {
        const userId = user.role === "Developer" ? user.id : undefined;
        const users = await service.list(userId);
        return {
          content: users.map((u) => ({
            type: "text",
            mimeType: MimeTypeJson,
            text: JSON.stringify(u),
          })),
        };
      },
    ),
  );

  server.tool(
    "task-statistics-by-user",
    Descriptions.StatisticsByUser,
    { sessionCode: z.string(), epicId: z.string().ulid() },
    authorizeTool(
      ResourceActions.Read,
      ResourceNames.Task,
      async (body, user) => {
        const userId = user.role === "Developer" ? user.id : undefined;
        const stats = await service.statisticsByUser(userId);
        return {
          content: stats.map((u) => ({
            type: "text",
            mimeType: MimeTypeJson,
            text: JSON.stringify(u),
          })),
        };
      },
    ),
  );

  server.tool(
    "task-statistics-by-task",
    Descriptions.StatisticsByTask,
    { sessionCode: z.string(), epicId: z.string().ulid() },
    authorizeTool(
      ResourceActions.Read,
      ResourceNames.Task,
      async (body, user) => {
        const userId = user.role === "Developer" ? user.id : undefined;
        const stats = await service.statisticsByTask(userId);
        return {
          content: stats.map((u) => ({
            type: "text",
            mimeType: MimeTypeJson,
            text: JSON.stringify(u),
          })),
        };
      },
    ),
  );

  server.tool(
    "task-detail",
    Descriptions.Detail,
    { sessionCode: z.string(), epicId: z.string().ulid() },
    authorizeTool(
      ResourceActions.Read,
      ResourceNames.Task,
      async (body, user) => {
        const task = await service.get(body.taskId);
        if (!task) {
          return {
            content: [
              {
                type: "text",
                text: "Task not found",
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
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
    authorizeTool(
      ResourceActions.Update,
      ResourceNames.Task,
      async (body, user) => {
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
      },
    ),
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
    authorizeTool(
      ResourceActions.Update,
      ResourceNames.Task,
      async (body, user) => {
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
      },
    ),
  );

  server.tool(
    "delete-task",
    Descriptions.Delete,
    { sessionCode: z.string(), epicId: z.string().ulid() },
    authorizeTool(
      ResourceActions.Delete,
      ResourceNames.Task,
      async (body, user) => {
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
      },
    ),
  );

  server.tool(
    "assign-task",
    Descriptions.Assign,
    {
      sessionCode: z.string(),
      taskId: z.string().ulid(),
      userId: z.string().ulid(),
    },
    authorizeTool(
      ResourceActions.Assign,
      ResourceNames.Task,
      async (body, user) => {
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
      },
    ),
  );

  server.tool(
    "unassign-task",
    Descriptions.Unassign,
    { sessionCode: z.string(), taskId: z.string().ulid() },
    authorizeTool(
      ResourceActions.Unassign,
      ResourceNames.Task,
      async (body, user) => {
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
      },
    ),
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
    authorizeTool(
      ResourceActions.LogWork,
      ResourceNames.Task,
      async (body, user) => {
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
      },
    ),
  );
}
