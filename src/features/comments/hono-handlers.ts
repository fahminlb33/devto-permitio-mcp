import { z } from "zod";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { HttpStatus } from "~/utils";
import type { CustomJwtVariables } from "~/features/common";

import * as service from "./service";

const app = new Hono<{ Variables: CustomJwtVariables }>();

app.put(
  "/:commentId",
  zValidator(
    "param",
    z.object({
      commentId: z.string().ulid(),
    }),
  ),
  zValidator(
    "json",
    z.object({
      content: z.string(),
    }),
  ),
  async (c) => {
    const params = c.req.valid("param");
    const body = c.req.valid("json");

    const isExists = await service.isExists(params.commentId);
    if (!isExists) {
      return c.json({ error: "Comment not found" }, HttpStatus.NotFound);
    }

    const comment = await service.update(params.commentId, body.content);
    return c.json(comment);
  },
);

app.delete(
  "/:commentId",
  zValidator(
    "param",
    z.object({
      commentId: z.string().ulid(),
    }),
  ),
  async (c) => {
    const params = c.req.valid("param");

    const isExists = await service.isExists(params.commentId);
    if (!isExists) {
      return c.json({ error: "Comment not found" }, HttpStatus.NotFound);
    }

    const success = await service.remove(params.commentId);
    if (!success) {
      return c.json({ error: "Comment not found" }, HttpStatus.BadRequest);
    }

    return c.body(null, HttpStatus.NoContent);
  },
);

app.post(
  "/",
  zValidator(
    "json",
    z.object({
      taskId: z.string().ulid(),
      content: z.string(),
    }),
  ),
  async (c) => {
    const jwt = c.get("jwtPayload");
    const body = c.req.valid("json");

    const isExists = await service.isTaskExists(body.taskId);
    if (!isExists) {
      return c.json({ error: "Task not found" }, HttpStatus.NotFound);
    }

    const comment = await service.create({
      content: body.content,
      taskId: body.taskId,
      userId: jwt.sub,
      userRole: jwt.role,
    });

    return c.json(comment, HttpStatus.Created);
  },
);

app.get(
  "/",
  zValidator(
    "query",
    z.object({
      taskId: z.string().ulid().optional(),
    }),
  ),
  async (c) => {
    const params = c.req.valid("query");

    const result = await service.list(params.taskId);
    return c.json(result);
  },
);

export default app;
