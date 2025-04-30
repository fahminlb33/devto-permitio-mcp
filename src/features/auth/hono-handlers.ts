import { z } from "zod";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { HttpStatus } from "~/utils";
import type { CustomJwtVariables } from "../common";

import * as authService from "./service";

const app = new Hono<{ Variables: CustomJwtVariables }>();

app.post(
  "/login",
  zValidator(
    "json",
    z.object({
      email: z.string().email(),
      password: z.string(),
    }),
  ),
  async (c) => {
    const body = c.req.valid("json");

    const result = await authService.loginWithJWT(body.email, body.password);
    if (!result) {
      return c.json(
        { error: "Invalid username or password" },
        HttpStatus.Unauthorized,
      );
    }

    return c.json(result);
  },
);

export default app;
