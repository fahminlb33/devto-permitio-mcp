import { jwt } from "hono/jwt";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { logger } from "hono/logger";
import { except } from "hono/combine";

import {
  authHono,
  usersHono,
  epicsHono,
  tasksHono,
  commentsHono,
  type CustomJwtVariables,
} from "./features";
import {
  permit,
  getConfig,
  getResourceActionFromReq,
  HttpStatus,
} from "./utils";

// get configuration
const config = getConfig();

// create server
const server = new Hono<{ Variables: CustomJwtVariables }>();

// request logging
server.use(logger());

// JWT middleware for authentication
server.use(
  "/api/*",
  except("/api/public/*", jwt({ secret: config.jwt.secret })),
);

// Permit.io middleware for authorization
server.use(
  except("/api/public/*", async (c, next) => {
    const jwtPayload = c.get("jwtPayload");
    if (!jwtPayload) {
      return c.json({ error: "Unauthorized" }, HttpStatus.Unauthorized);
    }

    const path = c.req.path.split("/");
    if (path.length < 2) {
      return c.notFound();
    }

    const { resource, action } = getResourceActionFromReq(
      c.req.method,
      c.req.path,
      jwtPayload.role !== "Admin",
    );

    const permitted = await permit.check(jwtPayload.sub, action, resource);
    if (!permitted) {
      return c.json({ error: "Permission denied" }, HttpStatus.Forbidden);
    }

    await next();
  }),
);

// api routes
server.route("/api/public/auth", authHono);
server.route("/api/users", usersHono);
server.route("/api/epics", epicsHono);
server.route("/api/tasks", tasksHono);
server.route("/api/comments", commentsHono);

// start the server
serve({ fetch: server.fetch, port: 3000 }, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`);
});
