import { z } from "zod";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { HttpStatus } from "~/utils";
import type { CustomJwtVariables } from "~/features/common";

import * as service from "./service";

const app = new Hono<{ Variables: CustomJwtVariables }>();

app.get("/statistics/users", async (c) => {
  const jwt = c.get("jwtPayload");
  const userId = jwt.role === "Developer" ? jwt.sub : undefined;

  const stats = await service.statisticsByUser(userId);
  return c.json(stats);
});

app.get("/statistics/tasks", async (c) => {
  const jwt = c.get("jwtPayload");
  const userId = jwt.role === "Developer" ? jwt.sub : undefined;

  const stats = await service.statisticsByTask(userId);
  return c.json(stats);
});

app.patch(
  "/:taskId/assign",
  zValidator(
    "param",
    z.object({
      taskId: z.string().ulid(),
    }),
  ),
  zValidator(
    "json",
    z.object({
      userId: z.string().ulid(),
    }),
  ),
  async (c) => {
    const param = c.req.valid("param");
    const body = c.req.valid("json");

    const isExists = await service.isExists(param.taskId);
    if (!isExists) {
      return c.json({ error: "Task not found" }, HttpStatus.NotFound);
    }

    const result = await service.assign(param.taskId, body.userId);
    return c.json(result);
  },
);

app.patch(
  "/:taskId/unassign",
  zValidator(
    "param",
    z.object({
      taskId: z.string().ulid(),
    }),
  ),
  async (c) => {
    const param = c.req.valid("param");

    const isExists = await service.isExists(param.taskId);
    if (!isExists) {
      return c.json({ error: "Task not found" }, HttpStatus.NotFound);
    }

    const result = await service.unassign(param.taskId);
    return c.json(result);
  },
);

app.patch(
  "/:taskId/log-work",
  zValidator(
    "param",
    z.object({
      taskId: z.string().ulid(),
    }),
  ),
  zValidator(
    "json",
    z.object({
      status: z.enum(["IN_PROGRESS", "DONE"]),
      incrementTimeSpentInMinutes: z.number().min(0),
    }),
  ),
  async (c) => {
    const param = c.req.valid("param");
    const body = c.req.valid("json");

    const isExists = await service.isExists(param.taskId);
    if (!isExists) {
      return c.json({ error: "Task not found" }, HttpStatus.NotFound);
    }

    const result = await service.logWork(
      param.taskId,
      body.status,
      body.incrementTimeSpentInMinutes,
    );
    return c.json(result);
  },
);

app.get(
  "/:taskId",
  zValidator(
    "param",
    z.object({
      taskId: z.string().ulid(),
    }),
  ),
  async (c) => {
    const param = c.req.valid("param");

    const task = await service.get(param.taskId);
    if (!task) {
      return c.json({ error: "Task not found" }, HttpStatus.NotFound);
    }

    return c.json(task);
  },
);

app.put(
  "/:taskId",
  zValidator(
    "param",
    z.object({
      taskId: z.string().ulid(),
    }),
  ),
  zValidator(
    "json",
    z.object({
      title: z.string(),
      description: z.string(),
    }),
  ),
  async (c) => {
    const param = c.req.valid("param");
    const body = c.req.valid("json");

    const isExists = await service.isExists(param.taskId);
    if (!isExists) {
      return c.json({ error: "Task not found" }, HttpStatus.NotFound);
    }

    const result = await service.update(
      param.taskId,
      body.title,
      body.description,
    );
    return c.json(result);
  },
);

app.delete(
  "/:taskId",
  zValidator(
    "param",
    z.object({
      taskId: z.string().ulid(),
    }),
  ),
  async (c) => {
    const param = c.req.valid("param");

    const isExists = await service.isExists(param.taskId);
    if (!isExists) {
      return c.json({ error: "Task not found" }, HttpStatus.NotFound);
    }

    await service.remove(param.taskId);

    return c.body(null, HttpStatus.NoContent);
  },
);

app.get(
  "/",
  zValidator("query", z.object({ epicId: z.string().ulid().optional() })),
  async (c) => {
    const jwt = c.get("jwtPayload");
    const query = c.req.valid("query");
    const userId = jwt.role === "Developer" ? jwt.sub : undefined;

    const tasks = await service.list(query.epicId, userId);
    return c.json(tasks);
  },
);

app.post(
  "/",
  zValidator(
    "json",
    z.object({
      epicId: z.string().ulid(),
      title: z.string(),
      description: z.string(),
    }),
  ),
  async (c) => {
    const jwt = c.get("jwtPayload");
    const body = c.req.valid("json");

    const isExists = await service.isEpicExists(body.epicId);
    if (!isExists) {
      return c.json({ error: "Epic not found" }, HttpStatus.NotFound);
    }

    const result = await service.create({
      title: body.title,
      description: body.description,
      epicId: body.epicId,
      userId: jwt.sub,
      userRole: jwt.role,
    });

    return c.json(result, HttpStatus.Created);
  },
);

export default app;
