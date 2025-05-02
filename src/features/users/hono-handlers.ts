import { z } from "zod";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { HttpStatus } from "~/utils";
import type { CustomJwtVariables } from "~/features/common";

import * as service from "./service";

const app = new Hono<{ Variables: CustomJwtVariables }>();

app.get("/profile", async (c) => {
  const jwt = c.get("jwtPayload");
  const user = await service.get({ type: "id", value: jwt.sub });

  return c.json(user);
});

app.get(
  "/:userId",
  zValidator(
    "param",
    z.object({
      userId: z.string().ulid(),
    }),
  ),
  async (c) => {
    const body = c.req.valid("param");
    const user = await service.get({ type: "id", value: body.userId });
    if (!user) {
      return c.json({ error: "User not found" }, HttpStatus.NotFound);
    }

    return c.json(user);
  },
);

app.delete(
  "/:userId",
  zValidator(
    "param",
    z.object({
      userId: z.string().ulid(),
    }),
  ),
  async (c) => {
    const body = c.req.valid("param");

    const isExists = await service.isExists(body.userId);
    if (!isExists) {
      return c.json({ error: "User not found" }, HttpStatus.NotFound);
    }

    const success = await service.remove(body.userId);
    if (!success) {
      return c.json({ error: "User not found" }, HttpStatus.BadRequest);
    }

    return c.body(null, HttpStatus.NoContent);
  },
);

app.get("/", async (c) => {
  const users = await service.list();
  return c.json(users);
});

app.post(
  "/",
  zValidator(
    "json",
    z.object({
      email: z.string().email(),
      firstName: z.string(),
      lastName: z.string(),
      password: z.string(),
      role: z.enum(["Admin", "Manager", "Developer"]),
    }),
  ),
  async (c) => {
    const body = c.req.valid("json");
    const isEmailTaken = await service.isEmailTaken(body.email);
    if (isEmailTaken) {
      return c.json({ error: "Email is already used" }, HttpStatus.Conflict);
    }

    const user = await service.create({
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      password: body.password,
      role: body.role,
    });

    return c.json(user, HttpStatus.Created);
  },
);

export default app;
