import "dotenv/config";

import { jwt } from "hono/jwt";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { except } from "hono/combine";

import {
  authHono,
  usersHono,
  epicsHono,
  tasksHono,
  commentsHono,
  type CustomJwtVariables,
} from "./features";
import { permit, getConfig, httpMethodToAction, HttpStatus } from "./utils";

// get configuration
const config = getConfig();

// create server
const server = new Hono<{ Variables: CustomJwtVariables }>();

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

    const resource = path[1];
    const action = httpMethodToAction(c.req.method);

    const permitted = await permit.check(jwtPayload.id, action, resource);
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
