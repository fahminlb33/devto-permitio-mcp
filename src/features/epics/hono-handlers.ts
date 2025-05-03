import { z } from "zod";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { HttpStatus } from "~/utils";
import type { CustomJwtVariables } from "~/features/common";

import * as service from "./service";

const app = new Hono<{ Variables: CustomJwtVariables }>();

app.get("/statistics", async (c) => {
  const jwt = c.get("jwtPayload");
  const userId = jwt.role === "Developer" ? jwt.sub : undefined;

  const stats = await service.statistics(userId);
  return c.json(stats);
});

app.delete(
  "/:epicId",
  zValidator(
    "param",
    z.object({
      epicId: z.string().ulid(),
    }),
  ),
  async (c) => {
    const param = c.req.valid("param");

    const success = await service.remove(param.epicId);
    if (!success) {
      return c.json({ error: "Epic not found" }, HttpStatus.NotFound);
    }

    return c.body(null, HttpStatus.NoContent);
  },
);

app.put(
  "/:epicId",
  zValidator(
    "param",
    z.object({
      epicId: z.string().ulid(),
    }),
  ),
  zValidator(
    "json",
    z.object({
      title: z.string(),
    }),
  ),
  async (c) => {
    const param = c.req.valid("param");
    const body = c.req.valid("json");

    const isExists = await service.isExists(param.epicId);
    if (!isExists) {
      return c.json({ error: "Epic not found" }, HttpStatus.NotFound);
    }

    const epic = await service.update(param.epicId, body.title);
    return c.json(epic);
  },
);

app.get("/", async (c) => {
  const jwt = c.get("jwtPayload");
  const userId = jwt.role === "Developer" ? jwt.sub : undefined;

  const epics = await service.list(userId);
  return c.json(epics);
});

app.post(
  "/",
  zValidator(
    "json",
    z.object({
      title: z.string(),
    }),
  ),
  async (c) => {
    const jwt = c.get("jwtPayload");
    const body = c.req.valid("json");

    const epic = await service.create({
      title: body.title,
      userId: jwt.sub,
      userRole: jwt.role,
    });

    return c.json(epic, HttpStatus.Created);
  },
);

export default app;
